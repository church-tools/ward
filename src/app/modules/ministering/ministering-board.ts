import type { Household } from "../household/household";
import type { Member } from "../member/member";
import type { HouseholdMinisteredIn, MemberMinisteringIn, MinisteringArea, MinisteringDistrict } from "./ministering";

/** What the board needs to know about each row, and nothing else. */
export type BoardMember = Pick<Member.Row, 'id' | 'first_name' | 'last_name' | 'nick_name' | 'gender' | 'can_minister' | 'ministering_position'>;
export type BoardHousehold = Pick<Household.Row, 'id' | 'name' | 'color_1' | 'color_2' | 'ministering_position'>;
export type BoardCompanionship = {
    area: Pick<MinisteringArea.Row, 'id' | 'position'>;
    ministers: BoardMember[];
    households: BoardHousehold[];
};
export type BoardDistrict = {
    district: Pick<MinisteringDistrict.Row, 'id' | 'name' | 'position'>;
    companionships: BoardCompanionship[];
};

export type Board = {
    districts: BoardDistrict[];
    unassignedBrothers: BoardMember[];
    unassignedHouseholds: BoardHousehold[];
};

export type BoardSource = {
    districts: readonly Pick<MinisteringDistrict.Row, 'id' | 'name' | 'position'>[];
    areas: readonly Pick<MinisteringArea.Row, 'id' | 'position' | 'ministering_district'>[];
    members: readonly BoardMember[];
    households: readonly BoardHousehold[];
    roster: readonly Pick<MemberMinisteringIn.Row, 'member' | 'ministering_area'>[];
    assignments: readonly Pick<HouseholdMinisteredIn.Row, 'household' | 'ministering_area'>[];
};

/**
 * Groups the six tables into the three columns. An assignment whose companionship or
 * district is gone is treated as no assignment at all, so a half-deleted district can
 * never make members disappear from both the board and the unassigned list.
 */
export function buildBoard({ districts, areas, members, households, roster, assignments }: BoardSource): Board {
    const districtIds = new Set(districts.map(district => district.id));
    const liveAreas = areas.filter(area => districtIds.has(area.ministering_district));
    const areaIds = new Set(liveAreas.map(area => area.id));

    const memberById = new Map(members.map(member => [member.id, member]));
    const householdById = new Map(households.map(household => [household.id, household]));

    const ministersByArea = new Map<number, BoardMember[]>();
    const assignedMemberIds = new Set<number>();
    for (const entry of roster) {
        if (!areaIds.has(entry.ministering_area)) continue;
        const member = memberById.get(entry.member);
        if (!member) continue;
        assignedMemberIds.add(member.id);
        push(ministersByArea, entry.ministering_area, member);
    }

    const householdsByArea = new Map<number, BoardHousehold[]>();
    const assignedHouseholdIds = new Set<number>();
    for (const entry of assignments) {
        if (!areaIds.has(entry.ministering_area)) continue;
        const household = householdById.get(entry.household);
        if (!household) continue;
        assignedHouseholdIds.add(household.id);
        push(householdsByArea, entry.ministering_area, household);
    }

    const companionshipsByDistrict = new Map<number, BoardCompanionship[]>();
    for (const area of liveAreas)
        push(companionshipsByDistrict, area.ministering_district, {
            area,
            ministers: (ministersByArea.get(area.id) ?? []).sort(compareMinisters),
            households: (householdsByArea.get(area.id) ?? []).sort(compareHouseholds),
        });

    return {
        districts: [...districts]
            .sort((a, b) => a.position - b.position || compareText(a.name, b.name))
            .map(district => ({
                district,
                companionships: (companionshipsByDistrict.get(district.id) ?? [])
                    .sort((a, b) => a.area.position - b.area.position || a.area.id - b.area.id),
            })),
        // Only brothers who can minister are offered here; a companionship of sisters is out of this board's scope.
        unassignedBrothers: members
            .filter(member => member.gender === 'male' && member.can_minister && !assignedMemberIds.has(member.id))
            .sort(compareMinisters),
        unassignedHouseholds: households
            .filter(household => !assignedHouseholdIds.has(household.id))
            .sort(compareHouseholds),
    };
}

/**
 * The writes that put `movedId` at `index`: usually the moved row alone, at a position between its
 * two new neighbours.
 */
export function placement(
    ordered: readonly { id: number; position: number }[],
    movedId: number,
    index: number,
): { id: number; position: number }[] {
    const positions = ordered.map(row => row.position);
    const before = positions[index - 1];
    const after = positions[index];
    // Equal neighbours leave no room between them — a fresh board is all zeros — so the whole list
    // is renumbered instead of the drop landing outside the pair it was aimed at.
    if (before != null && after != null && before === after)
        return [...ordered.slice(0, index), { id: movedId, position: 0 }, ...ordered.slice(index)]
            .map((row, position) => ({ id: row.id, position }));
    return [{ id: movedId, position: positionFor(positions, index) }];
}

function positionFor(positions: readonly number[], index: number): number {
    const before = positions[index - 1];
    const after = positions[index];
    if (before != null && after != null) return (before + after) / 2;
    if (before != null) return before + 1;
    if (after != null) return after - 1;
    return 0;
}

function push<T>(map: Map<number, T[]>, key: number, value: T) {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
}

function compareMinisters(a: BoardMember, b: BoardMember) {
    return a.ministering_position - b.ministering_position
        || compareText(a.last_name ?? '', b.last_name ?? '')
        || compareText(a.first_name, b.first_name);
}

function compareHouseholds(a: BoardHousehold, b: BoardHousehold) {
    return a.ministering_position - b.ministering_position || compareText(a.name, b.name);
}

function compareText(a: string, b: string) {
    return a.localeCompare(b, undefined, { sensitivity: 'base' }) || a.localeCompare(b);
}
