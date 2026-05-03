import { inject, Injectable } from "@angular/core";
import { SupabaseService } from "@/shared/service/supabase.service";
import { DAY, getSundayIndexInMonth, getUpcomingSundayIndex, SundayIndex } from "@/shared/utils/date-utils";
import { ProfileService } from "../profile/profile.service";
import type { SacramentMeeting } from "./sacrament-meeting";

export enum Class {
    sundaySchool = 1,
    reliefSociety = 2,
    eldersQuorum = 3,
    bishopric = 4,
}

@Injectable({ providedIn: 'root' })
export class SacramentMeetingService {

    private readonly profileService = inject(ProfileService);
    private readonly supabase = inject(SupabaseService);

    async assureUpcomingMeeting(): Promise<SacramentMeeting.Row> {
        const currentWeek = getUpcomingSundayIndex();
        return this.assureMeeting(currentWeek);
    }

    async assureCurrentOrUpcomingMeeting(date = new Date()): Promise<SacramentMeeting.Row> {
        const sunday = this.getCurrentOrUpcomingSundayIndex(date);
        return this.assureMeeting(sunday);
    }

    getCurrentOrUpcomingSundayIndex(date = new Date()): SundayIndex {
        if (date.getDay() === 0)
            return getUpcomingSundayIndex(date);
        const nextWeek = new Date(date.getTime() + 7 * DAY);
        return getUpcomingSundayIndex(nextWeek);
    }

    private async assureMeeting(sundayIndex: SundayIndex): Promise<SacramentMeeting.Row> {
        let meeting = await this.supabase.sync
            .from('sacrament_meeting')
            .findOne()
            .eq('week', sundayIndex)
            .get();
        meeting ??= await this.createMeeting(sundayIndex);
        return meeting;
    }

    async createMeeting(sundayIndex: SundayIndex): Promise<SacramentMeeting.Row> {
        const profile = await this.profileService.own.asPromise();
        const classes = this.getClasses(sundayIndex).join(',');
        const meeting = await this.supabase.sync
            .from('sacrament_meeting')
            .insert({ week: sundayIndex, unit: profile.unit, classes });
        return meeting;
    }

    getClasses(sundayIndex: SundayIndex): Class[] {
        const sundayIndexInMonth = getSundayIndexInMonth(sundayIndex);
        switch (sundayIndexInMonth) {
            case 1: case 3: return [Class.sundaySchool];
            case 2: case 4: return [Class.reliefSociety, Class.eldersQuorum];
            case 5: return [Class.bishopric];
        }
        return [];
    }
}
