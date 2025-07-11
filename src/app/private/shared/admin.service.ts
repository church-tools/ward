import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class AdminService {

    readonly editMode = signal(false);
}