import { Component, signal } from '@angular/core';
import { PaletteColor } from '../../shared/utils/color-utils';

@Component({
    selector: 'app-presences',
    template: `
        @for (presence of presences(); track presence.path) {
            <div class="presence card round center-content items-center inverse-font-color
                fg-gradient from-{{presence.color1}} to-{{presence.color2}}">
                {{ presence.initials }}
            </div>
        }
    `,
    imports: [],
    host: {
        class: 'row reverse no-wrap'
    },
    styles: [`
        .presence {
            height: 2rem;
            width: 2rem;
            &:not(:first-child) {
                margin-right: -0.75rem;
            }
        }
    `],
})
export class PresencesComponent {

    protected readonly presences = signal<{ initials: string, name: string, path: string, color1: PaletteColor, color2: PaletteColor }[]>([
        // {
        //     initials: 'JD',
        //     name: 'John Doe',
        //     path: '/documents/1',
        //     color1: 'blue',
        //     color2: 'tomato',
        // },
        // {
        //     initials: 'AS',
        //     name: 'Alice Smith',
        //     path: '/documents/2',
        //     color1: 'green',
        //     color2: 'mediumpurple',
        // }
    ]);

}