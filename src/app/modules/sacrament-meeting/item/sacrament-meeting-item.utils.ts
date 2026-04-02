import type {
    SacramentMeetingItem,
    SacramentMeetingItemPreviewMode,
    SacramentMeetingMessage,
    SacramentMeetingMusicalPerformance,
    SacramentMeetingSinging,
} from './sacrament-meeting-item';

export function getSacramentMeetingMessageText(row: SacramentMeetingMessage.Row): string {
    const speaker = row.speaker?.trim() ?? '';
    const topic = row.topic?.trim() ?? '';
    if (speaker && topic)
        return `${speaker}: ${topic}`;
    if (topic)
        return topic;
    if (speaker)
        return speaker;
    return `#${row.id}`;
}

export function getSacramentMeetingSingingText(row: SacramentMeetingSinging.Row): string {
    if (row.hymn != null)
        return `#${row.hymn}`;
    return `#${row.id}`;
}

export function getSacramentMeetingMusicalPerformanceText(row: SacramentMeetingMusicalPerformance.Row): string {
    const name = row.name?.trim() ?? '';
    const performers = row.performers?.trim() ?? '';
    if (name && performers)
        return `${name} - ${performers}`;
    if (name)
        return name;
    if (performers)
        return performers;
    return `#${row.id}`;
}

export function getSacramentMeetingItemText(item: SacramentMeetingItem): string {
    switch (item.kind) {
        case 'talk':
            return getSacramentMeetingMessageText(item.row);
        case 'hymn':
            return getSacramentMeetingSingingText(item.row);
        case 'musical_performance':
            return getSacramentMeetingMusicalPerformanceText(item.row);
    }
}

export function matchesSacramentMeetingItemPreviewMode(
    item: SacramentMeetingItem,
    previewMode: SacramentMeetingItemPreviewMode,
): boolean {
    if (previewMode === 'talks')
        return item.kind === 'talk';
    return item.kind === 'hymn' || item.kind === 'musical_performance';
}