import { Component, model } from "@angular/core";
import { ColorName } from "../../utils/color-utils";
import { xcomputed } from "../../utils/signal-utils";

export type TagOption<T> = {
    value: T;
    view: string;
    color?: ColorName;
}

@Component({
    selector: 'app-tag',
    template: `
        {{ view() }}
        <ng-content/>
    `,
    styleUrl: './tag.scss',
})
export class TagComponent<T> {

    readonly value = model<T>();
    readonly options = model<TagOption<T>[]>([]);

    protected readonly view = xcomputed([this.value, this.options],
        (value, options) => options.find(o => o.value === value)?.view || '');
}