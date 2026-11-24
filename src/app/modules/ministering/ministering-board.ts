import { computed, DestroyRef, inject } from '@angular/core';
import type { ProfileService } from '@/modules/profile/profile.service';
import type { SupabaseService } from '@/shared/service/supabase.service';
import { syncedArraySignal } from '@/shared/utils/supa-sync/synced-array';
import { groupByKey } from '@/shared/utils/array-utils';
import type { Household } from '../household/household';
import type { Member } from '../member/member';
import type { HouseholdMinisteredIn, MemberMinisteringIn, MinisteringArea, MinisteringDistrict } from './ministering';

export class MinisteringBoard {
    private readonly districtRows = syncedArraySignal([], () => this.supabase.sync.from('ministering_district').readAll());
    private readonly areaRows = syncedArraySignal([], () => this.supabase.sync.from('ministering_area').readAll());
    private readonly memberRows = syncedArraySignal([], () => this.supabase.sync.from('member').readAll());
    private readonly householdRows = syncedArraySignal([], () => this.supabase.sync.from('household').readAll());
    private readonly rosterRows = syncedArraySignal([], () => this.supabase.sync.from('member_ministering_in').readAll());
    private readonly assignmentRows = syncedArraySignal([], () => this.supabase.sync.from('household_ministered_in').readAll());

    constructor(private readonly supabase: SupabaseService, private readonly profileService: ProfileService) {
        inject(DestroyRef).onDestroy(() => {
            for (const rows of [this.districtRows, this.areaRows, this.memberRows, this.householdRows, this.rosterRows, this.assignmentRows])
                rows.unsubscribe();
        });
    }

    readonly board = computed(() => buildBoard({
        districts: this.districtRows(),
        areas: this.areaRows(),
        members: this.memberRows(),
        households: this.householdRows(),
        roster: this.rosterRows(),
        assignments: this.assignmentRows(),
    }));

    async placeMember(memberId: number, areaId: number | null, index: number) {
        const member = this.memberRows().find(row => row.id === memberId);
        if (!member) return;
        const target = (areaId == null ? this.board().unassignedBrothers : this.companionship(areaId)?.ministers) ?? [];
        const positions = ministeringPositions(target, memberId, index);
        const assignments = this.rosterRows().filter(entry => entry.member === memberId);
        await Promise.all([
            this.supabase.sync.from('member').update(positions),
            ...assignments
                .filter(entry => entry.ministering_area !== areaId)
                .map(entry => this.supabase.sync.from('member_ministering_in').delete(entry)),
        ]);
        if (areaId != null && !assignments.some(entry => entry.ministering_area === areaId))
            await this.supabase.sync.from('member_ministering_in')
                .insert({ member: member.id, ministering_area: areaId, unit: member.unit, deleted: false });
    }

    async placeHousehold(householdId: number, areaId: number | null, index: number) {
        const household = this.householdRows().find(row => row.id === householdId);
        if (!household) return;
        const target = (areaId == null ? this.board().unassignedHouseholds : this.companionship(areaId)?.households) ?? [];
        const positions = ministeringPositions(target, householdId, index);
        const assignments = this.assignmentRows().filter(entry => entry.household === householdId);
        await Promise.all([
            this.supabase.sync.from('household').update(positions),
            ...assignments
                .filter(entry => entry.ministering_area !== areaId)
                .map(entry => this.supabase.sync.from('household_ministered_in').delete(entry)),
        ]);
        if (areaId != null && !assignments.some(entry => entry.ministering_area === areaId))
            await this.supabase.sync.from('household_ministered_in')
                .insert({ household: household.id, ministering_area: areaId, unit: household.unit, deleted: false });
    }

    async placeCompanionship(areaId: number, districtId: number, index: number) {
        if (!this.areaRows().some(row => row.id === areaId)) return;
        const target = this.areasOf(districtId)
            .filter(other => other.id !== areaId)
            .sort((a, b) => a.position - b.position || a.id - b.id);
        const positions = placement(target, areaId, index);
        await this.supabase.sync.from('ministering_area').update(positions.map(row =>
            row.id === areaId ? { ...row, ministering_district: districtId } : row));
    }

    async renameDistrict(districtId: number, name: string) {
        const district = this.districtRows().find(row => row.id === districtId);
        if (!district || district.name === name) return;
        await this.supabase.sync.from('ministering_district').update({ id: districtId, name }, 300);
    }

