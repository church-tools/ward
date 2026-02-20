import { booleanAttribute, Component, DOCUMENT, inject, input, OnDestroy } from "@angular/core";
import { Params, Router, RouterModule } from "@angular/router";
import { IconComponent } from "../../../icon/icon";
import { xcomputed } from "../../../utils/signal-utils";
import ButtonBaseComponent from "../shared/button-base";

@Component({
    selector: 'app-link-button',
    imports: [RouterModule, IconComponent],
    template: `
        @if (outside()) {
            <a [href]="href()" type="button"
                [rel]="rel()" [target]="target()"
                [class.space-right]="newTabVisible()"
                [class.disabled]="disabled()"
                title="{{title()}}"
                class="button {{classes()}}">
                @if (icon()) { <app-icon [icon]="icon()!" [filled]="iconFilled()" [size]="iconSize()"/> }
                <ng-content select="[outside]"/>
                @if (newTabVisible()) {
                    <div class="new-tab" (click)="openInNewTab($event)">
                        <app-icon icon="open" size="xs"/>
                    </div>
                }
            </a>
        } @else {
            <a [routerLink]="disabled() ? '#' : routerLink()" type="button"
                [queryParams]="queryParams()"
                [class.space-right]="newTabVisible()"
                [class.disabled]="disabled()"
                title="{{title()}}"
                class="button {{classes()}}">
                @if (icon()) { <app-icon [icon]="icon()!" [filled]="iconFilled()" [size]="iconSize()"/> }
                <ng-content/>
                @if (newTabVisible()) {
                    <div class="new-tab" (click)="openInNewTab($event)">
                        <app-icon icon="open" size="xs"/>
                    </div>
                }
            </a>
        }
    `,
    styleUrl: './link-button.scss',
})
export default class LinkButtonComponent extends ButtonBaseComponent implements OnDestroy {

    private readonly router = inject(Router);
    private readonly document = inject<Document>(DOCUMENT);

    readonly href = input.required<string>();
    readonly hideNewTab = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly newTab = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly outside = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly queryParams = input<Params>();

    protected readonly routerLink = xcomputed([this.href, this.outside], (href, outside) => outside ? null : href.split('?')[0]);
    protected readonly rel = xcomputed([this.outside], outside => outside ? 'noopener noreferrer' : '');
    protected readonly target = xcomputed([this.newTab], newTab => newTab ? '_blank' : '_self');
    protected readonly newTabVisible = xcomputed([this.disabled, this.hideNewTab, this.newTab],
        (disabled, hide, newTab) => !disabled && !hide && !newTab);

    execute() {
        this.navigate(this.href(), undefined, this.newTab());
    }

    protected openInNewTab(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.navigate(this.href(), undefined, true);
    }

    private navigate(path: string, params?: Params, newTab?: boolean, replaceUrl?: boolean) {
        const docView = this.document.defaultView;
        if (newTab) {
            const url = this.router.serializeUrl(this.router.createUrlTree([path], { queryParams: params }));
            if (docView) {
                const newTab = docView.open(url, '_blank');
                if (newTab) newTab.opener = docView.opener || docView;
            }
        }
        else {
            if (path.startsWith('http')) {
                if (docView) {
                    if (newTab)
                        docView.open(path, '_blank');
                    else
                        docView.location.href = path;
                }
            } else
                this.router.navigate([path], { queryParams: params, replaceUrl });
        }
    }
}