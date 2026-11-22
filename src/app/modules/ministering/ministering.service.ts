import { ProfileService } from "@/modules/profile/profile.service";
import { SupabaseService } from "@/shared/service/supabase.service";
import { syncedArraySignal } from "@/shared/utils/supa-sync/synced-array";
import { computed, inject, Service } from "@angular/core";
import { buildBoard, placement } from "./ministering-board";

/**
 * The ministering board's state and its writes. A drop always means two things: put the row at
 * a position derived from where it landed, and fix its membership — a member and a household
 * move rather than copy, so a second assignment replaces the first.
 */
@Service()
export class MinisteringService {

    private readonly supabase = inject(SupabaseService);
    private readonly profileService = inject(ProfileService);

    private readonly districtRows = syncedArraySignal([], () => this.supabase.sync.from('ministering_district').readAll());
    private readonly areaRows = syncedArraySignal([], () => this.supabase.sync.from('ministering_area').readAll());
    private readonly memberRows = syncedArraySignal([], () => this.supabase.sync.from('member').readAll());
    private readonly householdRows = syncedArraySignal([], () => this.supabase.sync.from('household').readAll());
    private readonly rosterRows = syncedArraySignal([], () => this.supabase.sync.from('member_ministering_in').readAll());
    private readonly assignmentRows = syncedArraySignal([], () => this.supabase.sync.from('household_ministered_in').readAll());

    readonly districts = this.districtRows;

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
        const positions = placement(target
            .filter(other => other.id !== memberId)
            .map(other => ({ id: other.id, position: other.ministering_position })), memberId, index);
        const assignments = this.rosterRows().filter(entry => entry.member === memberId);
        await Promise.all([
            ...positions.map(({ id, position }) => {
                const row = this.memberRows().find(entry => entry.id === id) ?? member;
                return this.supabase.sync.from('member').update({ ...row, ministering_position: position });
            }),
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
        const positions = placement(target
            .filter(other => other.id !== householdId)
            .map(other => ({ id: other.id, position: other.ministering_position })), householdId, index);
        const assignments = this.assignmentRows().filter(entry => entry.household === householdId);
        await Promise.all([
            ...positions.map(({ id, position }) => {
                const row = this.householdRows().find(entry => entry.id === id) ?? household;
                return this.supabase.sync.from('household').update({ ...row, ministering_position: position });
            }),
            ...assignments
                .filter(entry => entry.ministering_area !== areaId)
                .map(entry => this.supabase.sync.from('household_ministered_in').delete(entry)),
        ]);
        if (areaId != null && !assignments.some(entry => entry.ministering_area === areaId))
            await this.supabase.sync.from('household_ministered_in')
                .insert({ household: household.id, ministering_area: areaId, unit: household.unit, deleted: false });
    }

    async placeCompanionship(areaId: number, districtId: number, index: number) {
        const area = this.areaRows().find(row => row.id === areaId);
        if (!area) return;
        const positions = placement(this.areasOf(districtId)
            .filter(other => other.id !== areaId)
            .map(other => ({ id: other.id, position: other.position })), areaId, index);
        await this.supabase.sync.from('ministering_area').update(positions.map(({ id, position }) => {
            const row = this.areaRows().find(entry => entry.id === id) ?? area;
            return { ...row, ministering_district: districtId, position };
        }));
    }

    async renameDistrict(districtId: number, name: string) {
        const district = this.districts().find(row => row.id === districtId);
        if (!district || district.name === name) return;
        await this.supabase.sync.from('ministering_district').update({ ...district, name }, 300);
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
        return this.areaRows()
            .filter(area => area.ministering_district === districtId)
            .sort((a, b) => a.position - b.position || a.id - b.id);
    }
}
