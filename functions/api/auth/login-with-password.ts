import { BadRequestError, getSupabaseService, runUnauthenticatedFunction } from "../../shared/functions-utils";

// custom login function to skip captcha requirement of supabase when using email+password login
export const onRequest = runUnauthenticatedFunction(async (req, params: { email: string; password: string }) => {
    const { email, password } = params;
    if (!email || !password)
        throw new BadRequestError("Missing email or password");
    const supabase = getSupabaseService(req.env);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
        return { error };
    return data;
});

export type LoginWithPasswordFunction = typeof onRequest;