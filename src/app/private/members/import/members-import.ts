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

type ImportName = Pick<Member.Insert, 'first_name' | 'last_name'>
    & { duplicate?: boolean, import: WritableSignal<boolean | null> };

@Component({
    selector: 'app-members-import',
    templateUrl: './members-import.html',
    imports: [TranslateModule, FileButtonComponent, LinkButtonComponent, AsyncButtonComponent,
    IconComponent, CheckboxComponent, CollapseComponent, TagComponent],
    host: { class: 'page' },
    styleUrl: './members-import.scss',
})
export class MembersImportComponent {

    private readonly supabase = inject(SupabaseService);

    protected readonly importedNames = signal<ImportName[]>([]);
    protected readonly FileType = FileType;

    protected readonly tagOptions = [
        { value: 'new', view: 'New', color: 'green' },
        { value: 'existing', view: 'Existing', color: 'blue' },
        { value: 'duplicate', view: 'Duplicate', color: 'red' },
    ];

    protected async importPdf(file: File) {
        const [text, existing] = await Promise.all([
            extractTextFromPdf(file),
            this.supabase.sync.from('member').readAll().get(),
        ]);
        const existingNames = new Set(existing.map(m => `${m.last_name?.toLowerCase()}|${m.first_name.toLowerCase()}`));
        const names = this.extractNames(text);
        for (const name of names) {
            name.duplicate = existingNames.has(`${name.last_name?.toLowerCase()}|${name.first_name.toLowerCase()}`);

        }
        this.importedNames.set(names);
    }

    protected save = async () => {

    }

    private extractNames(pdfText: string): ImportName[] {
        if (!pdfText?.trim()) return [];
        const headerRegex = /^(name|gender|age|birth ?date|phone(?: number)?|mobile number|e-?mail)$/i;
        const nameRegex = /^[\p{L}\s.'\-\u2019]+$/u;
        const seen = new Set<string>();
        return pdfText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !headerRegex.test(line))
            .map((line) => line.match(/^([^,]+),\s*(.+)$/))
            .filter((match): match is RegExpMatchArray => !!match)
            .map(([, last_name, first_name]) => ({ first_name, last_name, import: signal(null) }))
            .filter(({ first_name, last_name }) => nameRegex.test(first_name) && nameRegex.test(last_name))
            .filter(({ first_name, last_name }) => {
                const key = `${last_name}|${first_name}`.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }
}
