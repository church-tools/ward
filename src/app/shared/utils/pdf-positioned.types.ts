/**
 * One decoded text run extracted from a PDF content stream.
 *
 * `page` and `stream` are both 0-based: `page` is the page index within the
 * document and `stream` the index of the content stream within that page.
 * `x`/`y` are the text-space origin of the run (not device-space).
 */
export type TextRun = {
    text: string;
    x: number;
    y: number;
    page: number;
    stream: number;
    font?: string;
    size?: number;
};
