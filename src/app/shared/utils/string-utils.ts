
const OVER_LENGTH_PENALTY = 0.25;
const EMPTY_SIMILARITY = 0.25;

export function getAvgSimilarity(words: string[], other: string) {
    if (!words.length) return other ? 0 : EMPTY_SIMILARITY;
    if (!other) return 0;
    const similarity = getWordSimilaritySum(words, other) / words.length;
    const wordsLength = words.reduce((sum, word) => sum + word.length, 0) + words.length - 1;
    const longer = Math.max(wordsLength, other.length);
    const diff = Math.abs(wordsLength - other.length);
    return Math.max(similarity - (diff / longer) * OVER_LENGTH_PENALTY, 0);
}


export function getWordSimilaritySum(words: string[], other: string) {
    if (!other) return 0;
    return words.reduce((sum, word) => sum + getWordSimilarity(word.toLowerCase(), other), 0);
}

export function getWordSimilarity(a: string, b: string) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    let wLength = a.length;
    let oLength = b.length;
    const L = Array.from(new Array(oLength + 1), () => Array(wLength + 1).fill(0));
    let result = 0;
    for (let i = 0; i <= oLength; i++) {
        for (let j = 0; j <= wLength; j++) {
            if (i == 0 || j == 0)
                L[i][j] = 0;
            else if (b[i - 1] == a[j - 1]) {
                L[i][j] = L[i - 1][j - 1] + 1;
                result = Math.max(result, L[i][j]);
            } else
                L[i][j] = 0;
        }
    }
    return result / Math.min(wLength, oLength);
}

export function highlightWords(text: string, wordsLower: string[]): [string, boolean][] {
    if (!text) return [];
    const result: [string, boolean][] = [[text, false]];
    for (const word of wordsLower) {
        for (let r = 0; r < result.length; r++) {
            const [res, highlight] = result[r];
            if (highlight) continue;
            const index = res.toLowerCase().indexOf(word);
            if (index >= 0) {
                const start = res.slice(0, index);
                const mid = res.slice(index, index + word.length);
                const end = res.slice(index + word.length);
                const insert: [string, boolean][] = [];
                if (start) insert.push([start, false]);
                insert.push([mid, true]);
                if (end) insert.push([end, false]);
                result.splice(r, 1, ...<any>insert);
                r += insert.length - 1;
            }
        }
    }
    for (let i = result.length - 1; i > 0; i--) {
        if (result[i - 1][1] && result[i][1]) {
            result[i - 1][0] += result[i][0];
            result.splice(i, 1);
        }
    }
    return result;
}