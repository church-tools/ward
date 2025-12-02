import { Component, signal } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import { Member } from "../../../modules/member/member";
import FileButtonComponent from "../../../shared/form/button/file/file-button";
import LinkButtonComponent from "../../../shared/form/button/link/link-button";
import CheckboxComponent from "../../../shared/form/checkbox/checkbox";
import { IconComponent } from "../../../shared/icon/icon";
import { extractTextFromPdf } from "../../../shared/utils/pdf-utils";
import CollapseComponent from "../../../shared/widget/collapse/collapse";

type ImportName = Pick<Member.Insert, 'first_name' | 'last_name'>;

@Component({
    selector: 'app-members-import',
    template: `
        <div class="column gap-4">
            <h1 class="me-12">
                <app-icon icon="archive_arrow_back" size="lg"/>
                {{ 'MEMBERS_IMPORT.TITLE' | translate }}
            </h1>
            <p>
                {{ 'MEMBERS_IMPORT.INSTRUCTIONS_1' | translate }}
            </p>
            <div class="row gap-4 center-content">
                <app-link-button href="https://lcr.churchofjesuschrist.org/records/member-list"
                    icon="open"
                    [outside]="true" [newTab]="true" type="secondary">
                    <span outside>{{ 'MEMBERS_PAGE.LCR_MEMBER_LIST' | translate }}</span>
                </app-link-button>
                <app-file-button type="secondary"
                    (onUpload)="importPdf($event)">
                    {{ 'MEMBERS_IMPORT.UPLOAD_BUTTON' | translate }}
                </app-file-button>
            </div>
            <app-collapse [show]="importedNames().length > 0">
                <div class="column gap-1">
                    @for (name of importedNames(); track name) {
                        <div class="row items-center gap-1">
                            <app-checkbox label="{{ name.first_name }} {{ name.last_name }}"/>
                        </div>
                    }
                </div>
            </app-collapse>
        </div>
    `,
    imports: [TranslateModule, FileButtonComponent, LinkButtonComponent,
        IconComponent, CheckboxComponent, CollapseComponent],
    host: { class: 'page' },
})
export class MembersImportComponent {

    protected readonly importedNames = signal<ImportName[]>([]);

    protected async importPdf(file: File) {
        
        const text = await extractTextFromPdf(file);
        const names = this.extractNames(text);
        this.importedNames.set(names);
    }

    private extractNames(pdfText: string): ImportName[] {
        if (!pdfText?.trim()) {
            return [];
        }

        const headerRegex = /^(name|gender|age|birth ?date|phone(?: number)?|mobile number|e-?mail)$/i;
        const nameRegex = /^[\p{L}\s.'\-\u2019]+$/u;
        const seen = new Set<string>();

        return pdfText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !headerRegex.test(line))
            .map((line) => line.match(/^([^,]+),\s*(.+)$/))
            .filter((match): match is RegExpMatchArray => !!match)
            .map(([, last_name, first_name]) => ({ first_name, last_name }))
            .filter(({ first_name, last_name }) => nameRegex.test(first_name) && nameRegex.test(last_name))
            .filter(({ first_name, last_name }) => {
                const key = `${last_name}|${first_name}`.toLowerCase();
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
    }
}
