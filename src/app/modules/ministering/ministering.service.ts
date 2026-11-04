import { ProfileService } from "@/modules/profile/profile.service";
import type { Row, Table, TableName, TableQuery } from "@/modules/shared/table.types";
import { SupabaseService } from "@/shared/service/supabase.service";
import { AwaitableWritableSignal, xsignal } from "@/shared/utils/signal-utils";
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

    private readonly districtRows = this.live('ministering_district', table => table.readAll());
    private readonly areaRows = this.live('ministering_area', table => table.readAll());
    private readonly memberRows = this.live('member', table => table.readAll());
    private readonly householdRows = this.live('household', table => table.readAll());
    private readonly rosterRows = this.live('member_ministering_in', table => table.readAll());
    private readonly assignmentRows = this.live('household_ministered_in', table => table.readAll());

    readonly districts = this.districtRows.readonly;

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
        await this.reload();
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
        await this.reload();
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
        await this.reload();
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
        await this.reload();
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
        await this.reload();
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

    private live<T extends TableName>(
        tableName: T,
        query: (table: Table<T>) => TableQuery<T, Row<T>[] >,
    ): AwaitableWritableSignal<Row<T>[]> {
        const rows = xsignal<Row<T>[]>([]);
        // A subscription reports the rows that *changed*, not the whole table, so every update is
        // merged into what is already there. Never unsubscribed: the board outlives its pages.
        query(this.supabase.sync.from(tableName)).subscribe(({ result, deletions }) => {
            if (!result?.length && !deletions?.length) return;
            rows.update(current => {
                const byId = new Map(current.map(row => [row.id, row]));
                for (const id of deletions ?? [])
                    byId.delete(id);
                for (const row of result ?? [])
                    byId.set(row.id, row);
                return [...byId.values()];
            });
        });
        return rows;
    }

    /**
     * SupaSync does not publish its own inserts and deletes to subscribers (only updates, syncs and
     * realtime echoes reach them), so the six tables are re-read after a write instead of waiting
     * for an echo that may never come offline. Public because the report import writes from its own
     * page and has to put the board back in step when it finishes.
     */
    async reload() {
        const sync = this.supabase.sync;
        const [districts, areas, members, households, roster, assignments] = await Promise.all([
            sync.from('ministering_district').readAll().get(),
            sync.from('ministering_area').readAll().get(),
            sync.from('member').readAll().get(),
            sync.from('household').readAll().get(),
            sync.from('member_ministering_in').readAll().get(),
            sync.from('household_ministered_in').readAll().get(),
        ]);
        this.districtRows.set(districts);
        this.areaRows.set(areas);
        this.memberRows.set(members);
        this.householdRows.set(households);
        this.rosterRows.set(roster);
        this.assignmentRows.set(assignments);
    }
}
