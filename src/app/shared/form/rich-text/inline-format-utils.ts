type Replacement = { pattern: RegExp; replace: string };

type InlineRule = {
    htmlPattern: RegExp;
    htmlReplace: string;
    textPattern: RegExp;
    textReplace: string;
};

const INLINE_RULES: InlineRule[] = [
    {
        htmlPattern: /\*\*([^\*\n]+?)\*\*/g,
        htmlReplace: '<strong>$1</strong>',
        textPattern: /(\*\*|__)(.*?)\1/g,
        textReplace: '$2'
    },
    {
        htmlPattern: /(?<!\*)_([^_\n]+?)_(?!\*)/g,
        htmlReplace: '<em>$1</em>',
        textPattern: /(\*|_)(.*?)\1/g,
        textReplace: '$2'
    },
    {
        htmlPattern: /~~([^~\n]+?)~~/g,
        htmlReplace: '<s>$1</s>',
        textPattern: /~~(.*?)~~/g,
        textReplace: '$1'
    },
    {
        htmlPattern: /<u>([^<\n]+?)<\/u>/g,
        htmlReplace: '<u>$1</u>',
        textPattern: /<u>(.*?)<\/u>/g,
        textReplace: '$1'
    },
    {
        htmlPattern: /`([^`\n]+?)`/g,
        htmlReplace: '<code>$1</code>',
        textPattern: /`(.*?)`/g,
        textReplace: '$1'
    },
    {
        htmlPattern: /\[([^\]]+)\]\(([^)]+)\)/gim,
        htmlReplace: '<a href="$2">$1</a>',
        textPattern: /\[([^\]]+)\]\(([^)]+)\)/g,
        textReplace: '$1'
    }
];

export function getInlineHtmlReplacements(): Replacement[] {
    return INLINE_RULES.map(rule => ({ pattern: rule.htmlPattern, replace: rule.htmlReplace }));
}

export function getInlinePlaintextReplacements(): Replacement[] {
    return INLINE_RULES.map(rule => ({ pattern: rule.textPattern, replace: rule.textReplace }));
}
