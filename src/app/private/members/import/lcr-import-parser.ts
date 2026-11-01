import { extractTextRuns, groupRunsIntoRows, joinRuns, type PdfRow, type PdfTextRun } from '@/shared/utils/pdf-utils';
import type { Member } from '@/modules/member/member';

/**
 * Reads the two LCR exports and links every member to a household.
 *
 * The member list is one row per person: `Name | Gender | Age | Birth Date | Phone | Email`.
 * The household export is one block per household: `Name` holds the household name and, below
 * it, the address; `Members` holds the people living there; then `Gender | Age`. A member's
 * surname is printed in the `Members` column only when it differs from the household's, so an
 * entry is either `First Middle...` or `Last, First Middle...`.
 *
 * Both exports describe the same population, so a complete join exists. A member whose printed
 * name resembles neither the household name nor another member is returned in `unlinked`
 * rather than guessed at.
 */
export type LcrMember = {
    last_name: string;
    first_name: string;
    gender: Member.Gender;
};

export type LcrHousehold = {
    name: string;
    members: LcrMember[];
};

export type LcrImport = {
    households: LcrHousehold[];
    unlinked: LcrMember[];
};

type HouseholdSlots = {
    name: string;
    slots: string[];
};

/** Column boundaries, measured from the `Tm` origins the exports use. */
const MEMBERS_NAME_MAX_X = 150;
const MEMBERS_GENDER_MIN_X = 150;
const MEMBERS_GENDER_MAX_X = 250;

const HOUSEHOLDS_NAME_MAX_X = 200;
const HOUSEHOLDS_MEMBERS_MIN_X = 227;
const HOUSEHOLDS_MEMBERS_MAX_X = 340;

