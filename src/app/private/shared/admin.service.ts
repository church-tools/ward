import { ProfileService } from "@/modules/profile/profile.service";
import { xcomputed } from "@/shared/utils/signal-utils";
import { inject, Injectable, signal } from "@angular/core";

const EDIT_MODE_STORAGE_KEY = 'admin_edit_mode';

@Injectable({ providedIn: 'root' })
export class AdminService {

    private readonly profileService = inject(ProfileService);

    readonly isAdmin = xcomputed([this.profileService.own], own => own?.is_admin);
    readonly isUnitAdmin = xcomputed([this.profileService.own], own => own?.is_unit_admin);
    readonly _editMode = signal(localStorage.getItem(EDIT_MODE_STORAGE_KEY) === 'true');
    readonly editMode = this._editMode.asReadonly();

    setEditMode(editMode: boolean) {
        this._editMode.set(editMode);
        localStorage.setItem(EDIT_MODE_STORAGE_KEY, editMode.toString());
    }
}