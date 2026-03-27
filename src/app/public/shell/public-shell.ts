import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AsyncButton } from '@/shared/form/button/async/async-button';
import MenuButtonComponent from '@/shared/form/button/menu/menu-button';
import { PageRouterOutlet } from "../../shared/page/page-router-outlet";
import { Shell } from '../../shared/shell/shell';
import { LanguageSelect } from "../../shared/shell/language-select";

@Component({
    selector: 'app-public-shell',
    templateUrl: './public-shell.html',
    styleUrls: ['../../shared/shell/shell.scss', './public-shell.scss'],
    imports: [TranslateModule, PageRouterOutlet, MenuButtonComponent,
        AsyncButton, LanguageSelect],
})
export class PublicShell extends Shell {
    
    protected signIn = async () => {
        this.menuButton().execute();
        this.router.navigate(['/login']);
    }
}