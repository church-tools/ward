import type { SelectOption } from '@/shared/form/select/select-utils';
import { LanguageService, type SupportedLanguage } from '@/shared/language/language.service';
import type { PaletteColor } from '@/shared/utils/color-utils';
import { asyncComputed, xcomputed } from '@/shared/utils/signal-utils';
import { inject, Injectable } from '@angular/core';
import { HYMN_INFO_BY_NUMBER, type HymnNumber } from './hymn-numbers';
import { HYMN_TOPICS, HymnTopic } from './hymn-topics';

type HymnCatalog = {
    titles: Readonly<Record<number, string>>;
    topics: Readonly<Record<string, string>>;
};

export type HymnOptionRow = {
    number: HymnNumber;
    title: string;
    topics: readonly {
        key: HymnTopic;
        label: string;
        color: PaletteColor;
    }[];
};

@Injectable({ providedIn: 'root' })
export class HymnTitleService {

    private readonly catalogPromisesByLanguage: Partial<Record<SupportedLanguage, Promise<HymnCatalog>>> = {};

    private readonly language = inject(LanguageService);


    readonly catalog = asyncComputed([this.language.current], language => this.getCatalog(language));

    readonly localizer = xcomputed([this.catalog], (catalog: HymnCatalog) => {
        if (!catalog) return (key: number) => String(key);
        const { titles } = catalog;
        return (key: number) => titles[key as number] ?? String(key);
    });

    async getTitle(number: number, language: SupportedLanguage): Promise<string> {
        const { titles } = await this.getCatalog(language);
        return titles[number];
    }

    async getSelectOptions(language: SupportedLanguage): Promise<readonly SelectOption<number>[]> {
        const { titles, topics: topicLabels } = await this.getCatalog(language);
        const options = Object.entries(HYMN_INFO_BY_NUMBER).map(([numberString, { topics }]) => {
            const number = +numberString as HymnNumber;
            const title = titles[number];
            const topicInfos = topics.map(topic => ({
                key: topic,
                label: topicLabels[topic],
                color: HYMN_TOPICS[topic],
            }));
            const searchText = `${number} - ${title} ${topicInfos.map(topic => topic.label).join(' ')}`.trim();
            return {
                value: number,
                view: searchText,
                row: {
                    number,
                    title,
                    topics: topicInfos,
                } satisfies HymnOptionRow,
            } as SelectOption<number>;
        });
        return options;
    }

    getSlug(number: HymnNumber): string {
        return HYMN_INFO_BY_NUMBER[number].slug;
    }

    getWebUrl(number: HymnNumber): string {
        return `https://www.churchofjesuschrist.org/media/music/songs/${this.getSlug(number)}`;
    }

    toDisplayValue(number: number | null, language: SupportedLanguage): string {
        if (number == null)
            return '';
        const title = this.getTitle(number, language);
        return title ? `${number} - ${title}` : String(number);
    }

    private async getCatalog(language: SupportedLanguage): Promise<HymnCatalog> {
        return this.catalogPromisesByLanguage[language] ??= (() => {
            switch (language) {
                case 'en': return import('./hymn-title-catalog.en').then(m => ({ titles: m.HYMN_TITLES, topics: m.HYMN_TOPICS }));
                case 'de': return import('./hymn-title-catalog.de').then(m => ({ titles: m.HYMN_TITLES, topics: m.HYMN_TOPICS }));
            }
        })();
    }
}