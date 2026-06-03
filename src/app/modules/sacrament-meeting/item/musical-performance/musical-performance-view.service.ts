import { ViewService } from "@/modules/shared/view.service";
import { Service } from "@angular/core";
import type { MusicalPerformance } from "./musical-performance";

@Service()
export class MusicalPerformanceViewService extends ViewService<'musical_performance'> {

    readonly icon = 'music_note_2';

    constructor() {
        super('musical_performance');
    }

    toString(item: MusicalPerformance.Row): string {
        return item.name ?? '';
    }
}
