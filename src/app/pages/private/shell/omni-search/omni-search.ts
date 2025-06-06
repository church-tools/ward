import { Component } from '@angular/core';
import { TextInputWrapperModule } from "@fabric-msft/fluent-angular";

@Component({
    selector: 'app-omni-search',
    template: `
        <fluent-text-input></fluent-text-input>
    `,
    imports: [TextInputWrapperModule],
    styleUrl: './omni-search.scss',
})
export class OmniSearchComponent {

}