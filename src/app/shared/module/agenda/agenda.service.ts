import { inject, Injectable } from "@angular/core";
import { SupabaseService } from "../../supabase.service";

@Injectable({ providedIn: 'root' })
export class AgendaService {

    private readonly supabaseService = inject(SupabaseService);

}