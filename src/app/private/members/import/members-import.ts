import { Component } from "@angular/core";
import { Member } from "../../../modules/member/member";
import FileButtonComponent from "../../../shared/form/button/file/file-button";
import { extractTextFromPdf } from "../../../shared/utils/pdf-utils";

@Component({
    selector: 'app-members-import',
    template: `
        <h1>Mitglieder aus LCR importieren</h1>
        <app-file-button type="secondary"
            (onUpload)="showPdfImport($event)">
            PDF aus LCR importieren
        </app-file-button>
    `,
    imports: [FileButtonComponent],
    host: { class: 'page wide' },
})
export class MembersImportComponent {


    protected async showPdfImport(file: File) {
        
        const text = await extractTextFromPdf(file);
        console.log("Extracted text:", text);
        // Further processing of the extracted text can be done here
    }

    private extractNames(pdfText: string): Pick<Member.Insert, 'first_name' | 'last_name'>[] {
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
