import type { Household } from '@/modules/household/household';
import type { Member } from '@/modules/member/member';
import { MemberViewService } from '@/modules/member/member-view.service';
import { MinisteringService } from '@/modules/ministering/ministering.service';
import type { HouseholdMinisteredIn, MemberMinisteringIn, MinisteringArea, MinisteringDistrict } from '@/modules/ministering/ministering';
import { ProfileService } from '@/modules/profile/profile.service';
import FileButton from '@/shared/form/button/file/file-button';
import { AsyncButton } from '@/shared/form/button/async/async-button';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { SupabaseService } from '@/shared/service/supabase.service';
import { randomColorPair } from '@/shared/utils/color-utils';
import { FileType } from '@/shared/utils/file-utils';
import { extractTextRuns, groupRunsIntoRows, joinRuns, type PdfRow, type PdfTextRun } from '@/shared/utils/pdf-utils';
import { Component, computed, inject, signal } from '@angular/core';
import { PrivatePage } from '@/private/shared/private-page';
import LinkButton from '@/shared/form/button/link/link-button';

/** What a successful parse hands the two steps: the matched report plus the printed names. */
type ParsedReport = ResolvedImport & {
    householdNames: Map<number, string>;
    memberNames: Map<number, string>;
    /** The given name each person is created with, which is shorter than the printed one. */
    givenNames: Map<number, string>;
};

/** The real ids the people step handed out, keyed by the plan's negative placeholders. */
type PeopleIds = { households: Map<number, number>; members: Map<number, number> };

/** One household the people step touches, with the members it adds to it. */
type PeopleGroup = {
    key: number;
    name: string;
    /** False for a household the unit already stores: only the members under it are new. */
    created: boolean;
    members: { key: number; name: string; gender: Member.Gender }[];
};

@Component({
    selector: 'app-ministering-import-page',
    templateUrl: './ministering-import-page.html',
    imports: [LocalizePipe, LinkButton, FileButton, AsyncButton],
    host: { class: 'page' },
    styles: [
        `.scroll-container { max-height: 50vh; }`,
    ],
})
export class MinisteringImportPage extends PrivatePage {

    private readonly supabase = inject(SupabaseService);
    private readonly profileService = inject(ProfileService);
    private readonly ministering = inject(MinisteringService);

    protected readonly memberView = inject(MemberViewService);

    protected readonly FileType = FileType;
    protected readonly imported = signal<ParsedReport | null>(null);
    protected readonly step = signal<'people' | 'ministering'>('people');

    private readonly ids = signal<PeopleIds | null>(null);

    protected readonly parse = async (file: File) => {
        this.step.set('people');
        this.ids.set(null);
        this.imported.set(await this.readReport(file));
    };

    /** Creates the households and members the report names that the unit does not have yet. */
    protected readonly importPeople = async () => {
        const report = this.imported();
        if (!report) return;
        const own = await this.profileService.own.asPromise();
        if (!own) return;
        const unit = own.unit;
        const sync = this.supabase.sync;
        const { plan } = report;

        let householdId = await sync.from('household').findLargestId() ?? 0;
        let memberId = await sync.from('member').findLargestId() ?? 0;

        // The negative placeholders were handed out in plan order, so the real ids can be assigned
        // right here instead of asking the server which inserted row was which. The ministering
        // step resolves them through these maps, so it writes exactly what this step previewed.
        const households = new Map<number, number>();
        const members = new Map<number, number>();
        for (const household of plan.households) households.set(household.key, ++householdId);
        for (const member of plan.members) members.set(member.key, ++memberId);
        this.ids.set({ households, members });

        const householdOf = (id: number) => households.get(id) ?? id;

        if (plan.households.length) await sync.from('household').insert(plan.households.map(household => ({
            id: householdOf(household.key),
            name: household.name,
            unit,
            ...randomColorPair(),
        })));
        if (plan.members.length) await sync.from('member').insert(plan.members.map(member => {
            const { last, first, nick } = splitName(member.name);
            return {
                id: members.get(member.key) ?? member.key,
                first_name: report.givenNames.get(member.key) ?? first,
                last_name: last,
                nick_name: nick,
                gender: member.gender,
                household: householdOf(member.household),
                unit,
            };
        }));

        // A rehome moves a stored member, so the rows are read back after the insert above.
        if (plan.rehome.length) {
            const rows = new Map((await sync.from('member').readAll().get()).map(row => [row.id, row]));
            await sync.from('member').update(plan.rehome.flatMap(move => {
                const row = rows.get(move.member);
                return row ? [{ ...row, household: householdOf(move.household) }] : [];
            }));
        }

        this.step.set('ministering');
        await this.ministering.reload();
    };

