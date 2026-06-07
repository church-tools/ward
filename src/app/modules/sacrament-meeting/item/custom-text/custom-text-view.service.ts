import { ViewService } from "@/modules/shared/view.service";
import { Service } from "@angular/core";
import type { CustomText } from "./custom-text";

@Service()
export class CustomTextViewService extends ViewService<'custom_text'> {

    readonly icon = 'text_bullet_list_square_edit';

    constructor() {
        super('custom_text');
    }

    toString(item: CustomText.Row): string {
        return item.content;
    }
}
