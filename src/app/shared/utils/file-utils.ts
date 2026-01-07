import { Icon } from "../icon/icon";
import { PaletteColor } from "./color-utils";

export enum FileType {
    text = 'text/plain',
    zip = 'application/zip',
    xZip = 'application/x-zip-compressed',
    word = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    excel = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    powerpoint = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    pdf = 'application/pdf',
    image = 'image/*',
    calenderEvent = 'application/calendar+json',
    csv = 'text/csv',
    xml = 'application/xml',
    xml2 = 'text/xml',
}

export type FileKey = string & { __fileKey: true };
export type FileUrl = string & { __fileUrl: true };

export type FileInfo = {
    value: string;
    fullName: string;
    name: string;
    icon: Icon;
    key: FileKey;
    url?: FileUrl;
    unsaved?: boolean;
    type?: FileType;
    color?: PaletteColor;
    data?: File;
};

export function openFile(file: File, title?: string, inWindow = false) {
    const url = URL.createObjectURL(file) as FileUrl;
    openFromUrl(url, title ?? file.name, inWindow);
    URL.revokeObjectURL(url);
}

export function download(file: File) {
    const url = URL.createObjectURL(file) as FileUrl;
    downloadUrl(url, file.name);
    URL.revokeObjectURL(url);
}

export function downloadUrl(url: string, title: string) {
    clickLink({ href: url, download: title });
}

export function openFileInfoInNewTab(fileInfo: FileInfo) {
    if (!fileInfo) return;

    const objectUrl = fileInfo.data ? (URL.createObjectURL(fileInfo.data) as FileUrl) : undefined;
    const baseUrl = objectUrl ?? fileInfo.url;
    if (!baseUrl) return;

    const urlToOpen = fileInfo.type && !isImage(fileInfo.type)
        ? (getEmbedUrl(baseUrl as FileUrl, fileInfo.type) as FileUrl)
        : baseUrl;

    clickLink({ href: urlToOpen, target: '_blank' });
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
}

export function getTypeFromName(ending: string): FileType | undefined {
    switch (ending.toLowerCase()) {
        case 'pdf':
            return FileType.pdf;
        case 'docx':
        case 'doc':
            return FileType.word;
        case 'xlsx':
        case 'xls':
            return FileType.excel;
        case 'pptx':
        case 'ppt':
            return FileType.powerpoint;
        case 'png':
        case 'jpg': case 'jpeg':
        case 'bmp':
        case 'tiff': case 'tif':
        case 'webp':
        case 'svg':
        case 'emz':
            return FileType.image;
        case 'ical':
        case 'ics':
            return FileType.calenderEvent;
        case 'zip':
            return FileType.zip;
        case 'xml':
            return FileType.xml;
    }
    return undefined;
}

export function getIcon(type: FileType | undefined): Icon {
    switch (type) {
        case FileType.word: return 'document_text';
        case FileType.excel: return 'table';
        case FileType.powerpoint: return 'data_pie';
        case FileType.pdf: return 'document_pdf';
        case FileType.calenderEvent: return 'calendar_ltr';
        case FileType.zip: case FileType.xZip: return 'folder_zip';
    }
    if (type && isImage(type)) return 'image';
    return 'document';
}

export function getColor(type: FileType | undefined): PaletteColor | undefined {
    switch (type) {
        case FileType.word: return 'blue';
        case FileType.excel: return 'green';
        case FileType.powerpoint: return 'tomato';
        case FileType.pdf: return 'red';
        case FileType.calenderEvent: return 'dodgerblue';
        case FileType.zip: case FileType.xZip: return 'goldenrod';
        case FileType.xml:
        case FileType.xml2: return 'goldenrod';
    }
    if (type && isImage(type)) return 'mediumpurple';
    return undefined;
}

export function viewedByService(type: FileType | string): boolean {
    switch (type) {
        case FileType.word:
        case FileType.excel:
        case FileType.powerpoint:
            return true;
    }
    return false;
}

export function needsIframe(type: FileType | string): boolean {
    return type === FileType.pdf || viewedByService(type) || isImage(type);
}

export function iframeHasData(type: FileType | string): boolean {
    switch (type) {
        case FileType.pdf:
            return true;
    }
    return isImage(type);
}

export function getEmbedUrl(url: FileUrl, type: FileType | undefined): string {
    switch (type) {
        case FileType.word:
        case FileType.excel:
        case FileType.powerpoint:
            return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
        default:
            return url + '#view=fitH&toolbar=0&navpanes=0';
    }
}

function isImage(type: FileType | string): boolean {
    return new RegExp(FileType.image).test(type);
}

function clickLink(options: { href: string; download?: string; target?: string }) {
    const link = document.createElement('a');
    link.href = options.href;
    if (options.download) link.download = options.download;
    if (options.target) link.target = options.target;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function openFromUrl(url: string, title: string, inWindow = false) {
    const features = inWindow
        ? 'toolbar=0,location=0,menubar=0,noopener,noreferrer'
        : 'noopener,noreferrer';
    const newTab = window.open(url, '_blank', features);
    if (newTab) setTabTitle(newTab, title);
    else window.location.href = url;
}

function setTabTitle(tab: Window, title: string) {
    tab.document.title = title;
    setTimeout(() => {
        if (tab.document.title !== title)
            tab.document.title = title;
    }, 100);
}
