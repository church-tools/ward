import { Component, inject, model, signal } from '@angular/core';
import { Profile } from '../../modules/profile/profile';
import AsyncButtonComponent from '../../shared/form/button/async/async-button';
import { SelectComponent, SelectOption } from "../../shared/form/select/select";
import { TextInputComponent } from "../../shared/form/text/text-input";
import { PageComponent } from '../../shared/page/page';
import { SupabaseService } from '../../shared/service/supabase.service';

@Component({
    selector: 'app-setup-page',
    imports: [AsyncButtonComponent, TextInputComponent, SelectComponent],
    templateUrl: './setup-page.html',
    host: { class: 'page narrow' },
})
export class SetupPageComponent extends PageComponent {

    private readonly supabaseService = inject(SupabaseService);

    protected readonly unitName = model<string>('');
    protected readonly selectedUnit = model<number | null>(null);

    protected readonly unitOptions = signal<SelectOption<number>[]>([{ value: 18, view: 'Gemeinde Hamburg', color: 'red' }, { value: 19, view: 'Gemeinde Test', color: 'blue' }]);

    constructor() {
        super();
    }

    protected createUnit = async () => {
        const unitName = this.unitName();
        if (!unitName) return;
        const session = await this.supabaseService.getSessionToken();
        const data = await this.supabaseService.callEdgeFunction('create-unit', { name: unitName });
        const user = await this.assureProfileExists(data);

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

    }

    private async assureProfileExists(unit: { id: number }): Promise<Profile.Row> {
        const session = await this.supabaseService.getSessionToken();
        const uid = session?.user.id;
        if (!uid) throw new Error('Login fehlgeschlagen');
        const { data: existing } = await this.supabaseService.client
            .from('profile')
            .select('*')
            .eq('uid', uid)
            .single();
        if (existing) return existing;
        const { data: created } = await this.supabaseService.client
            .from('profile')
            .insert({ uid, unit: unit.id })
            .select('*')
            .single()
            .throwOnError();
        return created;
    }
}