import {
    PDFArray,
    PDFContext,
    PDFDict,
    PDFDocument,
    PDFName,
    PDFPage,
    PDFRawStream,
    PDFRef,
    PDFStream,
    decodePDFRawStream,
} from 'pdf-lib';

const SAFE_TEXT_DECODER = typeof TextDecoder !== 'undefined'
    ? new TextDecoder('utf-8')
    : undefined;

const UTF16_DECODER = typeof TextDecoder !== 'undefined'
    ? new TextDecoder('utf-16be')
    : undefined;

const TJ_SPACE_THRESHOLD = 250;
const TD_HORIZONTAL_SPACE_THRESHOLD = 40;
const TD_VERTICAL_NEWLINE_THRESHOLD = 1;

type FontInfo = {
    name: string;
    unicodeMap?: ToUnicodeMap;
};

type ToUnicodeMap = {
    map: Map<string, string>;
    codeLengths: number[];
};

type TextState = {
    currentFont?: FontInfo;
};

type ContentToken =
    | { type: 'operator'; value: string }
    | { type: 'name'; value: string }
    | { type: 'number'; value: number }
    | { type: 'string'; value: Uint8Array }
    | { type: 'hex'; value: Uint8Array }
    | { type: 'array'; value: ArrayElement[] };

type NameToken = Extract<ContentToken, { type: 'name' }>;
type StringLikeToken = Extract<ContentToken, { type: 'string' | 'hex' }>;
type ArrayToken = Extract<ContentToken, { type: 'array' }>;

type ArrayElement =
    | { type: 'string' | 'hex'; value: Uint8Array }
    | { type: 'number'; value: number };

export async function extractTextFromPdf(file: File): Promise<string> {
    if (!file) {
        return '';
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const context = pdf.context;
        const pageTexts: string[] = [];

        for (const page of pdf.getPages()) {
            const pageText = extractTextFromPage(page, context);
            if (pageText) {
                pageTexts.push(pageText);
            }
        }

        return pageTexts.join('\n\n').trim();
    } catch (error) {
        console.error('Failed to extract text from PDF', error);
        return '';
    }
}

function extractTextFromPage(page: PDFPage, context: PDFContext): string {
    const contents = page.node.get(PDFName.of('Contents'));
    const streams = collectContentStreams(contents, context);
    if (!streams.length) {
        return '';
    }

    const fonts = buildFontMap(page, context);
    const state: TextState = {};
    const chunks: string[] = [];

    for (const stream of streams) {
        const rawContent = decodeStream(stream);
        if (!rawContent) {
            continue;
        }

        const tokens = tokenizeContent(rawContent);
        const segment = extractSegmentsFromTokens(tokens, fonts, state);
        if (segment.length) {
            chunks.push(...segment);
        }
    }

    return normalizeChunks(chunks);
}

function collectContentStreams(target: unknown, context: PDFContext): PDFRawStream[] {
    if (!target) {
        return [];
    }

    if (target instanceof PDFRawStream) {
        return [target];
    }

    if (target instanceof PDFRef) {
        const resolved = context.lookup(target);
        return collectContentStreams(resolved, context);
    }

    if (target instanceof PDFArray) {
        const streams: PDFRawStream[] = [];
        for (let idx = 0; idx < target.size(); idx++) {
            const entry = target.lookup(idx);
            if (entry) {
                streams.push(...collectContentStreams(entry, context));
            }
        }
        return streams;
    }

    if (target instanceof PDFStream) {
        return [PDFRawStream.of(target.dict, target.getContents())];
    }

    return [];
}

function decodeStream(stream: PDFRawStream): string {
    try {
        const decoded = decodePDFRawStream(stream).decode();
        return bytesToAscii(decoded);
    } catch {
        try {
            return bytesToAscii(stream.asUint8Array());
        } catch {
            return '';
        }
    }
}

