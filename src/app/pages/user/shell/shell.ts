import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TablistWrapperModule, TabWrapperModule } from "@fabric-msft/fluent-angular";

@Component({
    selector: 'app-shell',
    templateUrl: './shell.html',
    styleUrl: './shell.scss',
    imports: [RouterOutlet, TablistWrapperModule, TabWrapperModule],
})
export class ShellComponent {
    constructor() { }
}