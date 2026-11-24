import type { Household } from "../household/household";
import type { Member } from "../member/member";
import type { HouseholdMinisteredIn, MemberMinisteringIn, MinisteringArea, MinisteringDistrict } from "./ministering";

export type BoardCompanionship = {
    area: Pick<MinisteringArea.Row, 'id' | 'position'>;
    ministers: Member.Row[];
    households: Household.Row[];
};
export type BoardDistrict = {
    district: Pick<MinisteringDistrict.Row, 'id' | 'name' | 'position'>;
    companionships: BoardCompanionship[];
};

export type Board = {
    districts: BoardDistrict[];
    unassignedBrothers: Member.Row[];
    unassignedHouseholds: Household.Row[];
};

export type BoardSource = {
    districts: readonly Pick<MinisteringDistrict.Row, 'id' | 'name' | 'position'>[];
    areas: readonly Pick<MinisteringArea.Row, 'id' | 'position' | 'ministering_district'>[];
    members: readonly Member.Row[];
    households: readonly Household.Row[];
    roster: readonly Pick<MemberMinisteringIn.Row, 'member' | 'ministering_area'>[];
    assignments: readonly Pick<HouseholdMinisteredIn.Row, 'household' | 'ministering_area'>[];
};

export function buildBoard({ districts, areas, members, households, roster, assignments }: BoardSource): Board {
    const districtIds = new Set(districts.map(district => district.id));
    const liveAreas = areas.filter(area => districtIds.has(area.ministering_district));
    const areaIds = new Set(liveAreas.map(area => area.id));

    const memberById = new Map(members.map(member => [member.id, member]));
    const householdById = new Map(households.map(household => [household.id, household]));

    const ministersByArea = new Map<number, Member.Row[]>();
    const assignedMemberIds = new Set<number>();
    for (const entry of roster) {
        if (!areaIds.has(entry.ministering_area)) continue;
        const member = memberById.get(entry.member);
        if (!member) continue;
        assignedMemberIds.add(member.id);
        push(ministersByArea, entry.ministering_area, member);
    }

    const householdsByArea = new Map<number, Household.Row[]>();
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
        unassignedBrothers: members
            .filter(member => member.gender === 'male' && member.can_minister && !assignedMemberIds.has(member.id))
            .sort(compareMinisters),
        unassignedHouseholds: households
            .filter(household => !assignedHouseholdIds.has(household.id))
            .sort(compareHouseholds),
    };
}

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

function compareMinisters(a: Member.Row, b: Member.Row) {
    return a.ministering_position - b.ministering_position
        || compareText(a.last_name ?? '', b.last_name ?? '')
        || compareText(a.first_name, b.first_name);
}

function compareHouseholds(a: Household.Row, b: Household.Row) {
    return a.ministering_position - b.ministering_position || compareText(a.name, b.name);
}

function compareText(a: string, b: string) {
    return a.localeCompare(b, undefined, { sensitivity: 'base' }) || a.localeCompare(b);
}