    /** Reads an LCR report and matches it against this unit's members and households. */
    private async readReport(file: File): Promise<ParsedReport | null> {
        const pages = await extractTextRuns(file);
        if (!pages.some(page => page.length)) return null;
        const reported = parseReport(pages);
        if (!reported.some(district => district.companionships.length)) return null;
        const [members, households] = await Promise.all([
            this.supabase.sync.from('member').readAll().get(),
            this.supabase.sync.from('household').readAll().get(),
        ]);
        const { districts, plan } = resolveReport(reported, members, households);
        const givenNames = chooseGivenNames(plan.members);
        // Stored rows and planned placeholders share one id space here, because the previews name
        // both from the same line (a rehome into a household that does not exist yet).
        return {
            districts,
            plan,
            givenNames,
            householdNames: new Map([
                ...households.map(household => [household.id, household.name] as [number, string]),
                ...plan.households.map(household => [household.key, household.name] as [number, string]),
            ]),
            memberNames: new Map([
                ...members.map(member => [member.id, `${member.last_name ?? ''}, ${member.first_name}`] as [number, string]),
                ...plan.members.map(member => [member.key, member.name] as [number, string]),
            ]),
        };
    }

    /**
     * Replaces the unit's whole ministering structure with the parsed report. The report is a
     * snapshot, not a diff: every district, companionship and assignment is deleted first (see
     * DECISIONS.md).
     */
    protected readonly importMinistering = async () => {
        const report = this.imported();
        const ids = this.ids();
        if (!report || !ids) return;
        const own = await this.profileService.own.asPromise();
        if (!own) return;
        const unit = own.unit;
        const sync = this.supabase.sync;

        // The write reads its rows from the store rather than from the board's signals, which is
        // also where the people the previous step created now live.
        const [memberTable, householdTable, areaRows, districtRows, rosterRows, assignmentRows] = await Promise.all([
            sync.from('member').readAll().get(),
            sync.from('household').readAll().get(),
            sync.from('ministering_area').readAll().get(),
            sync.from('ministering_district').readAll().get(),
            sync.from('member_ministering_in').readAll().get(),
            sync.from('household_ministered_in').readAll().get(),
        ]);

        let districtId = await sync.from('ministering_district').findLargestId() ?? 0;
        let areaId = await sync.from('ministering_area').findLargestId() ?? 0;

        const memberOf = (id: number) => ids.members.get(id) ?? id;
        const householdOf = (id: number) => ids.households.get(id) ?? id;

        const memberRows = new Map(memberTable.map(row => [row.id, row]));
        const householdRows = new Map(householdTable.map(row => [row.id, row]));
        const memberChanges = new Map<number, Member.Update>();
        const householdChanges = new Map<number, Household.Update>();

        const districtInserts: MinisteringDistrict.Insert[] = [];
        const areaInserts: MinisteringArea.Insert[] = [];
        const roster: MemberMinisteringIn.Insert[] = [];
        const assignments: HouseholdMinisteredIn.Insert[] = [];

        for (const [districtIndex, district] of report.districts.entries()) {
            const id = ++districtId;
            districtInserts.push({
                id,
                unit,
                name: district.name,
                position: districtIndex,
                interviewer: district.interviewer ? memberOf(district.interviewer.member) : null,
            });
            for (const [areaIndex, companionship] of district.companionships.entries()) {
                const area = ++areaId;
                areaInserts.push({ id: area, unit, ministering_district: id, position: areaIndex });
                companionship.ministers.forEach((person, index) => {
                    const member = memberOf(person.member);
                    roster.push({ unit, ministering_area: area, member });
                    const row = memberRows.get(member);
                    if (row) memberChanges.set(member, { ...row, ministering_position: index });
                });
                companionship.households.forEach((household, index) => {
                    const assigned = householdOf(household.household);
                    assignments.push({ unit, ministering_area: area, household: assigned });
                    const row = householdRows.get(assigned);
                    if (row) householdChanges.set(assigned, { ...row, ministering_position: index });
                });
            }
        }

        await Promise.all([
            ...rosterRows.map(row => sync.from('member_ministering_in').delete(row)),
            ...assignmentRows.map(row => sync.from('household_ministered_in').delete(row)),
        ]);
        await Promise.all(areaRows.map(row => sync.from('ministering_area').delete(row)));
        await Promise.all(districtRows.map(row => sync.from('ministering_district').delete(row)));

        if (districtInserts.length) await sync.from('ministering_district').insert(districtInserts);
        if (areaInserts.length) await sync.from('ministering_area').insert(areaInserts);
        if (roster.length) await sync.from('member_ministering_in').insert(roster);
        if (assignments.length) await sync.from('household_ministered_in').insert(assignments);
        if (memberChanges.size) await sync.from('member').update([...memberChanges.values()]);
        if (householdChanges.size) await sync.from('household').update([...householdChanges.values()]);

        await this.ministering.reload();
        await this.closePage?.();
    };

