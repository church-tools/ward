import { Service } from "@angular/core";
import { ViewService } from "../shared/view.service";
import type { MinisteringArea } from "./ministering";

@Service()
export class MinisteringAreaViewService extends ViewService<'ministering_area'> {

    readonly icon = 'handshake';

    constructor() {
        super('ministering_area');
    }

    toString(row: MinisteringArea.Row): string {
        return "";
    }
}