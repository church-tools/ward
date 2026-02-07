import { Component, inject, model } from '@angular/core';
import { Router } from '@angular/router';
import AsyncButtonComponent from '../../shared/form/button/async/async-button';
import { SelectComponent, SelectOption } from "../../shared/form/select/select";
import { TextInputComponent } from "../../shared/form/text/text-input";
import { PageComponent } from '../../shared/page/page';
import { FunctionsService } from '../../shared/service/functions.service';
import { SupabaseService } from '../../shared/service/supabase.service';
import { asyncComputed } from '../../shared/utils/signal-utils';

@Component({
    selector: 'app-setup-page',
    imports: [AsyncButtonComponent, TextInputComponent, SelectComponent],
    templateUrl: './setup-page.html',
    host: { class: 'page narrow' },
})
export class SetupPageComponent extends PageComponent {

    private readonly router = inject(Router);
    private readonly supabase = inject(SupabaseService);
    private readonly functions = inject(FunctionsService);

    protected readonly unitName = model<string>('');
    protected readonly selectedUnit = model<number | null>(null);

    // protected readonly unitOptions = signal<SelectOption<number>[]>([{ value: 18, view: 'Gemeinde Hamburg', color: 'red' }, { value: 19, view: 'Gemeinde Test', color: 'blue' }]);
    protected readonly unitOptions = asyncComputed<SelectOption<number>[]>([], async () => {
        const { units } = await this.functions.listUnits();
        return units.map(({ id, name }) => ({ value: id, view: name }) as SelectOption<number>);
    }, []);

    protected createUnit = async () => {
        const unitName = this.unitName();
        if (!unitName) return;
        const data = await this.functions.createUnit(unitName);
        // const user = await this.assureProfileExists(data);

        // const { data: unit } = await this.supabaseService.client
        //     .from('unit')
        //     .insert({ name: this.unitName(), created_by: user.uid })
        //     .select('id')
        //     .single()
        //     .throwOnError();
        // const unit = { id: 1 };
        // await this.supabaseService.client
        //     .from('user')
        //     .update({ unit: unit.id })
        //     .eq('uid', user.uid)
        //     .throwOnError();
    }

    protected joinUnit = async () => {
        const { profile } = await this.functions.joinUnit(this.selectedUnit()!);
        await this.supabase.refreshSession();
        this.router.navigateByUrl('/');
    }
}