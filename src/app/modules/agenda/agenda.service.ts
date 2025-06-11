import { inject, Injectable } from "@angular/core";
import { SupabaseService } from "../../shared/supabase.service";

@Injectable({ providedIn: 'root' })
export class AgendaService {

    private readonly supabaseService = inject(SupabaseService);

}