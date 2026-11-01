import { HouseholdService } from "@/modules/household/household.service";
import { Member } from "@/modules/member/member";
import { MemberViewService } from "@/modules/member/member-view.service";
import { ProfileService } from "@/modules/profile/profile.service";
import { PrivatePage } from "@/private/shared/private-page";
import { AsyncButton } from "@/shared/form/button/async/async-button";
import FileButton from "@/shared/form/button/file/file-button";
import LinkButton from "@/shared/form/button/link/link-button";
import Checkbox from "@/shared/form/checkbox/checkbox";
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { SupabaseService } from "@/shared/service/supabase.service";
import { FileType } from "@/shared/utils/file-utils";
import { xeffect } from "@/shared/utils/signal-utils";
import Collapse from "@/shared/widget/collapse/collapse";
import { Component, inject, signal } from "@angular/core";
import { parseLcrExport, type LcrImport } from "./lcr-import-parser";

type ImportMember = Pick<Member.Insert, 'first_name' | 'last_name' | 'gender'>
    & { duplicate?: boolean, import: boolean };

type ImportHousehold = {
    name: string;
    members: ImportMember[];
};

type ImportInfo = {
    households: ImportHousehold[];
    /** Members no household slot named. They are given a household of their own. */
    unlinked: ImportMember[];
};

@Component({
    selector: 'app-members-import-page',
    templateUrl: './members-import-page.html',
    imports: [LocalizePipe, FileButton, LinkButton, AsyncButton,
        Checkbox, Collapse],
    host: { class: 'page' },
    styles: [`
        .names-container {
            max-height: 50vh;
        }
        .household-row {
            position: sticky;
            top: 0;
            z-index: 1;
        }
    `]
})
export class MembersImportPage extends PrivatePage {

    private readonly supabase = inject(SupabaseService);
    private readonly householdService = inject(HouseholdService);
    protected readonly memberView = inject(MemberViewService);
    protected readonly profileService = inject(ProfileService);

    protected readonly selectAll = signal<boolean>(false);
    protected readonly importedMember = signal<ImportInfo | null>(null);
    protected readonly parsing = signal(false);
    protected readonly FileType = FileType;

    protected readonly count = signal(0);

    private readonly membersFile = signal<File | null>(null);
    private readonly householdsFile = signal<File | null>(null);

    constructor() {
        super();
        xeffect([this.membersFile, this.householdsFile], (membersFile, householdsFile) => {
            if (!membersFile || !householdsFile) return;
            void this.parse(membersFile, householdsFile);
        });
        xeffect([this.selectAll], selectAll => {
            const info = this.importedMember();
            if (!info) return;
            this.importedMember.set(this.mapMembers(info, member => ({
                ...member,
                import: member.duplicate ? member.import : selectAll,
            })));
            this.onImportChange();
        });
    }

    protected setMembersFile(file: File) {
        this.membersFile.set(file);
    }

    protected setHouseholdsFile(file: File) {
        this.householdsFile.set(file);
    }

    private async parse(membersFile: File, householdsFile: File) {
        this.parsing.set(true);
        try {
            const [parsed, existing] = await Promise.all([
                parseLcrExport(membersFile, householdsFile),
                this.supabase.sync.from('member').readAll().get(),
            ]);
            const existingNames = new Set(existing.map(member => duplicateKey(member)));
            this.importedMember.set(this.toImportInfo(parsed, existingNames));
            this.selectAll.set(false);
            this.onImportChange();
        } finally {
            this.parsing.set(false);
        }
    }

    private toImportInfo(parsed: LcrImport, existingNames: Set<string>): ImportInfo {
        const toMember = (member: { first_name: string, last_name: string, gender: Member.Gender }): ImportMember => ({
            first_name: member.first_name,
            last_name: member.last_name,
            gender: member.gender,
            duplicate: existingNames.has(duplicateKey(member)),
            import: false,
        });
        return {
            households: parsed.households.map(household => ({
                name: household.name,
                members: household.members.map(toMember),
            })),
            unlinked: parsed.unlinked.map(member => ({ ...toMember(member), import: true })),
        };
    }

