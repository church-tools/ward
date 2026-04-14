import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { Page } from '../../shared/page/page';
import { FunctionsService } from '@/shared/service/functions.service';

@Component({
    selector: 'app-bulletin-board-page',
    template: `
        <span class="display-text">{{ 'BULLETIN_BOARD.TITLE' | localize }}</span>
    `,
    imports: [LocalizePipe],
    host: { class: 'page narrow' },
})
export class BulletinBoardPage extends Page {

    private readonly route = inject(ActivatedRoute);
    private readonly functions = inject(FunctionsService);

    async ngOnInit() {
        const key = this.route.snapshot.queryParamMap.get('key') ?? localStorage.getItem('BULLETIN_BOARD_KEY');
        if (!key) return;
        const posters = await this.functions.listPosters(key);
        console.log(posters);
    }
}