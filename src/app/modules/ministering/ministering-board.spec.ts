import { computed, signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import type { Row } from '../shared/table.types';
import { buildBoard, placement } from './ministering-board';

const row = { unit: 1, created_at: '2026-01-01', updated_at: '2026-01-01', deleted: false, _calculated: {} };
const district = (id: number, name: string, position = 0): Row<'ministering_district'> =>
    ({ ...row, id, name, position, interviewer: null });
const area = (id: number, ministering_district: number, position = 0): Row<'ministering_area'> =>
    ({ ...row, id, ministering_district, position });
const member = (id: number, first_name: string, overrides: Partial<Row<'member'>> = {}): Row<'member'> =>
    ({ ...row, id, first_name, last_name: 'Smith', household: 1, notes: null, nick_name: null,
        gender: 'male', can_minister: true, ministering_position: 0, ...overrides });
const household = (id: number, name: string, ministering_position = 0): Row<'household'> =>
    ({ ...row, id, name, ministering_position, color_1: 'red', color_2: 'green', _calculated: { firstNames: [] } });

describe('buildBoard', () => {
    it('keeps every live assignment and releases rows only when their last live area disappears', () => {
        const districts = signal([district(1, 'East'), district(2, 'West')]);
        const brother = member(1, 'Sam');
        const family = household(1, 'Smith');
        const board = computed(() => buildBoard({
            districts: districts(), areas: [area(11, 1), area(22, 2)], members: [brother], households: [family],
            roster: [11, 22, 99].map((ministering_area, id) => ({ ...row, id, ministering_area, member: brother.id })),
            assignments: [11, 22, 99].map((ministering_area, id) => ({ ...row, id, ministering_area, household: family.id })),
        }));
        const occupied = (id: number) => ({ area: { id }, ministers: [brother], households: [family] });
        expect(board()).toMatchObject({ districts: [
            { companionships: [occupied(11)] }, { companionships: [occupied(22)] },
        ], unassignedBrothers: [], unassignedHouseholds: [] });

        districts.update(current => current.slice(1));
        expect(board()).toMatchObject({ districts: [{ companionships: [occupied(22)] }], unassignedBrothers: [], unassignedHouseholds: [] });
        districts.set([]);
        expect(board()).toEqual({ districts: [], unassignedBrothers: [brother], unassignedHouseholds: [family] });
    });

    it('filters unassigned brothers by eligibility and orders lanes and rows by position then tie-breaker', () => {
        const amy = member(1, 'Amy'), ben = member(2, 'Ben'), first = member(3, 'Zac', { ministering_position: -1 });
        const able = household(1, 'Able'), baker = household(2, 'Baker'), young = household(3, 'Young', -1);
        const board = buildBoard({
            districts: [district(1, 'West'), district(2, 'East'), district(3, 'South', -1)],
            areas: [area(3, 2), area(2, 2), area(4, 2, -1)],
            members: [ben, member(4, 'Kim', { gender: 'female' }), amy, member(5, 'Lee', { can_minister: false }), first],
            households: [baker, able, young], roster: [], assignments: [],
        });
        expect(board.districts.map(lane => lane.district.id)).toEqual([3, 2, 1]);
        expect(board.districts[1].companionships.map(group => group.area.id)).toEqual([4, 2, 3]);
        expect(board.unassignedBrothers).toEqual([first, amy, ben]);
        expect(board.unassignedHouseholds).toEqual([young, able, baker]);
    });
});

describe('placement', () => {
    const ordered = [{ id: 1, position: 3 }, { id: 2, position: 6 }];
    it.each([[0, 2], [1, 4.5], [2, 7]])('places at index %i without rewriting neighbours', (index, position) => {
        expect(placement(ordered, 9, index)).toEqual([{ id: 9, position }]);
    });

    it('starts an empty lane at zero and renumbers tied neighbours in drop order', () => {
        expect(placement([], 9, 0)).toEqual([{ id: 9, position: 0 }]);
        expect(placement(ordered.map(item => ({ ...item, position: 0 })), 9, 1)).toEqual([
            { id: 1, position: 0 }, { id: 9, position: 1 }, { id: 2, position: 2 },
        ]);
    });
});
