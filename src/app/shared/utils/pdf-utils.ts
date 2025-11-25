import { PDFArray, PDFContext, PDFDict, PDFDocument, PDFName, PDFPage,
    PDFRawStream, PDFRef, PDFStream, decodePDFRawStream } from 'pdf-lib';

const SAFE_TEXT_DECODER = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : undefined;
const TD_HORIZONTAL_SPACE_THRESHOLD = 40;
const TD_VERTICAL_NEWLINE_THRESHOLD = 1;

type FontInfo = { name: string; unicodeMap?: ToUnicodeMap };
type ToUnicodeMap = { map: Map<string, string>; codeLengths: number[] };
type TextState = { currentFont?: FontInfo };
type Operand =
    | { kind: 'name'; value: string }
    | { kind: 'number'; value: number }
    | { kind: 'bytes'; value: Uint8Array };
type Token = Operand | { kind: 'operator'; value: string };

export async function extractTextFromPdf(file: File): Promise<string> {
    if (!file) return '';
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const context = pdf.context;
        const pageTexts: string[] = [];
        for (const page of pdf.getPages()) {
            const pageText = extractTextFromPage(page, context);
            if (pageText) pageTexts.push(pageText);
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
    if (!streams.length) return '';

    const fonts = buildFontMap(page, context);
    const state: TextState = {};
    const chunks: string[] = [];

    for (const stream of streams) {
        const rawContent = decodeStream(stream);
        if (!rawContent) continue;
        const segments = interpretContent(rawContent, fonts, state);
        if (segments.length) chunks.push(...segments);
    }

    return normalizeChunks(chunks);
}

function interpretContent(content: string, fonts: Record<string, FontInfo>, state: TextState): string[] {
    const scanner = new ContentScanner(content);
    const segments: string[] = [];
    const stack: Operand[] = [];
    let currentFont = state.currentFont;

    const popNumber = () => {
        const operand = stack.pop();
        return operand?.kind === 'number' ? operand.value : undefined;
    };
    const popName = () => {
        const operand = stack.pop();
        return operand?.kind === 'name' ? operand.value : undefined;
    };
    const popBytes = () => {
        const operand = stack.pop();
        return operand?.kind === 'bytes' ? operand.value : undefined;
    };
    const emitBytes = (bytes?: Uint8Array) => {
        if (!bytes) return;
        const text = decodeBytes(bytes, currentFont);
        if (text) segments.push(text);
    };

    let token: Token | undefined;
    while ((token = scanner.next())) {
        if (token.kind !== 'operator') {
            stack.push(token);
            continue;
        }

        switch (token.value) {
            case 'Tf': {
                popNumber();
                const fontName = popName();
                const normalizedName = fontName ? trimName(fontName) : undefined;
                const resolvedFont = normalizedName ? fonts[normalizedName] : undefined;
                currentFont = resolvedFont ?? currentFont;
                break;
            }
            case 'Tj':
                emitBytes(popBytes());
                break;
            case 'Td':
            case 'TD': {
                const ty = popNumber();
                const tx = popNumber();
                if (typeof ty === 'number' && Math.abs(ty) > TD_VERTICAL_NEWLINE_THRESHOLD) appendLineBreak(segments);
                else if (typeof tx === 'number' && Math.abs(tx) > TD_HORIZONTAL_SPACE_THRESHOLD) segments.push(' ');
                break;
            }
            case 'T*':
            case 'Tm':
            case 'BT':
            case 'ET':
                appendLineBreak(segments);
                break;
        }

        stack.length = 0;
    }

    state.currentFont = currentFont;
    return segments;
}

class ContentScanner {
    private index = 0;
    constructor(private readonly source: string) {}

    next(): Token | undefined {
        while (this.index < this.source.length) {
            this.skipWhitespace();
            if (this.index >= this.source.length) return undefined;

            const char = this.source[this.index];
            if (char === '%') {
                this.skipComment();
                continue;
            }
            if (char === '/') return this.readName();
            if (char === '(') return this.readLiteralString();
            if (char === '<') {
                if (this.source[this.index + 1] === '<') {
                    this.index += 2;
                    return { kind: 'operator', value: '<<' };
                }
                return this.readHexString();
            }
            if (char === '>') {
                if (this.source[this.index + 1] === '>') {
                    this.index += 2;
                    return { kind: 'operator', value: '>>' };
                }
                this.index++;
                continue;
            }
            if (char === '[') {
                this.skipArray();
                continue;
            }
            if (char === ']') {
                this.index++;
                return { kind: 'operator', value: ']' };
            }
            if (char === "'" || char === '"') {
                this.index++;
                return { kind: 'operator', value: char };
            }

            return this.readNumberOrOperator();
        }
        return undefined;
    }

    private readName(): Operand {
        const start = ++this.index;
        while (this.index < this.source.length && !isDelimiter(this.source[this.index]) && !isWhiteSpaceChar(this.source[this.index])) {
            this.index++;
        }
        return { kind: 'name', value: this.source.slice(start, this.index) };
    }

    private readLiteralString(): Operand {
        return { kind: 'bytes', value: this.readLiteralBytes() };
    }

    private readHexString(): Operand {
        return { kind: 'bytes', value: this.readHexBytes() };
    }

    private readLiteralBytes(): Uint8Array {
        const bytes: number[] = [];
        let nesting = 1;
        this.index++;
        while (this.index < this.source.length && nesting > 0) {
            const char = this.source[this.index];
            if (char === '\\') {
                this.index++;
                if (this.index >= this.source.length) break;
                const next = this.source[this.index];
                if (/[0-7]/.test(next)) {
                    let octal = next;
                    let count = 1;
                    while (count < 3 && this.index + 1 < this.source.length) {
                        const lookahead = this.source[this.index + 1];
                        if (/[0-7]/.test(lookahead)) {
                            octal += lookahead;
                            this.index++;
                            count++;
                        } else break;
                    }
                    bytes.push(parseInt(octal, 8));
                    this.index++;
                    continue;
                }
                if (next === '\r' || next === '\n') {
                    if (next === '\r' && this.source[this.index + 1] === '\n') this.index++;
                    this.index++;
                    continue;
                }
                bytes.push(this.escapeChar(next));
                this.index++;
                continue;
            }
            if (char === '(') {
                nesting++;
                bytes.push(char.charCodeAt(0));
                this.index++;
                continue;
            }
            if (char === ')') {
                nesting--;
                if (nesting === 0) {
                    this.index++;
                    break;
                }
            }
            if (nesting > 0) {
                bytes.push(char.charCodeAt(0));
                this.index++;
            }
        }
        return new Uint8Array(bytes);
    }

    private readHexBytes(): Uint8Array {
        this.index++;
        let hex = '';
        while (this.index < this.source.length) {
            const char = this.source[this.index];
            if (char === '>') {
                this.index++;
                break;
            }
            if (!isWhiteSpaceChar(char)) hex += char;
            this.index++;
        }
        if (hex.length % 2 === 1) hex += '0';
        const bytes = new Uint8Array(hex.length / 2);
        for (let pos = 0; pos < hex.length; pos += 2) bytes[pos / 2] = parseInt(hex.substring(pos, pos + 2), 16);
        return bytes;
    }

    private readNumberOrOperator(): Token {
        let end = this.index;
        while (end < this.source.length && !isWhiteSpaceChar(this.source[end]) && !isDelimiter(this.source[end])) end++;
        const raw = this.source.slice(this.index, end);
        this.index = end;
        const value = Number(raw);
        if (!Number.isNaN(value)) return { kind: 'number', value };
        return { kind: 'operator', value: raw };
    }

    private skipArray(): void {
        let depth = 1;
        this.index++;
        while (this.index < this.source.length && depth > 0) {
            const char = this.source[this.index];
            if (char === '[') {
                depth++;
                this.index++;
                continue;
            }
            if (char === ']') {
                depth--;
                this.index++;
                continue;
            }
            if (char === '(') {
                this.readLiteralBytes();
                continue;
            }
            if (char === '<' && this.source[this.index + 1] !== '<') {
                this.readHexBytes();
                continue;
            }
            this.index++;
        }
    }

    private skipWhitespace(): void {
        while (this.index < this.source.length && isWhiteSpaceChar(this.source[this.index])) this.index++;
    }

    private skipComment(): void {
        while (this.index < this.source.length) {
            const char = this.source[this.index++];
            if (char === '\n') break;
            if (char === '\r') {
                if (this.source[this.index] === '\n') this.index++;
                break;
            }
        }
    }

    private escapeChar(value: string): number {
        switch (value) {
            case 'n': return 10;
            case 'r': return 13;
            case 't': return 9;
            case 'b': return 8;
            case 'f': return 12;
            case '(':
            case ')':
            case '\\':
                return value.charCodeAt(0);
            default:
                return value.charCodeAt(0);
        }
    }
}

function collectContentStreams(target: unknown, context: PDFContext): PDFRawStream[] {
    if (!target) return [];
    if (target instanceof PDFRawStream) return [target];
    if (target instanceof PDFRef) return collectContentStreams(context.lookup(target), context);
    if (target instanceof PDFArray) {
        const streams: PDFRawStream[] = [];
        for (let idx = 0; idx < target.size(); idx++) {
            const entry = target.lookup(idx);
            if (entry) streams.push(...collectContentStreams(entry, context));
        }
        return streams;
    }
    if (target instanceof PDFStream) return [PDFRawStream.of(target.dict, target.getContents())];
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
    if (!resources) return fonts;
    const fontDict = resources.lookupMaybe(PDFName.of('Font'), PDFDict);
    if (!fontDict) return fonts;

    const entries = fontDict.entries();
    for (let idx = 0; idx < entries.length; idx++) {
        const [fontName, fontValue] = entries[idx];
        const resolvedFont = dereferenceDict(fontValue, context);
        if (!resolvedFont) continue;
        const key = trimName(fontName.asString());
        const toUnicodeStream =
            resolvedFont.lookupMaybe(PDFName.of('ToUnicode'), PDFStream) ||
            resolvedFont.lookupMaybe(PDFName.of('ToUnicode'), PDFRef);
        const unicodeMap = parseToUnicodeMap(toUnicodeStream, context);
        fonts[key] = { name: key, unicodeMap };
    }
    return fonts;
}

function dereferenceDict(target: unknown, context: PDFContext): PDFDict | undefined {
    if (!target) return undefined;
    if (target instanceof PDFDict) return target;
    if (target instanceof PDFRef) return dereferenceDict(context.lookup(target), context);
    return undefined;
}

function parseToUnicodeMap(target: unknown, context: PDFContext): ToUnicodeMap | undefined {
    const rawStream = getRawStream(target, context);
    if (!rawStream) return undefined;
    const content = decodeStream(rawStream);
    if (!content) return undefined;
    return parseToUnicodeCMap(content);
}

function getRawStream(target: unknown, context: PDFContext): PDFRawStream | undefined {
    if (!target) return undefined;
    if (target instanceof PDFRawStream) return target;
    if (target instanceof PDFStream) return PDFRawStream.of(target.dict, target.getContents());
    if (target instanceof PDFRef) return getRawStream(context.lookup(target), context);
    return undefined;
}

function parseToUnicodeCMap(content: string): ToUnicodeMap | undefined {
    const map = new Map<string, string>();
    const codeLengths = new Set<number>();

    const bfcharRegex = /(\d+)\s+beginbfchar([\s\S]*?)endbfchar/g;
    let match: RegExpExecArray | null;
    while ((match = bfcharRegex.exec(content)) !== null) {
        const pairRegex = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g;
        let pair: RegExpExecArray | null;
        while ((pair = pairRegex.exec(match[2])) !== null) {
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
        const lineRegex = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+(<([0-9A-Fa-f]+)>|\[(.*?)\])/g;
        let line: RegExpExecArray | null;
        while ((line = lineRegex.exec(match[2])) !== null) {
            const start = parseInt(line[1], 16);
            const end = parseInt(line[2], 16);
            if (Number.isNaN(start) || Number.isNaN(end)) continue;
            const codeLength = Math.max(1, Math.round(line[1].length / 2));
            codeLengths.add(codeLength);
            const destination = line[3];
            if (!destination) continue;

            if (destination.startsWith('<')) {
                const baseHex = normalizeHex(line[4] || '');
                let base = parseInt(baseHex || '0', 16);
                if (Number.isNaN(base)) continue;
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
                    if (!unicode) continue;
                    const srcHex = padHex(start + offset, codeLength);
                    map.set(srcHex, unicode);
                }
            }
        }
    }

    if (!map.size) return undefined;
    return { map, codeLengths: Array.from(codeLengths).sort((a, b) => b - a) };
}

function decodeBytes(bytes: Uint8Array, font?: FontInfo): string {
    if (!bytes.length) return '';
    if (font?.unicodeMap) return decodeWithToUnicode(bytes, font.unicodeMap);
    return bytesToAscii(bytes);
}

function decodeWithToUnicode(bytes: Uint8Array, unicodeMap: ToUnicodeMap): string {
    let idx = 0;
    const parts: string[] = [];
    while (idx < bytes.length) {
        let matched = false;
        for (let lengthIdx = 0; lengthIdx < unicodeMap.codeLengths.length; lengthIdx++) {
            const length = unicodeMap.codeLengths[lengthIdx];
            if (idx + length > bytes.length) continue;
            const hexKey = bytesToHex(bytes, idx, length);
            const unicode = unicodeMap.map.get(hexKey);
            if (unicode) {
                parts.push(unicode);
                idx += length;
                matched = true;
                break;
            }
        }
        if (!matched) parts.push(String.fromCharCode(bytes[idx++]));
    }
    return parts.join('');
}

function appendLineBreak(segments: string[]): void {
    if (!segments.length || segments[segments.length - 1] === '\n') return;
    segments.push('\n');
}

function normalizeChunks(chunks: string[]): string {
    if (!chunks.length) return '';
    const lines: string[] = [];
    let currentLine = '';
    const pushLine = () => {
        const cleaned = currentLine.replace(/\s+/g, ' ').trim();
        if (cleaned) lines.push(cleaned);
        currentLine = '';
    };
    for (const chunk of chunks) {
        if (chunk === '\n') {
            pushLine();
            continue;
        }
        const normalized = chunk.replace(/\s+/g, ' ');
        if (!normalized.trim()) {
            if (normalized.includes(' ') && currentLine && !currentLine.endsWith(' ')) currentLine += ' ';
            continue;
        }
        currentLine += normalized;
    }
    pushLine();
    return lines.join('\n');
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
    for (let idx = 0; idx < bytes.length; idx++) result += String.fromCharCode(bytes[idx]);
    return result;
}

function bytesToHex(bytes: Uint8Array, start: number, length: number): string {
    let hex = '';
    for (let idx = start; idx < start + length; idx++) hex += bytes[idx].toString(16).toUpperCase().padStart(2, '0');
    return hex;
}

function normalizeHex(value: string): string {
    const clean = value.replace(/\s+/g, '').toUpperCase();
    return clean.length % 2 === 0 ? clean : `0${clean}`;
}

function unicodeHexToString(hex: string): string {
    const clean = normalizeHex(hex);
    if (!clean) return '';
    const codePoints: number[] = [];
    for (let idx = 0; idx < clean.length; idx += 4) {
        const chunk = clean.substring(idx, idx + 4);
        if (!chunk) continue;
        const codePoint = parseInt(chunk, 16);
        if (!Number.isNaN(codePoint)) codePoints.push(codePoint);
    }
    if (!codePoints.length) return '';
    return String.fromCodePoint(...codePoints);
}

function padHex(value: number, byteLength: number): string {
    return value.toString(16).toUpperCase().padStart(byteLength * 2, '0');
}

function isWhiteSpaceChar(char: string): boolean {
    return /\s/.test(char);
}

function isDelimiter(char: string): boolean {
    return '[]()<>{}/%'.includes(char);
}

function trimName(name: string): string {
    return name.replace(/^\/+/, '');
}