/** Page furniture: repeats on every page and never belongs to a record. */
const PAGE_CHROME = /(For Church Use|All rights reserved|Member List|Ward \(\d+|^\d{1,3}$|^\d{1,2} \w{3} \d{4}$)/i;
const COLUMN_HEADERS = /^(Name|Household|Members|Gender|Age|Birth Date|Phone Number|Email)$/i;
const MEMBERS_GENDER = /^[MF]$/;
const HOUSEHOLDS_GENDER = /^(male|female)$/;

/** A member's name cell wraps across lines ~7 units apart while separate members sit ~23
 *  apart, so chaining at 14 merges a wrapped name without joining two people. */
const MEMBERS_RECORD_CHAIN_TOLERANCE = 14;

const NAME_LINE = /^(.+?),\s*(.+)$/;

export async function parseLcrExport(membersFile: File, householdsFile: File): Promise<LcrImport> {
    const [memberPages, householdPages] = await Promise.all([
        extractTextRuns(membersFile),
        extractTextRuns(householdsFile),
    ]);
    return link(parseMemberList(memberPages), parseHouseholdList(householdPages));
}

export function parseMemberList(pages: PdfTextRun[][]): LcrMember[] {
    const members: LcrMember[] = [];
    for (const page of pages) {
        const rows = groupRunsIntoRows(page).filter(row => !isChromeRow(row));
        for (const record of chainRows(rows, MEMBERS_RECORD_CHAIN_TOLERANCE)) {
            const gender = findRun(record, run => MEMBERS_GENDER.test(run.text.trim())
                && run.x > MEMBERS_GENDER_MIN_X && run.x < MEMBERS_GENDER_MAX_X);
            if (!gender)
                continue;
            const name = readWrappedLines(record, run => run.x < MEMBERS_NAME_MAX_X
                && !PAGE_CHROME.test(run.text.trim()) && !COLUMN_HEADERS.test(run.text.trim()));
            const parsed = name.match(NAME_LINE);
            if (!parsed)
                continue;
            members.push({
                last_name: parsed[1].trim(),
                first_name: parsed[2].trim(),
                gender: gender.text.trim() === 'M' ? 'male' : 'female',
            });
        }
    }
    return members;
}

export function parseHouseholdList(pages: PdfTextRun[][]): HouseholdSlots[] {
    const households: HouseholdSlots[] = [];
    let current: HouseholdSlots | null = null;
    let pendingSlot: string | null = null;

    const flush = () => {
        if (current && pendingSlot)
            current.slots.push(pendingSlot);
        pendingSlot = null;
    };

    for (const page of pages) {
        for (const row of groupRunsIntoRows(page)) {
            const nameText = readBand(row, run => run.x < HOUSEHOLDS_NAME_MAX_X);
            if (nameText && (PAGE_CHROME.test(nameText) || COLUMN_HEADERS.test(nameText)))
                continue;
            const memberText = readBand(row,
                run => run.x >= HOUSEHOLDS_MEMBERS_MIN_X && run.x < HOUSEHOLDS_MEMBERS_MAX_X);
            if (memberText && COLUMN_HEADERS.test(memberText))
                continue;
            const gender = row.runs.find(run => HOUSEHOLDS_GENDER.test(run.text.trim()));

            // A household starts on the row carrying its name together with its first member's
            // gender. Requiring the gender keeps address lines that contain a comma out.
            if (gender && looksLikeHouseholdName(nameText)) {
                flush();
                current = { name: nameText, slots: [] };
                households.push(current);
                pendingSlot = memberText || null;
                continue;
            }

            if (!current)
                continue;

            // A gender run always starts a new member. The lines that follow it are the rest of
            // that member's wrapped name, never the start of the next member.
            if (gender) {
                flush();
                pendingSlot = memberText || null;
                continue;
            }
            if (memberText && pendingSlot)
                pendingSlot += ` ${memberText}`;
        }
    }
    flush();
    return households;
}

export function link(members: LcrMember[], households: HouseholdSlots[]): LcrImport {
    const taken = new Set<LcrMember>();
    const byFullName = new Map<string, LcrMember>();
    for (const member of members)
        byFullName.set(fullNameKey(member), member);

    const linked = households.map(household => {
        const householdWords = new Set(words(household.name));
        const placed: LcrMember[] = [];
        for (const slot of household.slots) {
            const member = matchSlot(slot, householdWords, members, taken, byFullName);
            if (!member)
                continue;
            taken.add(member);
            placed.push(member);
        }
        return { name: household.name, members: placed };
    });

    return { households: linked, unlinked: members.filter(member => !taken.has(member)) };
}

function matchSlot(
    slot: string,
    householdWords: Set<string>,
    members: LcrMember[],
    taken: Set<LcrMember>,
    byFullName: Map<string, LcrMember>,
): LcrMember | undefined {
    const key = normalize(slot);
    const printedSurname = slot.includes(',');

    // A surname printed in the slot means it differs from the household name, so trust it.
    if (printedSurname) {
        const direct = byFullName.get(key);
        if (direct && !taken.has(direct))
            return direct;
    }

    const available = members.filter(member => !taken.has(member));
    const candidates = available.filter(member => printedSurname
        ? fullNameKey(member) === key
        : words(member.last_name).some(word => householdWords.has(word)));

    const match = candidates.find(member => normalize(member.first_name) === key)
        ?? candidates.find(member => {
            const firstName = normalize(member.first_name);
            return firstName.startsWith(key) || key.startsWith(firstName);
        })
        ?? candidates.find(member => normalize(member.first_name).split(' ')[0] === key.split(' ')[0]);
    if (match)
        return match;

    // Given name only and its surname is not part of the household name: accept a slot that
    // names exactly one person, but never guess between several.
    if (!printedSurname) {
        const loose = available.filter(member => normalize(member.first_name) === key);
        if (loose.length === 1)
            return loose[0];
    }
    return undefined;
}

function isChromeRow(row: PdfRow): boolean {
    return row.runs.every(run => PAGE_CHROME.test(run.text.trim()) || COLUMN_HEADERS.test(run.text.trim()));
}

function chainRows(rows: PdfRow[], tolerance: number): PdfRow[][] {
    const chained: PdfRow[][] = [];
    let previousY: number | null = null;
    for (const row of rows) {
        const last = chained[chained.length - 1];
        if (last && previousY != null && Math.abs(row.y - previousY) <= tolerance)
            last.push(row);
        else
            chained.push([row]);
        previousY = row.y;
    }
    return chained;
}

function findRun(record: PdfRow[], predicate: (run: PdfTextRun) => boolean): PdfTextRun | undefined {
    for (const row of record) {
        const found = row.runs.find(predicate);
        if (found)
            return found;
    }
    return undefined;
}

/** Reads a cell split across lines, keeping the words on one line together. */
function readWrappedLines(record: PdfRow[], predicate: (run: PdfTextRun) => boolean): string {
    const lines = record.map(row => readBand(row, predicate)).filter(Boolean);
    return lines.join(' ').replace(/\s+/g, ' ').trim();
}

function readBand(row: PdfRow, predicate: (run: PdfTextRun) => boolean): string {
    return joinRuns(row.runs.filter(predicate)).replace(/\s+/g, ' ').trim();
}

function looksLikeHouseholdName(text: string): boolean {
    if (!text.includes(','))
        return false;
    const surname = text.split(',')[0].trim();
    return Boolean(surname) && !/^[\d\s.,-]+$/.test(surname);
}

function fullNameKey(member: LcrMember): string {
    return normalize(`${member.last_name} ${member.first_name}`);
}

function normalize(value: string): string {
    return value.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function words(value: string): string[] {
    return normalize(value).split(' ').filter(Boolean);
}
