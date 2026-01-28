import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import AsyncButtonComponent from '../../shared/form/button/async/async-button';
import MenuButtonComponent from '../../shared/form/button/menu/menu-button';
import { PageRouterOutlet } from "../../shared/page/page-router-outlet";
import { ShellComponent } from '../../shared/shell/shell';
import { LanguageSelectComponent } from "../../shared/shell/language-select";

@Component({
    selector: 'app-public-shell',
    templateUrl: './public-shell.html',
    styleUrls: ['../../shared/shell/shell.scss', './public-shell.scss'],
    imports: [TranslateModule, PageRouterOutlet, MenuButtonComponent,
    AsyncButtonComponent, LanguageSelectComponent],
})
export class PublicShellComponent extends ShellComponent {
    
    protected signIn = async () => {
        this.menuButton().execute();
        this.router.navigate(['/login']);
    }
}