import { Component, input } from "@angular/core";
import { xcomputed } from "../utils/signal-utils";
import { iconCodes } from "./icon-codes";

export type IconPath = keyof typeof IconPathMap;

export type IconSize = 'xs' | 'ns' | 'sm' | 'smaller' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'xxxxl';

export type Icon = keyof typeof iconCodes;

export enum IconPathMap {
    throbber = 'assets/img/throbber.svg',
}

// See https://fluenticon.netlify.app/ or https://fluenticons.co/


@Component({
    selector: 'app-icon',
    template: '{{content()}}',
    styleUrl: './icon.scss',
    host: {
        '[style]': 'style()',
        '[class]': 'size()',
    },
})
export class IconComponent  {
    
    readonly icon = input.required<Icon | IconPath>();
    readonly size = input<IconSize>('md');
    readonly filled = input<boolean>();

    protected readonly style = xcomputed([this.icon], icon => {
        if (!(icon in IconPathMap)) return '';
        const path = IconPathMap[icon as IconPath];
        const mask = `url(${path}) no-repeat center / contain`;
        return `-webkit-mask: ${mask}; mask: ${mask}; background-color: currentColor;`;
    });

    protected readonly content = xcomputed([this.icon, this.filled], (icon, filled) => {
        if (icon in IconPathMap || !icon) return '';
        const code = iconCodes[icon as Icon];
        return String.fromCodePoint(filled ? code - 1 : code);
    });
}
