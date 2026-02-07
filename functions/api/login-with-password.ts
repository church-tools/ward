import { BadRequestError, getSupabaseService, runFunction } from "../shared/functions-utils";

// custom login function to skip captcha requirement of supabase

export const onRequest = runFunction<{ email: string; password: string }>(async req => {
    const { email, password } = req.params;
    if (!email || !password)
        throw new BadRequestError("Missing email or password");
    const supabase = getSupabaseService(req.env);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
        return { error: error };
    return data;
});
