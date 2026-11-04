import { describe, expect, it } from 'vitest';
import type { PdfTextRun } from '@/shared/utils/pdf-utils';
import { chooseGivenNames, parseReport, resolveReport, splitName, type ReportedDistrict } from './ministering-import-page';

/** Column x positions as the report draws them. */
const MINISTER_X = 7;
const HOUSEHOLD_X = 195;
const MEMBER_X = 361;
const GENDER_X = 575;
/** Glyph advance the fake runs use; only the column a word lands in matters. */
const ADVANCE = 4;

function text(x: number, value: string, y: number): PdfTextRun[] {
    const runs: PdfTextRun[] = [];
    let cursor = x;
    for (const [index, word] of value.split(' ').entries()) {
        if (index) {
            runs.push({ text: ' ', x: cursor, y });
            cursor += ADVANCE;
        }
        runs.push({ text: word, x: cursor, y });
        cursor += word.length * ADVANCE;
    }
    return runs;
}

function rule(y: number): PdfTextRun[] {
    return Array.from({ length: 8 }, (_, index) => ({ text: '.', x: MINISTER_X + index * 6, y }));
}

function header(name: string, interviewer: string, y: number): PdfTextRun[] {
    return [
        ...text(MINISTER_X, `Bezirk ${name}`, y),
        ...text(MINISTER_X, `Presidency Member: ${interviewer} +491511234`, y + 12),
        ...rule(y + 24),
    ];
}

describe('parseReport', () => {
    it('reads districts, companionships, households and members', () => {
        const districts = parseReport([[
            ...header('English', 'Weber, Jan', 20),
            ...text(MINISTER_X, 'Müller, Hans', 60),
            ...text(MINISTER_X, '+491511234', 72),
            ...text(HOUSEHOLD_X, 'Müller', 60),
            ...text(MEMBER_X, 'Müller, Hans', 60),
            ...text(GENDER_X, 'male 45 Mar', 60),
            ...text(MEMBER_X, 'Müller, Anna', 72),
            ...text(GENDER_X, 'female 42 Mar', 72),
            ...rule(84),
            ...text(MINISTER_X, 'Schmidt, Peter', 96),
            ...text(MINISTER_X, 'Weber, Jan', 108),
            ...text(HOUSEHOLD_X, 'Schmidt', 96),
            ...text(MEMBER_X, 'Schmidt, Peter', 96),
            ...text(GENDER_X, 'male 50 Jan', 96),
            ...rule(120),
        ]]);

        expect(districts).toEqual([{
            name: 'English',
            interviewer: { name: 'Weber, Jan' },
            companionships: [
                {
                    ministers: [{ name: 'Müller, Hans' }],
                    households: [{
                        name: 'Müller',
                        members: [
                            { name: 'Müller, Hans', gender: 'male' },
                            { name: 'Müller, Anna', gender: 'female' },
                        ],
                    }],
                },
                {
                    ministers: [{ name: 'Schmidt, Peter' }, { name: 'Weber, Jan' }],
                    households: [{
                        name: 'Schmidt',
                        members: [{ name: 'Schmidt, Peter', gender: 'male' }],
                    }],
                },
            ],
        }]);
    });

    it('keeps a district together when a block crosses a page break', () => {
        const districts = parseReport([
            [
                ...header('English', 'Weber, Jan', 20),
                ...text(MINISTER_X, 'Müller, Hans', 60),
                ...text(HOUSEHOLD_X, 'Müller', 60),
                ...text(MEMBER_X, 'Müller, Hans', 60),
            ],
            [
                ...text(MEMBER_X, 'Müller, Anna', 72),
                ...rule(84),
            ],
        ]);

        expect(districts[0].companionships[0].households[0].members)
            .toEqual([{ name: 'Müller, Hans' }, { name: 'Müller, Anna' }]);
    });

    it('ignores the printout furniture and a header without a companionship', () => {
        const districts = parseReport([[
            ...text(MINISTER_X, 'For Church Use Only, all rights reserved to Intellectual Reserve and its affiliates'.repeat(2), 10),
            ...header('English', 'Weber, Jan', 30),
        ]]);

        expect(districts[0].companionships).toEqual([]);
        expect(districts[0].name).toBe('English');
    });

    it('reads a companionship of one minister with no household', () => {
        const districts = parseReport([[
            ...header('English', 'Weber, Jan', 20),
            ...text(MINISTER_X, 'Müller, Hans', 60),
            ...rule(72),
        ]]);

        expect(districts[0].companionships).toEqual([{ ministers: [{ name: 'Müller, Hans' }], households: [] }]);
    });

    it('starts a household whose name prints on a row of its own', () => {
        const districts = parseReport([[
            ...header('Nord', 'Becker, Immanuel', 20),
            ...text(MINISTER_X, 'Lehmann, Hanjo', 60),
            ...text(HOUSEHOLD_X, 'Becker', 60),
            ...text(MEMBER_X, 'Becker, Immanuel', 60),
            ...text(GENDER_X, 'male 45 Mar', 60),
            ...text(HOUSEHOLD_X, 'Rohdenburg', 80),
            ...text(MEMBER_X, 'Rohdenburg, Dane Joseph', 92),
            ...text(GENDER_X, 'male 17 Aug', 92),
            ...text(MEMBER_X, 'Rohdenburg, Carolyn Jose', 104),
            ...text(GENDER_X, 'female 13 Jan', 104),
            ...rule(128),
        ]]);

        expect(districts[0].companionships[0].households).toEqual([
            { name: 'Becker', members: [{ name: 'Becker, Immanuel', gender: 'male' }] },
            {
                name: 'Rohdenburg',
                members: [
                    { name: 'Rohdenburg, Dane Joseph', gender: 'male' },
                    { name: 'Rohdenburg, Carolyn Jose', gender: 'female' },
                ],
            },
        ]);
    });

    it('reads a presidency line that runs past the minister column', () => {
        // The name, its phone and its email are one run, so the line is wider than the column.
        const districts = parseReport([[
            ...header('Süd', 'Lakpa, Hubert Maximilian', 20),
            ...text(MINISTER_X, 'Müller, Hans', 60),
            ...rule(72),
        ]]);

        expect(districts[0].interviewer).toEqual({ name: 'Lakpa, Hubert Maximilian' });
    });

    it('reads a district without an interviewer as having none', () => {
        const districts = parseReport([[
            ...header('Español', 'Unassigned', 20),
            ...text(MINISTER_X, 'Müller, Hans', 60),
            ...rule(72),
        ]]);

        expect(districts[0].interviewer).toBeNull();
    });
});

