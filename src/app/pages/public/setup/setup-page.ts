import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../../../../database-table.types';
import AsyncButtonComponent from '../../../shared/form/button/async/async-button';
import { TextInputComponent } from "../../../shared/form/text/text-input";
import { SupabaseService } from '../../../shared/supabase.service';
import { PageComponent } from '../../shared/page';

@Component({
    selector: 'app-setup-page',
    imports: [FormsModule, AsyncButtonComponent, TextInputComponent],
    templateUrl: './setup-page.html',
    styleUrls: ['../../shared/page.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'narrow',
    }
})
export class SetupPageComponent extends PageComponent {

    private readonly supabaseService = inject(SupabaseService);

    protected readonly unitName = model<string>('');

    constructor() {
        super();
    }

    protected createUnit = async () => {
        const user = await this.assureUserExists();
        // const { data: unit } = await this.supabaseService.client
        //     .from('unit')
        //     .insert({ name: this.unitName(), created_by: user.uid })
        //     .select('id')
        //     .single()
        //     .throwOnError();
        const unit = { id: 1 }
        await this.supabaseService.client
            .from('user')
            .update({ unit: unit.id })
            .eq('uid', user.uid)
            .throwOnError();
    }

    private async assureUserExists(): Promise<User> {
        const session = await this.supabaseService.getSession()
        const uid = session?.user.id;
        if (!uid) throw new Error('Login fehlgeschlagen');
        const { data: existing } = await this.supabaseService.client
            .from('user')
            .select('*')
            .eq('uid', uid)
            .single();
        if (existing) return existing;
        const { data: created } = await this.supabaseService.client
            .from('user')
            .insert({ uid })
            .select('*')
            .single()
            .throwOnError();
        return created;
    }
}