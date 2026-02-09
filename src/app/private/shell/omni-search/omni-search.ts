import { Component, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { SelectComponent, SelectOption } from '../../../shared/form/select/select';
import { IconComponent } from "../../../shared/icon/icon";
import { SupabaseService } from '../../../shared/service/supabase.service';
import { WindowService } from '../../../shared/service/window.service';

@Component({
    selector: 'app-omni-search',
    template: `
        <app-select class="omni-search-select" [options]="options()"
            placeholder="{{ 'SEARCH' | translate }}"
            [options]="getOptions">
            <app-icon icon="search" size="sm"/>
        </app-select>
    `,
    imports: [TranslateModule, SelectComponent, IconComponent],
    styleUrl: './omni-search.scss',
})
export class OmniSearchComponent implements OnDestroy {

    private readonly windowService = inject(WindowService);
    private readonly supabase = inject(SupabaseService);

    private readonly select = viewChild.required(SelectComponent);
    private readonly keySubscription: Subscription;

    protected readonly options = signal<SelectOption<{ table: string, id: number }>[]>([]);

    constructor() {
        this.keySubscription = this.windowService.onCtrlAndKeyPressed('f')
            .subscribe(() => this.select()?.focusInput());
    }

    ngOnDestroy() {
        this.keySubscription.unsubscribe();
    }

    protected getOptions = async (search: string) => {
        const members = await this.supabase.sync.from('member')
            .find()
            .textSearch('first_name', search)
            .get();
        console.log(members);
        return [];
    }
}