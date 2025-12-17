import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PageRouterOutlet } from "../../shared/page/page-router-outlet";
import { ShellComponent } from '../../shared/shell/shell';

@Component({
    selector: 'app-public-shell',
    templateUrl: './public-shell.html',
    styleUrls: ['../../shared/shell/shell.scss', './public-shell.scss'],
    imports: [TranslateModule, PageRouterOutlet],
})
export class PublicShellComponent extends ShellComponent {

    private readonly router = inject(Router);

}