    /** The people step, one row per household with the members the import adds to it underneath. */
    protected readonly newPeople = computed<PeopleGroup[]>(() => {
        const report = this.imported();
        if (!report) return [];
        const { plan } = report;

        const membersOf = new Map<number, ImportPlan['members']>();
        for (const member of plan.members) {
            const members = membersOf.get(member.household);
            if (members) members.push(member);
            else membersOf.set(member.household, [member]);
        }

        const created = new Set(plan.households.map(household => household.key));
        // The household row above carries the family name, so a member only needs his given name.
        const rows = (members: ImportPlan['members']) => members.map(member => ({
            key: member.key,
            name: this.imported()?.givenNames.get(member.key) ?? splitName(member.name).first,
            gender: member.gender,
        }));
        return [
            ...plan.households.map(household => ({
                key: household.key,
                name: household.name,
                created: true,
                members: rows(membersOf.get(household.key) ?? []),
            })),
            // A new member may also join a household the unit already stores — a child of a family
            // the report matched — so those households get a row of their own, without the mark.
            ...[...membersOf]
                .filter(([key]) => !created.has(key))
                .map(([key, members]) => ({ key, name: this.householdName(key), created: false, members: rows(members) })),
        ];
    });

    /** Companionships are shown after the people exist, so no name needs its "will be created" mark. */
    protected names(people: ImportedPerson[]): string {
        return people.map(person => person.name).join(' & ');
    }

    protected households(companionship: ImportedCompanionship): string {
        return companionship.households.map(household => household.name).join(', ');
    }

    protected memberName(id: number): string {
        return this.imported()?.memberNames.get(id) ?? '';
    }

    protected householdName(id: number): string {
        return this.imported()?.householdNames.get(id) ?? '';
    }
}

/**
 * One printed person. `member` is the row they were matched to; a **negative** number is a
 * placeholder for someone this import will create — the write path hands out the real ids in the
 * same order, so the two sides agree without a second lookup.
 */
export type ImportedPerson = { name: string; member: number };

/** A printed household, matched (`household >= 0`) or to be created (`household < 0`). */
export type ImportedHousehold = { name: string; household: number; members: ImportedPerson[] };

export type ImportedCompanionship = {
    ministers: ImportedPerson[];
    households: ImportedHousehold[];
};

export type ImportedDistrict = {
    name: string;
    /** The `Presidency Member` printed under the district header. */
    interviewer: ImportedPerson | null;
    companionships: ImportedCompanionship[];
};