describe('resolveReport', () => {
    const members = [
        { id: 1, first_name: 'Hans', last_name: 'Müller', household: 10 },
        { id: 2, first_name: 'Anna', last_name: 'Müller', household: 11 },
        { id: 3, first_name: 'Peter', last_name: 'Schmidt', household: 12 },
    ];
    const households = [
        { id: 10, name: 'Müller, Hans' },
        { id: 11, name: 'Müller, Anna' },
        { id: 12, name: 'Schmidt, Peter' },
    ];

    function report(overrides: Partial<ReportedDistrict> = {}) {
        return [{ ...base[0], ...overrides }];
    }
    const base: ReportedDistrict[] = [{
        name: 'English',
        interviewer: { name: 'Weber, Jan' },
        companionships: [{
            ministers: [{ name: 'Schmidt, Peter' }],
            households: [{
                name: 'Müller',
                members: [{ name: 'Müller, Hans' }, { name: 'Müller, Anna' }],
            }],
        }],
    }];

    it('matches stored people and creates the rest', () => {
        const { districts, plan } = resolveReport(report(), members, households);

        expect(districts[0].companionships[0].ministers).toEqual([{ name: 'Schmidt, Peter', member: 3 }]);
        expect(districts[0].companionships[0].households[0].household).toBe(10);
        expect(plan.households.map(household => household.name)).toEqual(['Weber']);
        expect(plan.members.map(member => member.name)).toEqual(['Weber, Jan']);
        expect(plan.members[0].household).toBe(plan.households[0].key);
        expect(districts[0].interviewer!.member).toBe(plan.members[0].key);
    });

    it('moves a printed member into the household the report gives it', () => {
        const { plan } = resolveReport(report(), members, households);

        // Both households carry the printed family name, so the one holding most of the family
        // wins and the other member is moved into it.
        expect(plan.rehome).toEqual([{ member: 2, household: 10 }]);
    });

    it('creates two people when a household prints the same name twice', () => {
        const { districts, plan } = resolveReport(report({
            interviewer: null,
            companionships: [{
                ministers: [],
                households: [{
                    name: 'Panitsch',
                    members: [
                        { name: 'Panitsch, Michael', gender: 'male' },
                        { name: 'Panitsch, Sabine', gender: 'female' },
                        { name: 'Panitsch, Michael', gender: 'male' },
                    ],
                }],
            }],
        }), members, households);

        // A father and a son are both printed as `Panitsch, Michael`; neither may reuse the other.
        expect(plan.members.map(member => member.name))
            .toEqual(['Panitsch, Michael', 'Panitsch, Sabine', 'Panitsch, Michael']);
        expect(districts[0].companionships[0].households[0].members.map(member => member.member))
            .toEqual(plan.members.map(member => member.key));
    });

    it('matches a stored member whose first name was shortened on import', () => {
        const { districts, plan } = resolveReport(report({
            interviewer: null,
            companionships: [{
                ministers: [],
                households: [{
                    name: 'Rohdenburg',
                    members: [{ name: 'Rohdenburg, Dane Joseph Adan', gender: 'male' }],
                }],
            }],
        }), [{ id: 20, first_name: 'Dane', last_name: 'Rohdenburg', household: 30 }],
        [{ id: 30, name: 'Rohdenburg' }]);

        // The stored row was created as `Dane`, so the printed given names must still find it.
        expect(districts[0].companionships[0].households[0].members)
            .toEqual([{ name: 'Rohdenburg, Dane Joseph Adan', member: 20 }]);
        expect(plan.members).toEqual([]);
        expect(plan.rehome).toEqual([]);
    });

    it('creates a household named after the printed family name', () => {
        const { districts, plan } = resolveReport(report({
            interviewer: null,
            companionships: [{
                ministers: [],
                households: [{ name: 'Berg', members: [{ name: 'Berg, Lars', gender: 'male' }] }],
            }],
        }), members, households);

        expect(plan.households).toEqual([{ key: expect.any(Number), name: 'Berg' }]);
        expect(plan.members).toEqual([{
            key: expect.any(Number),
            name: 'Berg, Lars',
            gender: 'male',
            household: plan.households[0].key,
        }]);
        expect(districts[0].companionships[0].households[0].household).toBe(plan.households[0].key);
    });

    it('accepts a first name that is unique inside the household', () => {
        const { districts, plan } = resolveReport(report({
            interviewer: null,
            companionships: [{
                ministers: [],
                households: [{ name: 'Müller', members: [{ name: 'Müller, Anna' }] }],
            }],
        }), [
            { id: 1, first_name: 'Hans', last_name: 'Müller', household: 10 },
            { id: 2, first_name: 'Anna', last_name: 'Müller-Schmidt', household: 10 },
        ], [{ id: 10, name: 'Müller, Hans' }]);

        expect(districts[0].companionships[0].households[0].members).toEqual([{ name: 'Müller, Anna', member: 2 }]);
        expect(plan.members).toEqual([]);
    });
});

