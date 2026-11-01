import { describe, expect, it } from 'vitest';
import type { PdfTextRun } from '@/shared/utils/pdf-utils';
import { link, parseHouseholdList, parseMemberList, type LcrMember } from './lcr-import-parser';

/** Column x positions as the LCR exports draw them. */
const NAME_X = 18;
const HOUSEHOLD_NAME_X = 16;
const HOUSEHOLD_MEMBERS_X = 235;
const MEMBERS_GENDER_X = 161;
const HOUSEHOLDS_GENDER_X = 348;

function run(text: string, x: number, y: number): PdfTextRun {
    return { text, x, y };
}

function memberRow(last: string, first: string, gender: 'M' | 'F', y: number): PdfTextRun[] {
    return [run(`${last},`, NAME_X, y), run(first, NAME_X + 30, y), run(gender, MEMBERS_GENDER_X, y)];
}

describe('parseMemberList', () => {
    it('reads one record per member row', () => {
        const members = parseMemberList([[
            ...memberRow('Abalo', 'Folly', 'M', 100),
            ...memberRow('Abbassi', 'Abbas', 'M', 123),
        ]]);

        expect(members).toEqual([
            { last_name: 'Abalo', first_name: 'Folly', gender: 'male' },
            { last_name: 'Abbassi', first_name: 'Abbas', gender: 'male' },
        ]);
    });

    it('keeps a name that wraps over several lines together', () => {
        const members = parseMemberList([[
            run('Janunzi-', NAME_X, 100), run('Eckert,', NAME_X + 60, 100),
            run('Angela', NAME_X + 85, 100), run('F', MEMBERS_GENDER_X, 100),
            // next member sits ~20 units below, so it must not join the first
            ...memberRow('Zed', 'Bo', 'M', 123),
        ]]);

        expect(members).toEqual([
            { last_name: 'Janunzi-Eckert', first_name: 'Angela', gender: 'female' },
            { last_name: 'Zed', first_name: 'Bo', gender: 'male' },
        ]);
    });

    it('ignores page furniture', () => {
        const members = parseMemberList([[
            run('Member List', NAME_X, 40),
            run('Hamburg Ward (64211)', NAME_X, 60),
            run('Name', NAME_X, 80),
            run('Gender', MEMBERS_GENDER_X, 80),
            ...memberRow('Abalo', 'Folly', 'M', 100),
        ]]);

        expect(members).toHaveLength(1);
        expect(members[0].last_name).toBe('Abalo');
    });

    it('drops a row whose name is not "Last, First"', () => {
        const members = parseMemberList([[
            run('no comma here', NAME_X, 100), run('M', MEMBERS_GENDER_X, 100),
        ]]);

        expect(members).toEqual([]);
    });
});

describe('parseHouseholdList', () => {
    it('starts a household on a name row that also carries a member gender', () => {
        const households = parseHouseholdList([[
            run('Smith, John & Mary', HOUSEHOLD_NAME_X, 100),
            run('John', HOUSEHOLD_MEMBERS_X, 100), run('male', HOUSEHOLDS_GENDER_X, 100),
            run('Mary', HOUSEHOLD_MEMBERS_X, 128), run('female', HOUSEHOLDS_GENDER_X, 128),
        ]]);

        expect(households).toEqual([{ name: 'Smith, John & Mary', slots: ['John', 'Mary'] }]);
    });

    it('appends the lines after a gender run to the member that just started', () => {
        const households = parseHouseholdList([[
            run('Aleman Perez, Alba Rosa', HOUSEHOLD_NAME_X, 100),
            run('Alba Rosa', HOUSEHOLD_MEMBERS_X, 100), run('female', HOUSEHOLDS_GENDER_X, 100),
            run('Rinck,', HOUSEHOLD_MEMBERS_X, 128), run('female', HOUSEHOLDS_GENDER_X, 128),
            run('Stephanie', HOUSEHOLD_MEMBERS_X, 142),
        ]]);

        expect(households[0].slots).toEqual(['Alba Rosa', 'Rinck, Stephanie']);
    });

    it('does not treat an address line containing a comma as a household', () => {
        const households = parseHouseholdList([[
            run('Smith, John', HOUSEHOLD_NAME_X, 100),
            run('John', HOUSEHOLD_MEMBERS_X, 100), run('male', HOUSEHOLDS_GENDER_X, 100),
            run('Kirchenpauen Str, 30 D', HOUSEHOLD_NAME_X, 114),
        ]]);

        expect(households).toHaveLength(1);
        expect(households[0].name).toBe('Smith, John');
    });

    it('starts a new household when the next name row carries a gender', () => {
        const households = parseHouseholdList([[
            run('Able, Ann', HOUSEHOLD_NAME_X, 100),
            run('Ann', HOUSEHOLD_MEMBERS_X, 100), run('female', HOUSEHOLDS_GENDER_X, 100),
            run('Baker, Bob', HOUSEHOLD_NAME_X, 150),
            run('Bob', HOUSEHOLD_MEMBERS_X, 150), run('male', HOUSEHOLDS_GENDER_X, 150),
        ]]);

        expect(households.map(household => household.name)).toEqual(['Able, Ann', 'Baker, Bob']);
        expect(households[1].slots).toEqual(['Bob']);
    });
});

describe('link', () => {
    const members: LcrMember[] = [
        { last_name: 'Smith', first_name: 'John', gender: 'male' },
        { last_name: 'Rinck', first_name: 'Stephanie', gender: 'female' },
        { last_name: 'Doe', first_name: 'Ann', gender: 'female' },
    ];

    it('matches a given-name slot to the member whose surname is in the household name', () => {
        const result = link(members, [{ name: 'Smith, John & Mary', slots: ['John'] }]);

        expect(result.households[0].members).toEqual([members[0]]);
        expect(result.unlinked.map(member => member.last_name)).toEqual(['Rinck', 'Doe']);
    });

    it('trusts a surname printed in the slot even when the household name differs', () => {
        const result = link(members, [{ name: 'Astudillo, Angel', slots: ['Rinck, Stephanie'] }]);

        expect(result.households[0].members).toEqual([members[1]]);
    });

    it('accepts a slot that names exactly one person by given name alone', () => {
        const result = link(members, [{ name: 'Household, One', slots: ['Ann'] }]);

        expect(result.households[0].members).toEqual([members[2]]);
    });

    it('refuses to guess when a given name matches several people', () => {
        const ambiguous: LcrMember[] = [
            { last_name: 'Alpha', first_name: 'Maria', gender: 'female' },
            { last_name: 'Beta', first_name: 'Maria', gender: 'female' },
        ];
        const result = link(ambiguous, [{ name: 'Household, One', slots: ['Maria'] }]);

        expect(result.households[0].members).toEqual([]);
        expect(result.unlinked).toHaveLength(2);
    });

    it('never places the same member in two households', () => {
        const result = link(members, [
            { name: 'Smith, John', slots: ['John'] },
            { name: 'Smith, John Jr', slots: ['John'] },
        ]);

        const placed = result.households.flatMap(household => household.members);
        expect(placed).toHaveLength(1);
        expect(result.households[1].members).toEqual([]);
    });

    it('reports every member it could not place as unlinked', () => {
        const result = link(members, [{ name: 'Nobody, Here', slots: ['Nobody'] }]);

        expect(result.households[0].members).toEqual([]);
        expect(result.unlinked).toEqual(members);
    });
});
