import { Component, DOCUMENT, inject, input, OnDestroy } from "@angular/core";
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
                @if (icon()) { <app-icon [icon]="icon()!" [filled]="iconFilled()"/> }
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
                @if (icon()) { <app-icon [icon]="icon()!" [filled]="iconFilled()"/> }
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
    readonly showNewTab = input(true);
    readonly newTab = input(false);
    readonly outside = input(false);
    readonly queryParams = input<Params>();

    protected readonly routerLink = xcomputed([this.href, this.outside], (href, outside) => outside ? null : href.split('?')[0]);
    protected readonly rel = xcomputed([this.outside], outside => outside ? 'noopener noreferrer' : '');
    protected readonly target = xcomputed([this.newTab], newTab => newTab ? '_blank' : '_self');
    protected readonly newTabVisible = xcomputed([this.disabled, this.showNewTab, this.newTab],
        (disabled, show, newTab) => !disabled && show && !newTab);

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