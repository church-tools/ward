import type { Message } from "./message/message";
import type { MusicalPerformance } from "./musical-performance/musical-performance";
import type { Singing } from "./singing/singing";

export namespace SacramentMeetingMessage {
    export type Insert = Message.Insert;
    export type Update = Message.Update;
    export type Row = Message.Row;
}

export namespace SacramentMeetingSinging {
    export type Insert = Singing.Insert;
    export type Update = Singing.Update;
    export type Row = Singing.Row;
}

export namespace SacramentMeetingMusicalPerformance {
    export type Insert = MusicalPerformance.Insert;
    export type Update = MusicalPerformance.Update;
    export type Row = MusicalPerformance.Row;
}

export type SacramentMeetingItemKind = 'talk' | 'hymn' | 'musical_performance';
export type SacramentMeetingItemPreviewMode = 'talks' | 'music';

export type SacramentMeetingItem =
    | {
        kind: 'talk';
        table: 'message';
        id: number;
        position: number;
        sacrament_meeting: number | null;
        row: SacramentMeetingMessage.Row;
    }
    | {
        kind: 'hymn';
        table: 'singing';
        id: number;
        position: number;
        sacrament_meeting: number | null;
        row: SacramentMeetingSinging.Row;
    }
    | {
        kind: 'musical_performance';
        table: 'musical_performance';
        id: number;
        position: number;
        sacrament_meeting: number | null;
        row: SacramentMeetingMusicalPerformance.Row;
    };

export type SacramentMeetingItemDraft = {
    draft: true;
    kind: SacramentMeetingItemKind;
    table: 'message' | 'singing' | 'musical_performance';
    id: number;
};

export type SacramentMeetingItemCard = SacramentMeetingItem | SacramentMeetingItemDraft;