describe('splitName', () => {
    it('reads the printed "Surname, Given" and falls back to the last word', () => {
        expect(splitName('Müller, Hans')).toEqual({ last: 'Müller', first: 'Hans' });
        expect(splitName('Hans Müller')).toEqual({ last: 'Müller', first: 'Hans' });
    });

    it('takes a bracketed nickname out of the given names', () => {
        expect(splitName('Ikwo, Ukiwe Kalu (Chucks)'))
            .toEqual({ last: 'Ikwo', first: 'Ukiwe Kalu', nick: 'Chucks' });
        expect(splitName('Ikwo, Ukiwe Kalu'))
            .toEqual({ last: 'Ikwo', first: 'Ukiwe Kalu' });
    });
});

describe('chooseGivenNames', () => {
    function person(key: number, name: string) {
        return { key, name, gender: 'male' as const, household: 1 };
    }

    it('keeps one given name and any trailing number', () => {
        const chosen = chooseGivenNames([person(1, 'Rohdenburg, Dane Joseph Adan'), person(2, 'Rabe, Daniel III')]);

        expect(chosen.get(1)).toBe('Dane');
        expect(chosen.get(2)).toBe('Daniel III');
    });

    it('adds the next given name when two people would share one', () => {
        const chosen = chooseGivenNames([person(1, 'Rabe, Daniel III'), person(2, 'Rabe, Daniel Diether IV')]);

        expect(chosen.get(1)).toBe('Daniel III');
        expect(chosen.get(2)).toBe('Daniel Diether IV');
    });
});