    async addCompanionship(districtId: number) {
        const own = await this.profileService.own.asPromise();
        if (!own) return;
        const position = Math.max(-1, ...this.areasOf(districtId).map(area => area.position)) + 1;
        await this.supabase.sync.from('ministering_area').insert({
            unit: own.unit,
            ministering_district: districtId,
            position,
        });
    }

    async removeCompanionship(areaId: number) {
        const area = this.areaRows().find(row => row.id === areaId);
        if (!area) return;
        await Promise.all([
            ...this.rosterRows()
                .filter(entry => entry.ministering_area === areaId)
                .map(entry => this.supabase.sync.from('member_ministering_in').delete(entry)),
            ...this.assignmentRows()
                .filter(entry => entry.ministering_area === areaId)
                .map(entry => this.supabase.sync.from('household_ministered_in').delete(entry)),
        ]);
        await this.supabase.sync.from('ministering_area').delete(area);
    }

    private companionship(areaId: number) {
        return this.board().districts
            .flatMap(district => district.companionships)
            .find(companionship => companionship.area.id === areaId);
    }

    private areasOf(districtId: number) {
        return this.areaRows().filter(area => area.ministering_district === districtId);
    }
}

function ministeringPositions(target: readonly { id: number; ministering_position: number }[], movedId: number, index: number) {
    const ordered = target.filter(row => row.id !== movedId)
        .map(row => ({ id: row.id, position: row.ministering_position }));
    return placement(ordered, movedId, index).map(({ id, position }) => ({ id, ministering_position: position }));
}

type BoardRows = {
    districts: MinisteringDistrict.Row[];
    areas: MinisteringArea.Row[];
    members: Member.Row[];
    households: Household.Row[];
    roster: MemberMinisteringIn.Row[];
    assignments: HouseholdMinisteredIn.Row[];
};

export function buildBoard({ districts, areas, members, households, roster, assignments }: BoardRows) {
    const areasByDistrict = groupByKey(areas, 'ministering_district');
    const visibleAreas = new Set(districts.flatMap(d => (areasByDistrict[d.id] ?? []).map(a => a.id)));
    const ministers = assign(members, roster, entry => entry.member, visibleAreas);
    const assignedHouseholds = assign(households, assignments, entry => entry.household, visibleAreas);

    return {
        districts: districts.toSorted((a, b) => a.position - b.position || compareText(a.name, b.name)).map(district => ({
            district,
            companionships: (areasByDistrict[district.id] ?? []).sort((a, b) => a.position - b.position || a.id - b.id)
                .map(area => ({
                    area,
                    ministers: (ministers.byArea[area.id] ?? []).sort(compareMinisters),
                    households: (assignedHouseholds.byArea[area.id] ?? []).sort(compareHouseholds),
                })),
        })),
        unassignedBrothers: ministers.unassigned.filter(m => m.gender === 'male' && m.can_minister).sort(compareMinisters),
        unassignedHouseholds: assignedHouseholds.unassigned.sort(compareHouseholds),
    };
}

function assign<Row extends { id: number }, Link extends { ministering_area: number }>(
    rows: Row[], links: Link[], rowId: (link: Link) => number, visibleAreas: Set<number>,
) {
    const byId = new Map(rows.map(row => [row.id, row]));
    const assigned = new Set<number>();
    const byArea: Record<number, Row[]> = {};
    for (const link of links) {
        const row = byId.get(rowId(link));
        if (!row || !visibleAreas.has(link.ministering_area)) continue;
        (byArea[link.ministering_area] ??= []).push(row);
        assigned.add(row.id);
    }
    return { byArea, unassigned: rows.filter(row => !assigned.has(row.id)) };
}

export function placement(ordered: readonly { id: number; position: number }[], movedId: number, index: number) {
    const before = ordered[index - 1]?.position;
    const after = ordered[index]?.position;
    if (before != null && after != null && before === after)
        return [...ordered.slice(0, index), { id: movedId }, ...ordered.slice(index)].map(({ id }, position) => ({ id, position }));
    let position = 0;
    if (before != null && after != null) position = (before + after) / 2;
    else if (before != null) position = before + 1;
    else if (after != null) position = after - 1;
    return [{ id: movedId, position }];
}

function compareMinisters(a: Member.Row, b: Member.Row) {
    return a.ministering_position - b.ministering_position
        || compareText(a.last_name ?? '', b.last_name ?? '') || compareText(a.first_name, b.first_name);
}

function compareHouseholds(a: Household.Row, b: Household.Row) {
    return a.ministering_position - b.ministering_position || compareText(a.name, b.name);
}

function compareText(a: string, b: string) {
    return a.localeCompare(b, undefined, { sensitivity: 'base' }) || a.localeCompare(b);
}
