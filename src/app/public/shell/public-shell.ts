import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ShellComponent } from '../../shared/shell/shell';

@Component({
    selector: 'app-public-shell',
    templateUrl: './public-shell.html',
    styleUrls: ['../../shared/shell/shell.scss', './public-shell.scss'],
    imports: [RouterOutlet, TranslateModule],
})
export class PublicShellComponent extends ShellComponent {

    private readonly router = inject(Router);

}