/**
 * Everything the write path has to create before it can write the assignments, keyed by the
 * negative placeholders that appear in `districts`. `rehome` moves a matched member into the
 * household the report prints for it.
 */
export type ImportPlan = {
    households: { key: number; name: string }[];
    members: { key: number; name: string; gender: Member.Gender; household: number }[];
    rehome: { member: number; household: number }[];
};

export type ResolvedImport = { districts: ImportedDistrict[]; plan: ImportPlan };

/** The report before anything is matched to a member or a household row. */
export type ReportedPerson = { name: string; gender?: Member.Gender };
export type ReportedHousehold = { name: string; members: ReportedPerson[] };
export type ReportedCompanionship = { ministers: ReportedPerson[]; households: ReportedHousehold[] };
export type ReportedDistrict = { name: string; interviewer: ReportedPerson | null; companionships: ReportedCompanionship[] };

/** Column bands, measured from `.references/Ministering Assignments.pdf`. */
const MINISTER_MAX_X = 185;
const HOUSEHOLD_MIN_X = 185;
const HOUSEHOLD_MAX_X = 350;
const MEMBER_MIN_X = 350;
const MEMBER_MAX_X = 505;
const GENDER_MIN_X = 505;
const GENDER_MAX_X = 620;

/**
 * The printout's own header and footer are single lines of ~200 characters; every line that
 * carries a name, a district or a contact detail is far shorter.
 */
const FURNITURE_LENGTH = 100;
const DISTRICT_HEADER = /^(?:bezirk|district)\b\s*(.*)$/i;
const DOT = /^[.·]$/;
const GENDER = /^(m|f|male|female)$/i;

/**
 * Reads the report's rows into districts, companionships, households and people — names only, no
 * matching against the unit, so it is a pure function of the extracted text.
 *
 * Measured from the sample report with `extractTextRuns`, which emits **one run per glyph** (spaces
 * are runs too, so `joinRuns` gives back the words). `y` is one coordinate for the whole document,
 * not per page, and the printout's furniture repeats at the top of every page — so the rows of all
 * pages are grouped together and furniture is dropped.
 *
 * - one block per companionship, ended by a row of `.` glyphs spanning x 7–738;
 * - a block holding `Bezirk <name>` is a district header and carries that district's
 *   `Presidency Member` line; every other block repeats it for its own companionship, which is
 *   why the interviewer is taken from the header block only;
 * - ministers in the left column (`Surname, Given`) with their phone/address/email stacked below;
 * - the household's family name at x ≈ 195, its members (`Surname, Given`) at x ≈ 361, gender at
 *   x ≈ 571. The name is centred on the family's contact block, so it prints either on the first
 *   member's row or on a row of its own above it; the members below it, until the next name, are
 *   its members.
 */
export function parseReport(pages: PdfTextRun[][]): ReportedDistrict[] {
    const districts: ReportedDistrict[] = [];
    let district: ReportedDistrict | null = null;

    for (const block of splitBlocks(groupRunsIntoRows(pages.flat()))) {
        const header = block.find(row => DISTRICT_HEADER.test(band(row, 0, MINISTER_MAX_X)));
        if (header) {
            district = {
                name: band(header, 0, MINISTER_MAX_X).replace(DISTRICT_HEADER, '$1').trim(),
                interviewer: presidencyPerson(block),
                companionships: [],
            };
            districts.push(district);
            // Every observed header sits in a block of its own; a companionship sharing the block
            // would be dropped here rather than guessed at.
            continue;
        }
        const companionship = readCompanionship(block);
        if (!companionship) continue;
        if (!district) {
            district = { name: '', interviewer: null, companionships: [] };
            districts.push(district);
        }
        district.companionships.push(companionship);
    }
    return districts;
}

