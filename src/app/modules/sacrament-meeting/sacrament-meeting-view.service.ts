import { Injectable } from '@angular/core';
import { SundayIndex, sundayIndexToDate } from '../../shared/utils/date-utils';
import { ViewService } from '../shared/view.service';
import type { SacramentMeeting } from './sacrament-meeting';
import { Class } from './sacrament-meeting.service';

@Injectable({ providedIn: 'root' })
export class SacramentMeetingViewService extends ViewService<'sacrament_meeting'> {

    readonly icon = 'presenter';

    readonly typeOptions = [
        'fast_and_testimony',
        'general_conference',
        'stake_conference',
        'ward_conference',
    ].map(type => ({
        value: type as SacramentMeeting.Type,
        view: `MEETING_TYPE.${type.toUpperCase()}`,
    }));

    readonly classOptions = [
        { value: Class.sundaySchool, view: 'CLASS.SUNDAY_SCHOOL' },
        { value: Class.reliefSociety, view: 'CLASS.RELIEF_SOCIETY' },
        { value: Class.eldersQuorum, view: 'CLASS.ELDERS_QUORUM' },
        { value: Class.bishopric, view: 'CLASS.BISHOPRIC' },
    ] as const;

    readonly classOptionsByClass = Object.fromEntries(
        this.classOptions.map(option => [option.value, option])
    ) as Record<Class, (typeof this.classOptions)[number]>;

    constructor() {
        super('sacrament_meeting');
    }

    toString = (row: SacramentMeeting.Row): string => {
        const date = sundayIndexToDate(row.week as SundayIndex);
        let result = date.toLocaleDateString(this.language.locale(),
            { day: '2-digit', month: 'short', year: 'numeric' });
        if (row.type) result += ` ${this.getTypeLabel(row.type)}`;
        return result
    }

    getTypeLabel(type: SacramentMeeting.Type): string {
        return this.language.localizeInstant(`MEETING_TYPE.${type.toUpperCase()}`);
    }
}
