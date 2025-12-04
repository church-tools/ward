import { Component, inject, signal, WritableSignal } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import { Member } from "../../../modules/member/member";
import AsyncButtonComponent from "../../../shared/form/button/async/async-button";
import FileButtonComponent from "../../../shared/form/button/file/file-button";
import LinkButtonComponent from "../../../shared/form/button/link/link-button";
import CheckboxComponent from "../../../shared/form/checkbox/checkbox";
import { IconComponent } from "../../../shared/icon/icon";
import { SupabaseService } from "../../../shared/service/supabase.service";
import { FileType } from "../../../shared/utils/file-utils";
import { extractTextFromPdf } from "../../../shared/utils/pdf-utils";
import CollapseComponent from "../../../shared/widget/collapse/collapse";
import { TagComponent } from "../../../shared/widget/tag/tag";
import { MemberViewService } from "../../../modules/member/member-view.service";
import { xcomputed,xeffect, } from "../../../shared/utils/signal-utils";
import { ProfileService } from "../../../modules/profile/profile.service";
import { PopoverPage } from "../../../shared/widget/popover/popover";

type ImportInfo = Pick<Member.Insert, 'first_name' | 'last_name' | 'gender'>
    & { duplicate?: boolean, import: WritableSignal<boolean | null> };

@Component({
    selector: 'app-members-import',
    templateUrl: './members-import.html',
    imports: [TranslateModule, FileButtonComponent, LinkButtonComponent, AsyncButtonComponent,
        IconComponent, CheckboxComponent, CollapseComponent, TagComponent],
    host: { class: 'page' },
    styleUrl: './members-import.scss',
})
export class MembersImportComponent extends PopoverPage {

    private readonly supabase = inject(SupabaseService);
    protected readonly memberView = inject(MemberViewService);
    protected readonly profileService = inject(ProfileService);

    protected readonly selectAll = signal<boolean | null>(null);
    protected readonly importedMember = signal<ImportInfo[]>([]);
    protected readonly FileType = FileType;

    protected readonly tagOptions = [
        { value: 'new', view: 'New', color: 'green' },
        { value: 'existing', view: 'Existing', color: 'blue' },
        { value: 'duplicate', view: 'Duplicate', color: 'red' },
    ];
    
    protected readonly count = xcomputed([this.importedMember],
        members => members.filter(m => m.import()).length);


    constructor() {
        super();
        xeffect([this.selectAll], selectAll => {
            for (const member of this.importedMember())
                member.import.set(selectAll);
        });
    }

    protected async importPdf(file: File) {
        const [text, existing] = await Promise.all([
            extractTextFromPdf(file),
            this.supabase.sync.from('member').readAll().get(),
        ]);
        const existingNames = new Set(existing.map(m => `${m.last_name?.toLowerCase()}|${m.first_name.toLowerCase()}`));
        const members = this.extractNames(text);
        for (const name of members)
            name.duplicate = existingNames.has(`${name.last_name?.toLowerCase()}|${name.first_name.toLowerCase()}`);
        this.importedMember.set(members);
    }

    protected save = async () => {
        const selected = this.importedMember().filter(m => m.import() && !m.duplicate);
        const unit = (await this.profileService.own.asPromise()).unit;
        const nextId = await this.supabase.sync.from('member').findLargestId() ?? 0;
        await this.supabase.sync.from('member')
            .insert(selected.map((member, i) => ({
                first_name: member.first_name,
                last_name: member.last_name,
                gender: member.gender,
                unit,
                id: nextId + i + 1
            })));
        this.closePopup();
    }

    private extractNames(pdfText: string): ImportInfo[] {
        if (!pdfText?.trim()) return [];
        const headerRegex = /^(name|gender|age|birth ?date|phone(?: number)?|mobile number|e-?mail)$/i;
        const results: ImportInfo[] = [];
        const lines = pdfText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !headerRegex.test(line));
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^([^,]+),\s*(.+)$/);
            if (!match) continue;
            const [, last_name, first_name] = match;
            if (first_name.startsWith('Inc. All rights reserved')) continue;
            const key = `${last_name}|${first_name}`.toLowerCase();
            const gender: Member.Gender = lines[i + 1]?.trim() === 'M' ? 'male' : 'female';
            results.push({
                first_name,
                last_name,
                gender,
                import: signal(null)
            });
            i++;
        }
        return results;
    }
}
