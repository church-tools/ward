import { iconCodes } from "./icon-codes";

export type IconPath = keyof typeof IconPathMap;

export enum IconPathMap {
    throbber = 'assets/img/throbber.svg',
}

// See https://fluenticon.netlify.app/ or https://fluenticons.co/

export type Icon = keyof typeof iconCodes extends
    `ic_fluent_${infer Rest}_20_regular` | `ic_fluent_${infer Rest}_20_filled`
    ? Rest : never;


export function getIconChar(icon: Icon, filled?: boolean) {
    const code: number = iconCodes[<never>`ic_fluent_${icon}_20_${filled ? 'filled' : 'regular'}`];
    if (!code) throw new Error(`Icon ${icon} not found`);
    return String.fromCodePoint(code);
}
