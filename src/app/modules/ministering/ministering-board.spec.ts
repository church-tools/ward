import { describe, expect, it } from 'vitest';
import { buildBoard, placement, type BoardHousehold, type BoardMember } from './ministering-board';

function member(id: number, first: string, position: number, gender: 'male' | 'female' = 'male'): BoardMember {
    return { id, first_name: first, last_name: 'Smith', nick_name: null, gender, ministering_position: position };
}

function household(id: number, name: string, position: number): BoardHousehold {
    return { id, name, color_1: 'blue', color_2: 'red', ministering_position: position };
}

const districts = [{ id: 7, name: 'First District', position: 0 }];
const areas = [
    { id: 10, position: 1, ministering_district: 7 },
    { id: 11, position: 0, ministering_district: 7 },
];

describe('buildBoard', () => {
    it('orders companionhips inside a district by position', () => {
        const board = buildBoard({ districts, areas, members: [], households: [], roster: [], assignments: [] });
        expect(board.districts[0].companionships.map(c => c.area.id)).toEqual([11, 10]);
    });

    it('orders ministers by ministering position, then by name on a tie', () => {
        const board = buildBoard({
            districts, areas,
            members: [member(1, 'Zed', 1), member(2, 'Ada', 0), member(3, 'Bob', 1), member(4, 'Amy', 1)],
            households: [],
            roster: [1, 2, 3, 4].map(member => ({ member, ministering_area: 10 })),
            assignments: [],
        });
        expect(board.districts[0].companionships[1].ministers.map(m => m.first_name)).toEqual(['Ada', 'Amy', 'Bob', 'Zed']);
    });

    it('puts a brother in no companionship in the unassigned list, and sisters never', () => {
        const board = buildBoard({
            districts, areas,
            members: [member(1, 'Assigned', 0), member(2, 'Unassigned', 1), member(3, 'Sister', 2, 'female')],
            households: [],
            roster: [{ member: 1, ministering_area: 10 }],
            assignments: [],
        });
        expect(board.unassignedBrothers.map(m => m.first_name)).toEqual(['Unassigned']);
    });

    it('treats an assignment to a missing companionship as unassigned', () => {
        const board = buildBoard({
            districts, areas,
            members: [member(1, 'Orphan', 0)],
            households: [household(5, 'Orphan House', 0)],
            roster: [{ member: 1, ministering_area: 999 }],
            assignments: [{ household: 5, ministering_area: 999 }],
        });
        expect(board.unassignedBrothers.map(m => m.first_name)).toEqual(['Orphan']);
        expect(board.unassignedHouseholds.map(h => h.name)).toEqual(['Orphan House']);
    });

    it('drops a companionship whose district is gone, keeping its ministers visible', () => {
        const board = buildBoard({
            districts: [],
            areas,
            members: [member(1, 'Stranded', 0)],
            households: [],
            roster: [{ member: 1, ministering_area: 10 }],
            assignments: [],
        });
        expect(board.districts).toEqual([]);
        expect(board.unassignedBrothers.map(m => m.first_name)).toEqual(['Stranded']);
    });
});

describe('placement', () => {
    const rows = (...positions: number[]) => positions.map((position, i) => ({ id: i + 1, position }));

    it('writes one row at the midpoint of its new neighbours', () => {
        expect(placement(rows(0, 2), 9, 1)).toEqual([{ id: 9, position: 1 }]);
    });

    it('writes one row beside a single neighbour or into an empty list', () => {
        expect(placement([], 9, 0)).toEqual([{ id: 9, position: 0 }]);
        expect(placement(rows(4), 9, 1)).toEqual([{ id: 9, position: 5 }]);
        expect(placement(rows(4), 9, 0)).toEqual([{ id: 9, position: 3 }]);
    });

    it('renumbers the list when two neighbours leave no room', () => {
        expect(placement(rows(0, 0, 0), 9, 1)).toEqual([
            { id: 1, position: 0 },
            { id: 9, position: 1 },
            { id: 2, position: 2 },
            { id: 3, position: 3 },
        ]);
    });
});
