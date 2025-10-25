
export function mapLangToLocale(lang: string): string {
    if (lang.includes('-')) return lang;
    switch (lang) {
        case 'de': return 'de-DE';
        case 'en': return 'en-US';
    }
    throw new Error(`no locale for "${lang}"`);
}