function buildFontMap(page: PDFPage, context: PDFContext): Record<string, FontInfo> {
    const fonts: Record<string, FontInfo> = {};
    const resources = page.node.Resources();
    if (!resources) {
        return fonts;
    }

    const fontDict = resources.lookupMaybe(PDFName.Font, PDFDict);
    if (!fontDict) {
        return fonts;
    }

    const entries = fontDict.entries();
    for (let idx = 0; idx < entries.length; idx++) {
        const [fontName, fontValue] = entries[idx];
        const resolvedFont = dereferenceDict(fontValue, context);
        if (!resolvedFont) {
            continue;
        }

        const toUnicodeStream =
            resolvedFont.lookupMaybe(PDFName.of('ToUnicode'), PDFStream) ||
            resolvedFont.lookupMaybe(PDFName.of('ToUnicode'), PDFRef);
        const unicodeMap = parseToUnicodeMap(toUnicodeStream, context);
        fonts[fontName.asString()] = {
            name: fontName.asString(),
            unicodeMap,
        };
    }

    return fonts;
}

function dereferenceDict(target: unknown, context: PDFContext): PDFDict | undefined {
    if (!target) {
        return undefined;
    }

    if (target instanceof PDFDict) {
        return target;
    }

    if (target instanceof PDFRef) {
        const resolved = context.lookup(target);
        return dereferenceDict(resolved, context);
    }

    return undefined;
}

function parseToUnicodeMap(target: unknown, context: PDFContext): ToUnicodeMap | undefined {
    const rawStream = getRawStream(target, context);
    if (!rawStream) {
        return undefined;
    }

    const content = decodeStream(rawStream);
    if (!content) {
        return undefined;
    }

    return parseToUnicodeCMap(content);
}

function getRawStream(target: unknown, context: PDFContext): PDFRawStream | undefined {
    if (!target) {
        return undefined;
    }

    if (target instanceof PDFRawStream) {
        return target;
    }

    if (target instanceof PDFStream) {
        return PDFRawStream.of(target.dict, target.getContents());
    }

    if (target instanceof PDFRef) {
        const resolved = context.lookup(target);
        return getRawStream(resolved, context);
    }

    return undefined;
}

function parseToUnicodeCMap(content: string): ToUnicodeMap | undefined {
    const map = new Map<string, string>();
    const codeLengths = new Set<number>();

    const bfcharRegex = /(\d+)\s+beginbfchar([\s\S]*?)endbfchar/g;
    let match: RegExpExecArray | null;
    while ((match = bfcharRegex.exec(content)) !== null) {
        const body = match[2];
        const pairRegex = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g;
        let pair: RegExpExecArray | null;
        while ((pair = pairRegex.exec(body)) !== null) {
            const src = normalizeHex(pair[1]);
            const dst = normalizeHex(pair[2]);
            const unicode = unicodeHexToString(dst);
            if (unicode) {
                map.set(src, unicode);
                codeLengths.add(src.length / 2);
            }
        }
    }

    const bfrangeRegex = /(\d+)\s+beginbfrange([\s\S]*?)endbfrange/g;
    while ((match = bfrangeRegex.exec(content)) !== null) {
        const body = match[2];
        const lineRegex = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+(<([0-9A-Fa-f]+)>|\[(.*?)\])/g;
        let line: RegExpExecArray | null;
        while ((line = lineRegex.exec(body)) !== null) {
            const start = parseInt(line[1], 16);
            const end = parseInt(line[2], 16);
            if (Number.isNaN(start) || Number.isNaN(end)) {
                continue;
            }
            const codeLength = Math.max(1, Math.round(line[1].length / 2));
            codeLengths.add(codeLength);

            const destination = line[3];
            if (!destination) {
                continue;
            }

            if (destination.startsWith('<')) {
                const baseHex = normalizeHex(line[4] || '');
                let base = parseInt(baseHex || '0', 16);
                if (Number.isNaN(base)) {
                    continue;
                }

                for (let value = start; value <= end; value++) {
                    const unicode = String.fromCodePoint(base);
                    const srcHex = padHex(value, codeLength);
                    map.set(srcHex, unicode);
                    base++;
                }
            } else if (destination.startsWith('[')) {
                const targets = (line[5] || '').match(/<([0-9A-Fa-f]+)>/g) || [];
                for (let offset = 0; offset < targets.length && start + offset <= end; offset++) {
                    const cleaned = targets[offset].replace(/[<>]/g, '');
                    const unicode = unicodeHexToString(cleaned);
                    if (!unicode) {
                        continue;
                    }
                    const srcHex = padHex(start + offset, codeLength);
                    map.set(srcHex, unicode);
                }
            }
        }
    }

    if (!map.size) {
        return undefined;
    }

    return {
        map,
        codeLengths: Array.from(codeLengths).sort((a, b) => b - a),
    };
}

