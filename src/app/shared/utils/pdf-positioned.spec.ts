import { describe, expect, it } from 'vitest';
import {
    PDFDocument,
    PDFName,
    PDFOperator,
    PDFOperatorNames,
    PDFString,
    StandardFonts,
    beginText,
    endText,
    setFontAndSize,
    setTextMatrix,
} from 'pdf-lib';
import { extractPositionedRuns, extractTextFromPdf, runsFromContentStream } from './pdf-utils';

function fileFromBytes(bytes: Uint8Array): File {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new File([buffer], 'synthetic.pdf', { type: 'application/pdf' });
}

describe('runsFromContentStream', () => {
    it('emits one run at the Tm origin with the current font size', () => {
        const runs = runsFromContentStream('BT /F1 10 Tf 1 0 0 1 72 720 Tm (Hello) Tj ET', {}, {}, 1, 0);

        expect(runs).toHaveLength(1);
        expect(runs[0]).toMatchObject({ text: 'Hello', x: 72, y: 720, size: 10 });
    });

    it('joins every string in a TJ array into a single run', () => {
        const runs = runsFromContentStream('BT /F1 10 Tf 1 0 0 1 50 100 Tm [(Hel) -120 (lo)] TJ ET', {}, {}, 1, 0);

        expect(runs).toHaveLength(1);
        expect(runs[0].text).toBe('Hello');
    });

    it('advances y through Td and T* using the leading set by TL', () => {
        const content = 'BT /F1 10 Tf 1 0 0 1 10 100 Tm (A) Tj 0 -12 Td (B) Tj 12 TL T* (C) Tj ET';
        const runs = runsFromContentStream(content, {}, {}, 1, 0);

        expect(runs.map(run => [run.text, run.y])).toEqual([
            ['A', 100],
            ['B', 88],
            ['C', 76],
        ]);
    });

    it('sets leading from TD and applies it on the next T*', () => {
        const content = 'BT /F1 10 Tf 1 0 0 1 10 100 Tm 0 -14 TD (A) Tj T* (B) Tj ET';
        const runs = runsFromContentStream(content, {}, {}, 1, 0);

        expect(runs.map(run => run.y)).toEqual([86, 72]);
    });

    it('keeps absolute coordinates across content streams and reports the stream index', () => {
        const state = {};
        const first = runsFromContentStream('BT /F1 10 Tf 1 0 0 1 72 720 Tm (One) Tj ET', {}, state, 0, 0);
        // Stream 2 continues the text object without `BT`/`Tm` (a stream may be
        // split mid-object), so the origin must survive in `state`.
        const second = runsFromContentStream('/F1 10 Tf (Two) Tj', {}, state, 0, 1);

        expect(first[0]).toMatchObject({ text: 'One', x: 72, y: 720, page: 0, stream: 0 });
        expect(second[0]).toMatchObject({ text: 'Two', y: 720, page: 0, stream: 1 });
        // `x` carries over too, including the estimated advance for "One"
        // (10 * 0.5 * 3).
        expect(second[0].x).toBe(87);
    });

    it('advances x by an estimated width after each show operator', () => {
        const content = 'BT /F1 10 Tf 1 0 0 1 100 100 Tm (AB) Tj (CD) Tj [(E) -500 (F)] TJ ET';
        const runs = runsFromContentStream(content, {}, {}, 0, 0);

        // 100 -> 110 ("AB"), 110 -> 120 ("CD"), 120 -> 135 ("EF" plus -500 kerning).
        expect(runs.map(run => [run.text, run.x])).toEqual([
            ['AB', 100],
            ['CD', 110],
            ['EF', 120],
        ]);
    });

    it("emits runs for the ' and \" show operators after advancing by the leading", () => {
        const content = 'BT /F1 10 Tf 1 0 0 1 10 100 Tm 12 TL (A) Tj (B) \' 1 2 (C) " ET';
        const runs = runsFromContentStream(content, {}, {}, 0, 0);

        expect(runs.map(run => [run.text, run.y])).toEqual([
            ['A', 100],
            ['B', 88],
            ['C', 76],
        ]);
    });

    it('drops the font when Tf names a font missing from the page resources', () => {
        // F1 maps byte 0x41 to "X", so reusing it after the unresolved `/F9 10 Tf`
        // would decode the second "A" as "X" instead of falling back to ASCII.
        const fonts = { F1: { name: 'F1', unicodeMap: { map: new Map([['41', 'X']]), codeLengths: [1] } } };
        const runs = runsFromContentStream('BT /F1 10 Tf (A) Tj /F9 10 Tf (A) Tj ET', fonts, {}, 0, 0);

        expect(runs.map(run => [run.font, run.text])).toEqual([
            ['F1', 'X'],
            [undefined, 'A'],
        ]);
    });
});

describe('extractTextFromPdf regression', () => {
    it('still returns line-stream output for a PDF drawn with Tj', async () => {
        const pdf = await PDFDocument.create();
        const page = pdf.addPage([300, 300]);
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        page.drawText('Hello', { x: 72, y: 200, size: 12, font });

        const text = await extractTextFromPdf(fileFromBytes(await pdf.save()));

        expect(text).toBe('Hello');
    });

    it('still discards TJ arrays on the line-stream path', async () => {
        const pdf = await PDFDocument.create();
        const page = pdf.addPage([300, 300]);
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        page.setFont(font);
        page.pushOperators(
            beginText(),
            setFontAndSize(PDFName.of(font.name), 12),
            setTextMatrix(1, 0, 0, 1, 72, 200),
            PDFOperator.of(PDFOperatorNames.ShowTextAdjusted, [
                pdf.context.obj([PDFString.of('Hel'), -120, PDFString.of('lo')]),
            ]),
            endText(),
        );

        const bytes = await pdf.save();
        const runs = await extractPositionedRuns(fileFromBytes(bytes));

        expect(await extractTextFromPdf(fileFromBytes(bytes))).toBe('');
        // The new path does read the same array, so the gap is closed there only.
        expect(runs).toHaveLength(1);
        expect(runs[0].text).toBe('Hello');
    });
});