    private mapMembers(info: ImportInfo, map: (member: ImportMember) => ImportMember): ImportInfo {
        return {
            households: info.households.map(household => ({
                ...household,
                members: household.members.map(map),
            })),
            unlinked: info.unlinked.map(map),
        };
    }

    protected toggleMember(householdIndex: number, memberIndex: number, value: boolean) {
        const info = this.importedMember();
        if (!info) return;
        const households = info.households.map((household, index) => index !== householdIndex
            ? household
            : {
                ...household,
                members: household.members.map((member, memberIdx) =>
                    memberIdx !== memberIndex ? member : { ...member, import: value }),
            });
        this.importedMember.set({ ...info, households });
        this.onImportChange();
    }

    protected toggleHousehold(householdIndex: number, value: boolean) {
        const info = this.importedMember();
        if (!info) return;
        const households = info.households.map((household, index) => index !== householdIndex
            ? household
            : {
                ...household,
                members: household.members.map(member =>
                    member.duplicate ? member : { ...member, import: value }),
            });
        this.importedMember.set({ ...info, households });
        this.onImportChange();
    }

    protected toggleUnlinked(memberIndex: number, value: boolean) {
        const info = this.importedMember();
        if (!info) return;
        this.importedMember.set({
            ...info,
            unlinked: info.unlinked.map((member, index) =>
                index !== memberIndex ? member : { ...member, import: value }),
        });
        this.onImportChange();
    }

    protected isHouseholdSelected(household: ImportHousehold): boolean {
        const selectable = household.members.filter(member => !member.duplicate);
        return selectable.length > 0 && selectable.every(member => member.import);
    }

    protected selectedMembers(household: ImportHousehold): number {
        return household.members.filter(member => member.import && !member.duplicate).length;
    }

    protected selectableMembers(household: ImportHousehold): number {
        return household.members.filter(member => !member.duplicate).length;
    }

    protected get parsedNothing(): boolean {
        const info = this.importedMember();
        return Boolean(info) && !this.count() && info!.households.every(household => !household.members.length)
            && !info!.unlinked.length;
    }

    protected hasSelectable(household: ImportHousehold): boolean {
        return household.members.some(member => !member.duplicate);
    }

    protected onImportChange() {
        const info = this.importedMember();
        if (!info) {
            this.count.set(0);
            return;
        }
        const inHouseholds = info.households
            .reduce((sum, household) => sum + this.selectedMembers(household), 0);
        const unlinked = info.unlinked.filter(member => member.import && !member.duplicate).length;
        this.count.set(inHouseholds + unlinked);
    }

    protected save = async () => {
        const info = this.importedMember();
        if (!info) return;
        const profile = await this.profileService.own.asPromise();

        const selectedHouseholds = info.households
            .map(household => ({
                name: household.name,
                members: household.members.filter(member => member.import && !member.duplicate),
            }))
            .filter(household => household.members.length);
        const selectedUnlinked = info.unlinked.filter(member => member.import && !member.duplicate);

        const singletonName = (member: ImportMember) => this.householdService.singletonName(member);
        const householdsByName = await this.householdService.findOrCreateMany(profile.unit, [
            ...selectedHouseholds.map(household => household.name),
            ...selectedUnlinked.map(singletonName),
        ]);

        let nextId = await this.supabase.sync.from('member').findLargestId() ?? 0;
        const inserts: Member.Insert[] = [];
        const addMember = (member: ImportMember, householdName: string) => {
            const household = householdsByName.get(this.householdService.nameKey(householdName));
            if (!household) return;
            inserts.push({
                first_name: member.first_name,
                last_name: member.last_name,
                gender: member.gender,
                household: household.id,
                unit: profile.unit,
                id: ++nextId,
            });
        };

        for (const household of selectedHouseholds)
            for (const member of household.members)
                addMember(member, household.name);
        for (const member of selectedUnlinked)
            addMember(member, singletonName(member));

        if (!inserts.length)
            return;
        await this.supabase.sync.from('member').insert(inserts);
        this.closePage?.();
    }
}

function duplicateKey(member: { first_name: string, last_name?: string | null }): string {
    return `${member.last_name?.toLowerCase().trim() ?? ''}|${member.first_name.toLowerCase().trim()}`;
}
