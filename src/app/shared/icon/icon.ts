import { Component, computed, input } from "@angular/core";
import { asyncComputed } from "../utils/signal-utils";
import type { iconCodes } from "./icon-codes";

export type IconPath = keyof typeof IconPathMap;

export type IconSize = 'xs' | 'ns' | 'sm' | 'smaller' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'xxxxl';

export enum IconPathMap {
    throbber = 'assets/img/throbber.svg',
}

// See https://fluenticon.netlify.app/ or https://fluenticons.co/

export type Icon = keyof typeof iconCodes extends
    `ic_fluent_${infer Rest}_20_regular` | `ic_fluent_${infer Rest}_20_filled`
    ? Rest : never;

let cachedIconCodes: typeof iconCodes | null = null;

export async function getIconChar(icon: Icon, filled?: boolean) {
    const iconCodes = cachedIconCodes ??= (await import('./icon-codes')).iconCodes;
    const code: number = iconCodes[<never>`ic_fluent_${icon}_20_${filled ? 'filled' : 'regular'}`];
    if (!code) throw new Error(`Icon ${icon} not found`);
    return String.fromCodePoint(code);
}

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

    protected readonly style = computed<string>(() => {
        const icon = this.icon();
        if (!(icon in IconPathMap)) return '';
        const path = IconPathMap[<IconPath>icon];
        const mask = `url(${path}) no-repeat center / contain`;
        return `-webkit-mask: ${mask}; mask: ${mask}; background-color: currentColor;`;
    });

    protected readonly content = asyncComputed([this.icon, this.filled], async (icon, filled) => {
        if (icon in IconPathMap || !icon) return '';
        return await getIconChar(<Icon>icon, filled);
    }, '');
}