function tokenizeContent(content: string): ContentToken[] {
    const tokens: ContentToken[] = [];
    let idx = 0;
    while (idx < content.length) {
        idx = skipWhitespace(content, idx);
        if (idx >= content.length) {
            break;
        }

        const char = content[idx];

        if (char === '%') {
            idx = skipComment(content, idx + 1);
            continue;
        }

        if (char === '/') {
            const { token, nextIndex } = readName(content, idx);
            tokens.push(token);
            idx = nextIndex;
            continue;
        }

        if (char === '(') {
            const { token, nextIndex } = readLiteralString(content, idx);
            tokens.push(token);
            idx = nextIndex;
            continue;
        }

        if (char === '<') {
            if (content[idx + 1] === '<') {
                tokens.push({ type: 'operator', value: '<<' });
                idx += 2;
                continue;
            }
            const { token, nextIndex } = readHexString(content, idx);
            tokens.push(token);
            idx = nextIndex;
            continue;
        }

        if (char === '[') {
            const { token, nextIndex } = readArray(content, idx);
            tokens.push(token);
            idx = nextIndex;
            continue;
        }

        if (char === ']') {
            tokens.push({ type: 'operator', value: ']' });
            idx++;
            continue;
        }

        if (char === '\'' || char === '"') {
            tokens.push({ type: 'operator', value: char });
            idx++;
            continue;
        }

        const { token, nextIndex } = readNumberOrOperator(content, idx);
        if (token) tokens.push(token);
        idx = nextIndex;
    }

    return tokens;
}

function extractSegmentsFromTokens(
    tokens: ContentToken[],
    fonts: Record<string, FontInfo>,
    state: TextState,
): string[] {
    const segments: string[] = [];
    let currentFont = state.currentFont;

    for (let idx = 0; idx < tokens.length; idx++) {
        const token = tokens[idx];
        if (token.type !== 'operator') {
            continue;
        }

        switch (token.value) {
            case 'Tf': {
                const fontToken = findPreviousName(tokens, idx - 1);
                if (fontToken && fontToken.type === 'name') {
                    currentFont = fonts[fontToken.value];
                }
                break;
            }
            case 'Tj': {
                const operand = findPreviousStringToken(tokens, idx - 1);
                const text = decodeTokenBytes(operand, currentFont);
                if (text) {
                    segments.push(text);
                }
                break;
            }
            case '\'':
            case '"': {
                const operand = findPreviousStringToken(tokens, idx - 1);
                const text = decodeTokenBytes(operand, currentFont);
                if (text) {
                    appendLineBreak(segments);
                    segments.push(text);
                }
                break;
            }
            case 'TJ': {
                const arrayToken = findPreviousArray(tokens, idx - 1);
                const text = decodeArrayToken(arrayToken, currentFont);
                if (text) {
                    segments.push(text);
                }
                break;
            }
            case 'Td':
            case 'TD': {
                const [tx, ty] = findPreviousNumbers(tokens, idx - 1, 2);
                if (typeof tx === 'number' && typeof ty === 'number') {
                    if (Math.abs(ty) > TD_VERTICAL_NEWLINE_THRESHOLD) {
                        appendLineBreak(segments);
                    } else if (
                        Math.abs(tx) > TD_HORIZONTAL_SPACE_THRESHOLD &&
                        segments.length &&
                        segments[segments.length - 1] !== '\n'
                    ) {
                        segments.push(' ');
                    }
                }
                break;
            }
            case 'T*':
            case 'Tm': {
                appendLineBreak(segments);
                break;
            }
            case 'BT':
                appendLineBreak(segments);
                break;
        }
    }

    state.currentFont = currentFont;
    return segments;
}

