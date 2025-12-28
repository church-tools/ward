import { inject, Injectable, signal } from "@angular/core";
import { ProfileService } from "../../modules/profile/profile.service";
import { xcomputed } from "../../shared/utils/signal-utils";

@Injectable({ providedIn: 'root' })
export class AdminService {

    private readonly profileService = inject(ProfileService);

    readonly isAdmin = xcomputed([this.profileService.own], own => own?.is_admin);
    readonly isUnitAdmin = xcomputed([this.profileService.own], own => own?.is_unit_admin);
    readonly editMode = signal(false);
}