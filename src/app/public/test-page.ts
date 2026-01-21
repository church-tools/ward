import { Component, signal } from '@angular/core';
import { RichTextComponent } from '../shared/form/rich-text/rich-text';
import { PageComponent } from '../shared/page/page';
import { PALETTE_COLORS } from '../shared/utils/color-utils';

@Component({
    selector: 'app-not-found-page',
    template: `
        <span class="display-text">Test</span>
        <p>Dies ist eine Testseite</p>
        <div class="card red strong-text p-5">Test Text with Color</div>
        <div class="column gap-2">
            @for (color of colorNames; track color) {
                <div class="row gap-2">
                    <div class="col p-3 round {{color}}-mute-bg"></div>
                    <div class="col p-3 round {{color}}-bg"></div>
                    <div class="col p-3 round {{color}}-active-bg"></div>
                    <div class="col p-3 round {{color}}-fg"></div>
                    <div class="col p-3 round {{color}}-high-contrast-bg"></div>
                    <div> hue: {{ $index * 15 }}  <span class="ms-3">{{ color }}</span></div>
                </div>
            }
        </div>

        <app-rich-text [value]="markdownContent()" (valueChange)="markdownContent.set($event ?? '')" name="test"/>
        <p>Markdown Inhalt:</p>
        <p class="text-pre-wrap">
            {{ markdownContent() }}
        </p>
            
    `,
    imports: [RichTextComponent],
    host: { class: 'page narrow' },
})
export class TestComponent extends PageComponent {

    protected readonly markdownContent = signal('**Bold text** and _italic text_\n\n## Heading 2\n\n- List item 1\n- List item 2');

    protected readonly colorNames = PALETTE_COLORS;
}