function findPreviousName(tokens: ContentToken[], start: number): NameToken | undefined {
    for (let idx = start; idx >= 0; idx--) {
        const token = tokens[idx];
        if (token.type === 'name') {
            return token;
        }
        if (token.type === 'operator') {
            break;
        }
    }
    return undefined;
}

function findPreviousStringToken(tokens: ContentToken[], start: number): StringLikeToken | undefined {
    for (let idx = start; idx >= 0; idx--) {
        const token = tokens[idx];
        if (token.type === 'string' || token.type === 'hex') {
            return token;
        }
        if (token.type === 'operator' && token.value !== 'TJ') {
            break;
        }
    }
    return undefined;
}

function findPreviousArray(tokens: ContentToken[], start: number): ArrayToken | undefined {
    for (let idx = start; idx >= 0; idx--) {
        const token = tokens[idx];
        if (token.type === 'array') {
            return token;
        }
        if (token.type === 'operator') {
            break;
        }
    }
    return undefined;
}

function findPreviousNumbers(tokens: ContentToken[], start: number, count: number): number[] {
    const values: number[] = [];
    for (let idx = start; idx >= 0 && values.length < count; idx--) {
        const token = tokens[idx];
        if (token.type === 'number') {
            values.unshift(token.value);
            continue;
        }
        if (token.type === 'operator') {
            break;
        }
    }
    return values;
}

function appendLineBreak(segments: string[]): void {
    if (!segments.length || segments[segments.length - 1] === '\n') {
        return;
    }
    segments.push('\n');
}

function decodeArrayToken(token: ContentToken | undefined, font?: FontInfo): string {
    if (!token || token.type !== 'array') {
        return '';
    }

    const parts: string[] = [];
    for (let idx = 0; idx < token.value.length; idx++) {
        const element = token.value[idx];
        if (element.type === 'number') {
            if (element.value <= -TJ_SPACE_THRESHOLD) {
                parts.push(' ');
            }
            continue;
        }
        const text = decodeBytes(element.value, font);
        if (text) {
            parts.push(text);
        }
    }

    return parts.join('');
}

function decodeTokenBytes(token: StringLikeToken | undefined, font?: FontInfo): string {
    if (!token) {
        return '';
    }

    return decodeBytes(token.value, font);
}

function decodeBytes(bytes: Uint8Array, font?: FontInfo): string {
    if (!bytes.length) {
        return '';
    }

    if (font?.unicodeMap) {
        return decodeWithToUnicode(bytes, font.unicodeMap);
    }

    const utf16 = decodeUtf16Fallback(bytes);
    if (utf16) {
        return utf16;
    }

    return bytesToAscii(bytes);
}

function decodeUtf16Fallback(bytes: Uint8Array): string | undefined {
    if (!UTF16_DECODER || bytes.length < 2 || bytes.length % 2 !== 0) {
        return undefined;
    }

    let zeroHighBytes = 0;
    for (let idx = 0; idx < bytes.length; idx += 2) {
        if (bytes[idx] === 0) {
            zeroHighBytes++;
        }
    }

    if (zeroHighBytes < bytes.length / 4) {
        return undefined;
    }

    try {
        return UTF16_DECODER.decode(bytes);
    } catch {
        return undefined;
    }
}

