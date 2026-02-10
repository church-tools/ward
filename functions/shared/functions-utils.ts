import type { PagesFunction, Request } from "@cloudflare/workers-types";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "../../database";
import { environment } from "../../src/environments/environment";

const JSON_HEADERS = { "content-type": "application/json" };

type Context = Parameters<PagesFunction>[0];
export type AsyncPagesFunction = (context: Context) => Promise<Response>;
export type SupabaseSession = { is_admin: boolean; unit?: number; [key: string]: any };
export type FunctionRequest<P> = Request & { env: Env; params: P };
export type AuthenticatedFunctionRequest<P> = FunctionRequest<P> & { user: User; session: SupabaseSession };
export type Env = Context["env"] & Record<string, string>;

export function runAuthenticatedFunction<P extends object, R extends object = any>(fn: (req: AuthenticatedFunctionRequest<P>) => Promise<R>) {
    return runFunction(fn as (req: FunctionRequest<P>) => Promise<R>, async context => {
        const { user, session } = await authenticateRequest(context);
        const request = context.request as AuthenticatedFunctionRequest<P>;
        request.user = user;
        request.session = session;
    });
}

export function runFunction<P extends object, R extends object = any>(
    fn: (req: FunctionRequest<P>) => Promise<R>,
    authenticate?: (context: Context) => Promise<void>
) {
    return <AsyncPagesFunction>(async context => {
        try {
            if (context.request.method !== "POST")
                throw new MethodNotAllowedError("Only POST allowed");
            const request = context.request as FunctionRequest<P>;
            request.params = (await context.request.json().catch(() => ({}))) as P;
            request.env = context.env as Env;
            (await authenticate?.(context)) ?? { user: null, session: null };
            const result = await fn(request);
            return new Response(result ? JSON.stringify(result) : '{ "success": true }', {
                status: 200,
                headers: JSON_HEADERS,
            });
        } catch (err: any) {
            console.error("Error in function:", err);
            return new Response(err.message || 'Internal Server Error',
                { status: ('status' in err ? err.status : 500), headers: JSON_HEADERS });
        }
    });
}

export function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

let _supabaseService: SupabaseClient<Database> | null = null;
export function getSupabaseService(env: Env) {
    return _supabaseService ??= createClient<Database>(
        environment.supabaseUrl || '',
        env['SUPABASE_SECRET'],
    );
}

let _s3Client: any | null = null;
export async function getS3Client(env: Env) {
    if (_s3Client) return _s3Client;
    
    const { S3Client } = await import("@aws-sdk/client-s3");
    const accessKeyId = env["AWS_ACCESS_KEY_ID"];
    const secretAccessKey = env["AWS_SECRET_ACCESS_KEY"];
    const accountId = env["R2_ACCOUNT_ID"];
    return _s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
    });
}

async function authenticateRequest(context: Context) {
    const authHeader = context.request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer "))
        throw new UnauthorizedError("Missing or invalid Authorization header");

    const jwt = authHeader.replace("Bearer ", "");
    const supabase = getSupabaseService(context.env as Env);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user)
        throw new UnauthorizedError("Invalid token");

    const session = JSON.parse(atob(jwt.split(".")[1]));
    return { user: userData.user, session };
}

abstract class ErrorBase extends Error { constructor(message: string, public status: number) { super(message); } }

export class BadRequestError extends ErrorBase { constructor(message: string) { super(message, 400); } }
export class UnauthorizedError extends ErrorBase { constructor(message: string) { super(message, 401); } }
export class PermissionError extends ErrorBase { constructor(message: string = "Forbidden") { super(message, 403); } }
export class NotFoundError extends ErrorBase { constructor(message: string) { super(message, 404); } }
export class MethodNotAllowedError extends ErrorBase { constructor(message: string = "Method Not Allowed") { super(message, 405); } }
export class PayloadTooLargeError extends ErrorBase { constructor(message: string = "Payload Too Large") { super(message, 413); } }