/** Matches every printed name to a member row and every printed household to a household row. */
export function resolveReport(
    reported: ReportedDistrict[],
    members: MemberRow[],
    households: HouseholdRow[],
): ResolvedImport {
    const plan: ImportPlan = { households: [], members: [], rehome: [] };
    let nextKey = 0;

    // Stored first names are shortened on import (`Dane` for `Dane Joseph Adan`), so a printed name
    // matches the stored row whose first name it starts with.
    const bySurname = new Map<string, MemberRow[]>();
    for (const member of members) push(bySurname, surnameKey(member.last_name ?? ''), member);

    const startsFirstNames = (stored: MemberRow, printedFirstName: string): boolean => {
        const storedFirst = normalize(stored.first_name);
        const printed = normalize(printedFirstName);
        return storedFirst === printed || printed.startsWith(`${storedFirst} `);
    };

    const storedMatch = (last: string, first: string, exclude?: Set<number>): MemberRow | undefined =>
        (bySurname.get(surnameKey(last)) ?? []).find(member => !exclude?.has(member.id)
            && startsFirstNames(member, first));

    const householdById = new Map(households.map(household => [household.id, household]));
    const householdsBySurname = new Map<string, HouseholdRow[]>();
    const membersByHousehold = new Map<number, MemberRow[]>();
    for (const household of households) push(householdsBySurname, surnameKey(household.name), household);
    for (const member of members) push(membersByHousehold, member.household, member);

    const created = new Map<string, ImportPlan['members'][number]>();

    const newHousehold = (name: string): number => {
        const key = --nextKey;
        plan.households.push({ key, name });
        return key;
    };

    /**
     * The row a printed person already occupies, or a new plan entry for them. `claimed` lists the
     * people this household has already placed, so a name printed twice — a father and a son —
     * becomes two people instead of one.
     */
    const place = (person: ReportedPerson, household: number, claimed?: Set<number>): number => {
        const { last, first } = splitName(person.name);
        const key = personKey(last, first);

        const stored = storedMatch(last, first, claimed);
        if (stored) {
            claimed?.add(stored.id);
            if (stored.household !== household)
                plan.rehome.push({ member: stored.id, household });
            return stored.id;
        }
        // The report prints only the names it has, so a first name that is unique inside the
        // household is the one safe guess left — a variant of the same person, not a new one.
        if (household > 0) {
            const named = (membersByHousehold.get(household) ?? [])
                .filter(member => !claimed?.has(member.id) && startsFirstNames(member, first));
            if (named.length === 1) {
                claimed?.add(named[0].id);
                return named[0].id;
            }
        }
        const planned = created.get(key);
        if (planned && !claimed?.has(planned.key)) {
            planned.household = household;
            claimed?.add(planned.key);
            return planned.key;
        }
        const member = {
            key: --nextKey,
            name: person.name,
            // shortcut: the report prints no gender for ministers, so an unknown minister becomes a
            // brother. Revisit if a companionship of sisters ever needs its own gender.
            gender: person.gender ?? 'male',
            household,
        };
        // A minister or interviewer printed later is the person above, not the second namesake.
        if (!created.has(key)) created.set(key, member);
        claimed?.add(member.key);
        plan.members.push(member);
        return member.key;
    };

    /** A minister or interviewer keeps whichever household they already live in. */
    const placeMinister = (person: ReportedPerson): number => {
        const { last, first } = splitName(person.name);
        const stored = storedMatch(last, first);
        if (stored) return stored.id;
        const planned = created.get(personKey(last, first));
        if (planned) return planned.key;
        return place(person, newHousehold(familyName(person.name)));
    };

    const placeHousehold = (reported: ReportedHousehold): ImportedHousehold => {
        const candidates = householdsBySurname.get(surnameKey(reported.name)) ?? [];
        const printed = reported.members.map(person => {
            const { last, first } = splitName(person.name);
            return storedMatch(last, first);
        });
        const household = choose(candidates, printed, householdById)?.id ?? newHousehold(reported.name);
        const claimed = new Set<number>();
        return {
            name: reported.name,
            household,
            members: reported.members.map(person => ({
                name: person.name,
                member: place(person, household, claimed),
            })),
        };
    };

    // Households first: a minister who lives in one of them belongs there, not in a household of
    // his own. The two passes are why `placeMinister` never re-homes anyone.
    const placed = reported.map(district =>
        district.companionships.map(companionship => companionship.households.map(placeHousehold)));

    const districts = reported.map((district, districtIndex) => ({
        name: district.name,
        interviewer: district.interviewer
            ? { name: district.interviewer.name, member: placeMinister(district.interviewer) }
            : null,
        companionships: district.companionships.map((companionship, index) => ({
            ministers: companionship.ministers.map(person => ({
                name: person.name,
                member: placeMinister(person),
            })),
            households: placed[districtIndex][index],
        })),
    }));

    // One member can be reached from several printed rows; the last move is the one kept.
    plan.rehome = [...new Map(plan.rehome.map(move => [move.member, move])).values()];
    return { districts, plan };
}

