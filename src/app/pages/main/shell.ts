import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-shell',
    templateUrl: './shell.html',
    styleUrl: './shell.scss',
    imports: [RouterOutlet],
})
export class ShellComponent {
    constructor() { }
}