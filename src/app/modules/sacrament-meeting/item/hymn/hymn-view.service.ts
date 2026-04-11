import { ViewService } from "@/modules/shared/view.service";
import { SupportedLanguage } from "@/shared/service/language.service";
import { inject, Injectable } from "@angular/core";
import type { Hymn } from "./hymn";
import { HymnTitleService } from './hymn-title.service';

@Injectable({ providedIn: 'root' })
export class HymnViewService extends ViewService<'hymn'> {

    readonly icon = 'music_note_1';

    private readonly titleService = inject(HymnTitleService);

    constructor() {
        super('hymn');
    }

    toString(item: Hymn.Row): string {
        return '';
    }

    getSelectOptions(language: SupportedLanguage) {
        return this.titleService.getSelectOptions(language);
    }
}