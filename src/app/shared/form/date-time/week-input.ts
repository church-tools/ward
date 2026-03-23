import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { getUpcomingSundayIndex, SundayIndex, sundayIndexToDate } from '../../utils/date-utils';
import { PromiseOrValue } from '../../types';
import ErrorMessage from '../../widget/error-message/error-message';
import { getProviders, InputBase } from '../shared/input-base';
import InputLabel from '../shared/input-label';

@Component({
    selector: 'app-week-input',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [InputLabel, ErrorMessage],
    providers: getProviders(() => WeekInput),
    template: `
        <label class="column">
            <app-input-label/>
            <div class="form-input">
                <input type="date"
                    [value]="viewValue() ?? ''"
                    [required]="required()"
                    [disabled]="disabled()"
                    [placeholder]="placeholder()"
                    (input)="onInput($event)">
            </div>
            <app-error-message/>
        </label>
    `,
})
export default class WeekInput extends InputBase<string, number> {

    readonly weekday = input(0);
    override readonly debounceTime = 300;

    protected onInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        const snapped = this.snapIsoToWeekday(target.value);
        target.value = snapped ?? '';
        this.setViewValue(snapped ?? '');
    }

    protected override mapIn(value: number | null): PromiseOrValue<string | null> {
        if (value == null) return null;
        const sunday = sundayIndexToDate(value as SundayIndex);
        sunday.setDate(sunday.getDate() + this.getSafeWeekday());
        return this.toIsoDate(sunday);
    }

    protected override mapOut(value: string | null): PromiseOrValue<number | null> {
        if (!value) return null;
        const parsed = this.parseIsoDate(value);
        if (!parsed) return null;
        const snapped = this.snapDateToWeekday(parsed);
        return getUpcomingSundayIndex(snapped);
    }

    private getSafeWeekday(): number {
        const weekday = this.weekday();
        return Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : 0;
    }

    private snapIsoToWeekday(value: string): string | null {
        const date = this.parseIsoDate(value);
        if (!date) return null;
        return this.toIsoDate(this.snapDateToWeekday(date));
    }

    private snapDateToWeekday(date: Date): Date {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        const weekday = this.getSafeWeekday();
        const diff = (normalized.getDay() - weekday + 7) % 7;
        normalized.setDate(normalized.getDate() - diff);
        return normalized;
    }

    private parseIsoDate(value: string): Date | null {
        const parts = value.split('-');
        if (parts.length !== 3) return null;
        const [year, month, day] = parts.map(Number);
        if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
        return date;
    }

    private toIsoDate(date: Date): string {
        const year = date.getFullYear().toString().padStart(4, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