type MemberRow = Pick<Member.Row, 'id' | 'first_name' | 'last_name' | 'household'>;
type HouseholdRow = Pick<Household.Row, 'id' | 'name'>;

/**
 * The household a printed family belongs to. A family name held by several households is decided
 * by where its printed members already live; when no name matches at all, their members' household
 * is still the household the report describes.
 */
function choose(
    candidates: HouseholdRow[],
    printed: (MemberRow | undefined)[],
    byId: Map<number, HouseholdRow>,
): HouseholdRow | undefined {
    if (candidates.length) {
        let best = candidates[0];
        let bestCount = -1;
        for (const candidate of candidates) {
            const count = printed.filter(member => member?.household === candidate.id).length;
            if (count > bestCount || (count === bestCount && candidate.id < best.id)) {
                best = candidate;
                bestCount = count;
            }
        }
        return best;
    }
    const counts = new Map<number, number>();
    for (const member of printed)
        if (member) counts.set(member.household, (counts.get(member.household) ?? 0) + 1);
    const winner = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
    return winner == null ? undefined : byId.get(winner);
}

function splitBlocks(rows: PdfRow[]): PdfRow[][] {
    const blocks: PdfRow[][] = [];
    let block: PdfRow[] = [];
    for (const row of rows) {
        if (row.runs.length > 2 && row.runs.every(run => DOT.test(run.text))) {
            blocks.push(block);
            block = [];
            continue;
        }
        const text = joinRuns(row.runs);
        if (!text || text.length > FURNITURE_LENGTH) continue;
        block.push(row);
    }
    if (block.length) blocks.push(block);
    return blocks;
}

function readCompanionship(block: PdfRow[]): ReportedCompanionship | null {
    const ministers: ReportedPerson[] = [];
    const households: ReportedHousehold[] = [];
    let household: ReportedHousehold | null = null;
    // The report centres a family's name on its contact block, so it can print on a row that has
    // no member on it. That name still belongs to the members printed below it.
    let pending = '';

    for (const row of block) {
        if (isPresidencyRow(row)) continue;
        const minister = personIn(band(row, 0, MINISTER_MAX_X));
        if (minister) ministers.push(minister);

        const contact = band(row, HOUSEHOLD_MIN_X, HOUSEHOLD_MAX_X).trim();
        const person = personIn(band(row, MEMBER_MIN_X, MEMBER_MAX_X));
        if (!person) {
            if (isFamilyName(contact)) pending = contact;
            continue;
        }
        person.gender = genderIn(band(row, GENDER_MIN_X, GENDER_MAX_X));
        const name = isFamilyNameOf(contact, person.name) ? contact : pending;
        if (isFamilyNameOf(name, person.name)) {
            household = { name, members: [] };
            households.push(household);
        }
        pending = '';
        if (household) household.members.push(person);
    }
    return ministers.length || households.length ? { ministers, households } : null;
}