function decodeWithToUnicode(bytes: Uint8Array, unicodeMap: ToUnicodeMap): string {
    let idx = 0;
    const parts: string[] = [];
    while (idx < bytes.length) {
        let matched = false;
        for (let lengthIdx = 0; lengthIdx < unicodeMap.codeLengths.length; lengthIdx++) {
            const length = unicodeMap.codeLengths[lengthIdx];
            if (idx + length > bytes.length) {
                continue;
            }
            const hexKey = bytesToHex(bytes, idx, length);
            const unicode = unicodeMap.map.get(hexKey);
            if (unicode) {
                parts.push(unicode);
                idx += length;
                matched = true;
                break;
            }
        }

        if (!matched) {
            parts.push(String.fromCharCode(bytes[idx]));
            idx++;
        }
    }
    return parts.join('');
}

function readName(content: string, start: number): { token: NameToken; nextIndex: number } {
    let end = start + 1;
    while (end < content.length && !isDelimiter(content[end]) && !isWhiteSpaceChar(content[end])) {
        end++;
    }
    return {
        token: { type: 'name', value: content.slice(start, end) },
        nextIndex: end,
    };
}

function readLiteralString(content: string, start: number): { token: Extract<ContentToken, { type: 'string' }>; nextIndex: number } {
    const bytes: number[] = [];
    let idx = start + 1;
    let nesting = 1;

    while (idx < content.length && nesting > 0) {
        const char = content[idx];
        if (char === '\\') {
            idx++;
            if (idx >= content.length) {
                break;
            }
            const next = content[idx];
            if (/[0-7]/.test(next)) {
                let octal = next;
                let count = 1;
                while (count < 3 && idx + 1 < content.length - 1) {
                    const lookahead = content[idx + 1];
                    if (/[0-7]/.test(lookahead)) {
                        octal += lookahead;
                        idx++;
                        count++;
                    } else {
                        break;
                    }
                }
                bytes.push(parseInt(octal, 8));
                idx++;
                continue;
            }
            switch (next) {
                case 'n': bytes.push(10); break;
                case 'r': bytes.push(13); break;
                case 't': bytes.push(9); break;
                case 'b': bytes.push(8); break;
                case 'f': bytes.push(12); break;
                case '(':
                case ')':
                case '\\':
                    bytes.push(next.charCodeAt(0));
                    break;
                case '\r':
                    if (content[idx + 1] === '\n') {
                        idx++;
                    }
                    break;
                case '\n':
                    break;
                default:
                    bytes.push(next.charCodeAt(0));
                    break;
            }
            idx++;
            continue;
        }

        if (char === '(') {
            nesting++;
            bytes.push(char.charCodeAt(0));
            idx++;
            continue;
        }

        if (char === ')') {
            nesting--;
            if (nesting === 0) {
                idx++;
                break;
            }
            bytes.push(char.charCodeAt(0));
            idx++;
            continue;
        }

        bytes.push(char.charCodeAt(0));
        idx++;
    }

    return {
        token: { type: 'string', value: new Uint8Array(bytes) },
        nextIndex: idx,
    };
}

function readHexString(content: string, start: number): { token: Extract<ContentToken, { type: 'hex' }>; nextIndex: number } {
    let idx = start + 1;
    let hex = '';
    while (idx < content.length) {
        const char = content[idx];
        if (char === '>') {
            idx++;
            break;
        }
        if (!isWhiteSpaceChar(char)) {
            hex += char;
        }
        idx++;
    }
    if (hex.length % 2 === 1) {
        hex += '0';
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let pos = 0; pos < hex.length; pos += 2) {
        bytes[pos / 2] = parseInt(hex.substring(pos, pos + 2), 16);
    }
    return { token: { type: 'hex', value: bytes }, nextIndex: idx };
}

function readArray(content: string, start: number): { token: ArrayToken; nextIndex: number } {
    const elements: ArrayElement[] = [];
    let idx = start + 1;
    while (idx < content.length) {
        idx = skipWhitespace(content, idx);
        if (idx >= content.length) {
            break;
        }
        const char = content[idx];
        if (char === ']') {
            idx++;
            break;
        }
        if (char === '(') {
            const { token, nextIndex } = readLiteralString(content, idx);
            elements.push(token);
            idx = nextIndex;
            continue;
        }
        if (char === '<' && content[idx + 1] !== '<') {
            const { token, nextIndex } = readHexString(content, idx);
            elements.push(token);
            idx = nextIndex;
            continue;
        }
        const { token, nextIndex } = readNumberOrOperator(content, idx);
        if (token && token.type === 'number') {
            elements.push({ type: 'number', value: token.value });
        }
        idx = nextIndex;
    }
    return { token: { type: 'array', value: elements }, nextIndex: idx };
}

