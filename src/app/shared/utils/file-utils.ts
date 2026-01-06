
export enum FileType {
    text = 'text/plain',
    zip = 'application/zip',
    xZip = 'application/x-zip-compressed',
    word = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    excel = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf = 'application/pdf',
    image = 'image/*',
    calenderEvent = 'application/calendar+json',
    csv = 'text/csv',
    xml = 'application/xml',
    xml2 = 'text/xml',
}

export function openFile(file: File, title?: string, inWindow = false) {
    const url = URL.createObjectURL(file);
    openFromUrl(url, title ?? file.name, inWindow);
}

export function download(file: File) {
    const url = URL.createObjectURL(file);
    clickDownloadLink(url, file.name);
}

function openFromUrl(url: string, title: string, inWindow = false) {
    const features = inWindow
        ? 'toolbar=0,location=0,menubar=0,noopener,noreferrer'
        : 'noopener,noreferrer';
    const newTab = window.open(url, '_blank', features);
    if (newTab) setTabTitle(newTab, title);
    else window.location.href = url;
}

function clickDownloadLink(url: string, title: string) {
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = title;
    downloadLink.rel = 'noopener noreferrer';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
}

function setTabTitle(tab: Window, title: string) {
    tab.document.title = title;
    setTimeout(() => {
        if (tab.document.title !== title)
            tab.document.title = title;
    }, 100);
}