function presidencyPerson(block: PdfRow[]): ReportedPerson | null {
    const row = block.find(isPresidencyRow);
    if (!row) return null;
    // `Presidency Member: Surname, Given <phone|email>` runs past the minister column, so the whole
    // row is read and cut at the first character that cannot belong to the name. A line that is not
    // `Surname, Given` — a district with no interviewer prints `Unassigned` — is not a person.
    const text = joinRuns(row.runs);
    return personIn(text.slice(text.indexOf(':') + 1).split(/[+(|@\d]/, 1)[0].trim());
}

function isPresidencyRow(row: PdfRow): boolean {
    return band(row, 0, MINISTER_MAX_X).includes(':');
}

/** A cell that can only hold a family name: no digits, no contact details, at least two letters. */
function isFamilyName(text: string): boolean {
    return !/[\d@,:|]/.test(text) && /\p{L}{2}/u.test(text);
}

function isFamilyNameOf(contact: string, name: string): boolean {
    if (!isFamilyName(contact)) return false;
    const surname = normalize(surnameOf(name));
    return normalize(contact) === surname || normalize(lastWord(contact)) === surname;
}

function personIn(text: string): ReportedPerson | null {
    const name = text.replace(/\s+/g, ' ').trim();
    if (!name.includes(',') || /\d/.test(name) || !/\p{L}{2}/u.test(name)) return null;
    return { name };
}

function genderIn(text: string): Member.Gender | undefined {
    const token = text.trim().split(/\s+/)[0] ?? '';
    if (!GENDER.test(token)) return undefined;
    return /^m(ale)?$/i.test(token) ? 'male' : 'female';
}

function band(row: PdfRow, minX: number, maxX: number): string {
    return joinRuns(row.runs.filter(run => run.x >= minX && run.x < maxX));
}

/** `Surname, Given` as printed; a name without a comma falls back to its last word. */
/** `Surname, Given` as printed; a name without a comma falls back to its last word. A trailing
 * bracketed word is the nickname the report prints beside the given names. */
export function splitName(name: string): { last: string; first: string; nick?: string } {
    const bracket = /\s*\(([^)]*)\)\s*$/.exec(name);
    const printed = (bracket ? name.slice(0, bracket.index) : name).trim();
    const nick = bracket?.[1].trim();

    const comma = printed.indexOf(',');
    const words = printed.split(/\s+/);
    const split = comma >= 0
        ? { last: printed.slice(0, comma).trim(), first: printed.slice(comma + 1).trim() }
        : { last: words.pop() ?? '', first: words.join(' ') };
    return nick ? { ...split, nick } : split;
}

export function familyName(name: string): string {
    return splitName(name).last;
}

/**
 * The given name each person is created with. One name is enough, so the first word is kept and a
 * trailing number stays with it (`Daniel III`). Only when two people of the same family would end
 * up with the same name does the later one take the next word instead (`Daniel Diether IV`).
 */
export function chooseGivenNames(members: ImportPlan['members']): Map<number, string> {
    const printed = members.map(member => {
        const { last, first } = splitName(member.name);
        const words = first.split(/\s+/).filter(Boolean);
        const number = words.length > 1 && /^(\d+|[IVXLCDM]+)$/.test(words.at(-1) ?? '')
            ? words.pop()
            : undefined;
        return { key: member.key, surname: surnameKey(last), words, number };
    });

    const chosen = new Map<number, string>();
    for (const person of printed) {
        const sameSurname = printed.filter(other => other.surname === person.surname);
        let take = 1;
        while (take < person.words.length && sameSurname.some(other => other !== person
            && other.words.slice(0, take).join(' ') === person.words.slice(0, take).join(' ')))
            take++;
        chosen.set(person.key, [...person.words.slice(0, take), person.number].filter(Boolean).join(' '));
    }
    return chosen;
}

function surnameOf(name: string): string {
    return splitName(name).last;
}

function personKey(lastName: string, firstName: string): string {
    return `${normalize(lastName)}|${normalize(firstName)}`;
}

/** Household names are `Family, First` from the member import, `Family` from this one. */
function surnameKey(name: string): string {
    return normalize(name.split(',')[0]);
}

function lastWord(text: string): string {
    return text.trim().split(/\s+/).pop() ?? '';
}

function normalize(value: string): string {
    return value.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function push<T>(map: Map<number | string, T[]>, key: number | string, value: T) {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
}
