
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

export function levenshteinDistance(a: string, b: string): number {
    if (a.length < b.length) {
        let tmp = b;
        b = a;
        a = tmp;
    }
    if (b.length === 0) return a.length;
    if (a.length <= 32) return myers32(a, b);
    return myersX(a, b);
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
                result.splice(r, 1, ...insert);
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

const PEQ = new Uint32Array(0x10000);

function myers32(a: string, b: string) {
    const n = a.length;
    const m = b.length;
    const lst = 1 << (n - 1);
    let pv = -1;
    let mv = 0;
    let sc = n;
    let i = n;
    while (i--) PEQ[a.charCodeAt(i)] |= 1 << i;
    for (i = 0; i < m; i++) {
        let eq = PEQ[b.charCodeAt(i)];
        const xv = eq | mv;
        eq |= ((eq & pv) + pv) ^ pv;
        mv |= ~(eq | pv);
        pv &= eq;
        if (mv & lst) {
            sc++;
        }
        if (pv & lst) {
            sc--;
        }
        mv = (mv << 1) | 1;
        pv = (pv << 1) | ~(xv | mv);
        mv &= xv;
    }
    i = n;
    while (i--) PEQ[a.charCodeAt(i)] = 0;
    return sc;
}

function myersX(b: string, a: string) {
    const n = a.length;
    const m = b.length;
    const mhc = [];
    const phc = [];
    const hsize = Math.ceil(n / 32);
    const vsize = Math.ceil(m / 32);
    for (let i = 0; i < hsize; i++) {
        phc[i] = -1;
        mhc[i] = 0;
    }
    let j = 0;
    for (; j < vsize - 1; j++) {
        let mv_1 = 0;
        let pv_1 = -1;
        let start_1 = j * 32;
        let vlen_1 = Math.min(32, m) + start_1;
        for (let k = start_1; k < vlen_1; k++)
            PEQ[b.charCodeAt(k)] |= 1 << k;
        for (let i = 0; i < n; i++) {
            let eq = PEQ[a.charCodeAt(i)];
            let pb = (phc[(i / 32) | 0] >>> i) & 1;
            let mb = (mhc[(i / 32) | 0] >>> i) & 1;
            let xv = eq | mv_1;
            let xh = ((((eq | mb) & pv_1) + pv_1) ^ pv_1) | eq | mb;
            let ph = mv_1 | ~(xh | pv_1);
            let mh = pv_1 & xh;
            if ((ph >>> 31) ^ pb) {
                phc[(i / 32) | 0] ^= 1 << i;
            }
            if ((mh >>> 31) ^ mb) {
                mhc[(i / 32) | 0] ^= 1 << i;
            }
            ph = (ph << 1) | pb;
            mh = (mh << 1) | mb;
            pv_1 = mh | ~(xv | ph);
            mv_1 = ph & xv;
        }
        for (var k = start_1; k < vlen_1; k++)
            PEQ[b.charCodeAt(k)] = 0;
    }
    let mv = 0;
    let pv = -1;
    const start = j * 32;
    const vlen = Math.min(32, m - start) + start;
    for (let k = start; k < vlen; k++)
        PEQ[b.charCodeAt(k)] |= 1 << k;
    let score = m;
    for (let i = 0; i < n; i++) {
        const eq = PEQ[a.charCodeAt(i)];
        const pb = (phc[(i / 32) | 0] >>> i) & 1;
        const mb = (mhc[(i / 32) | 0] >>> i) & 1;
        const xv = eq | mv;
        const xh = ((((eq | mb) & pv) + pv) ^ pv) | eq | mb;
        let ph = mv | ~(xh | pv);
        let mh = pv & xh;
        score += (ph >>> (m - 1)) & 1;
        score -= (mh >>> (m - 1)) & 1;
        if ((ph >>> 31) ^ pb) {
            phc[(i / 32) | 0] ^= 1 << i;
        }
        if ((mh >>> 31) ^ mb) {
            mhc[(i / 32) | 0] ^= 1 << i;
        }
        ph = (ph << 1) | pb;
        mh = (mh << 1) | mb;
        pv = mh | ~(xv | ph);
        mv = ph & xv;
    }
    for (let k = start; k < vlen; k++)
        PEQ[b.charCodeAt(k)] = 0;
    return score;
}
