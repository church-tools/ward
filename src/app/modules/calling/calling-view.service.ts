import { Injectable } from "@angular/core";
import { ViewService } from "../shared/view.service";

@Injectable({ providedIn: 'root' })
export class CallingViewService extends ViewService<'calling'> {

    readonly icon = 'briefcase';
    readonly name = this.translate.stream('VIEW.CALLING');
    readonly namePlural = this.translate.stream('VIEW.CALLINGS');

}