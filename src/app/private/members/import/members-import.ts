import { Component } from "@angular/core";
import { Member } from "../../../modules/member/member";

@Component({
    selector: 'app-members-import',
    template: `
    `,
})
export class MembersImportComponent {



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
