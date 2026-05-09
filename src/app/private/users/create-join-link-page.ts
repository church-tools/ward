import { UnitService } from '@/modules/unit/unit.service';
import { AsyncButton } from '@/shared/form/button/async/async-button';
import { TextInput } from '@/shared/form/text/text-input';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { FunctionsService } from '@/shared/service/functions.service';
import { xcomputed, xeffect } from '@/shared/utils/signal-utils';
import Collapse from '@/shared/widget/collapse/collapse';
import { Component, inject, signal } from '@angular/core';
import { PrivatePage } from '../shared/private-page';

@Component({
    selector: 'app-users-join-link-page',
    template: `
        <div class="page narrow gap-4">
            <h2>{{ 'CREATE_JOIN_LINK.TITLE' | localize }}</h2>
            <div class="row no-wrap gap-2 align-end">
                <app-text-input class="grow-1" type="text"
                    [label]="'CREATE_JOIN_LINK.VALIDITY_DAYS' | localize"
                    [value]="joinLinkDays()"
                    (valueChange)="joinLinkDays.set($event ?? '')"/>
            </div>
            <app-collapse [show]="!!joinUrl()">
                <app-text-input class="full-width" type="text"
                    [label]="'CREATE_JOIN_LINK.URL' | localize"
                    [value]="joinUrl()!"
                    [copyable]="true"
                    disabled/>
            </app-collapse>
            <app-async-button [onClick]="generateJoinLink" icon="link"
                [title]="'CREATE_JOIN_LINK.GENERATE' | localize"
                type="secondary">
                {{ "CREATE_JOIN_LINK.GENERATE" | localize }}
            </app-async-button>
        </div>
    `,
    imports: [LocalizePipe, TextInput, AsyncButton, Collapse],
    host: { class: 'full-width' },
})
export class CreateJoinLinkPage extends PrivatePage {

    private readonly functions = inject(FunctionsService);
    private readonly unitService = inject(UnitService);

    protected readonly joinLinkDays = signal<string>('2');
    
    protected readonly joinUrl = xcomputed([this.unitService.own], unit => {
        if (!unit?.join_token || !unit?.join_timeout) return null;
        if (unit.join_timeout < new Date().toISOString().split("T")[0]) return null;
        return `${window.location.origin}/join?unit=${unit.id}&token=${unit.join_token}`
    });

    protected readonly generateJoinLink = async () => {
        const validity_days = Number(this.joinLinkDays());
        if (!Number.isFinite(validity_days) || validity_days < 1)
            throw 'ERROR.FAILED';
        await this.functions.call('auth/generate-join-link', { validity_days })
    }
}