function readNumberOrOperator(content: string, start: number): { token?: ContentToken; nextIndex: number } {
    let end = start;
    while (end < content.length && !isWhiteSpaceChar(content[end]) && !isDelimiter(content[end])) {
        end++;
    }
    const raw = content.slice(start, end);
    if (!raw) {
        return { token: undefined, nextIndex: end + 1 };
    }
    const value = Number(raw);
    if (!Number.isNaN(value)) {
        return { token: { type: 'number', value }, nextIndex: end };
    }
    return { token: { type: 'operator', value: raw }, nextIndex: end };
}

function bytesToAscii(bytes: Uint8Array): string {
    if (SAFE_TEXT_DECODER) {
        try {
            return SAFE_TEXT_DECODER.decode(bytes);
        } catch {
            // ignored
        }
    }
    let result = '';
    for (let idx = 0; idx < bytes.length; idx++) {
        result += String.fromCharCode(bytes[idx]);
    }
    return result;
}

function bytesToHex(bytes: Uint8Array, start: number, length: number): string {
    let hex = '';
    for (let idx = start; idx < start + length; idx++) {
        hex += bytes[idx].toString(16).toUpperCase().padStart(2, '0');
    }
    return hex;
}

function normalizeHex(value: string): string {
    const clean = value.replace(/\s+/g, '').toUpperCase();
    return clean.length % 2 === 0 ? clean : `0${clean}`;
}

function unicodeHexToString(hex: string): string {
    const clean = normalizeHex(hex);
    if (!clean) {
        return '';
    }
    const codePoints: number[] = [];
    for (let idx = 0; idx < clean.length; idx += 4) {
        const chunk = clean.substring(idx, idx + 4);
        if (!chunk) {
            continue;
        }
        const codePoint = parseInt(chunk, 16);
        if (!Number.isNaN(codePoint)) {
            codePoints.push(codePoint);
        }
    }
    if (!codePoints.length) {
        return '';
    }
    return String.fromCodePoint(...codePoints);
}

function padHex(value: number, byteLength: number): string {
    return value.toString(16).toUpperCase().padStart(byteLength * 2, '0');
}

function skipWhitespace(content: string, index: number): number {
    let idx = index;
    while (idx < content.length && isWhiteSpaceChar(content[idx])) {
        idx++;
    }
    return idx;
}

function skipComment(content: string, start: number): number {
    let idx = start;
    while (idx < content.length) {
        const char = content[idx];
        if (char === '\n') {
            idx++;
            break;
        }
        if (char === '\r') {
            if (content[idx + 1] === '\n') {
                idx++;
            }
            idx++;
            break;
        }
        idx++;
    }
    return idx;
}

function isWhiteSpaceChar(char: string): boolean {
    return /\s/.test(char);
}

function isDelimiter(char: string): boolean {
    return '[]()<>{}/%'.includes(char);
}

function normalizeChunks(chunks: string[]): string {
    if (!chunks.length) {
        return '';
    }

    const lines: string[] = [];
    let currentLine = '';

    const pushLine = () => {
        const cleaned = currentLine.replace(/\s+/g, ' ').trim();
        if (cleaned) {
            lines.push(cleaned);
        }
        currentLine = '';
    };

    for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        if (chunk === '\n') {
            pushLine();
            continue;
        }

        const normalized = chunk.replace(/\s+/g, ' ');
        if (!normalized.trim()) {
            if (normalized.includes(' ') && currentLine && !currentLine.endsWith(' ')) {
                currentLine += ' ';
            }
            continue;
        }

        currentLine += normalized;
    }

    pushLine();
    return lines.join('\n');
}
