import { createClient } from "@supabase/supabase-js";
import { environment } from "../../src/environments/environment";


export const supabaseServiceClient = createClient(
    environment.supabaseUrl || '',
    process.env['SUPABASE_SECRET'] || ''
);