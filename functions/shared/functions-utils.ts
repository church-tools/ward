import type { PagesFunction, Request } from "@cloudflare/workers-types";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "../../database";
import { environment } from "../../src/environments/environment";

const JSON_HEADERS = { "content-type": "application/json" };

type Context = Parameters<PagesFunction>[0];
export type Endpoint<P, R> = ((context: Context) => Promise<Response>) & {
    readonly __params?: P;
    readonly __result?: R;
};
export type SupabaseSession = { is_admin: boolean; unit?: number; [key: string]: any };
export type UnauthenticatedFunctionRequest = Request & { env: Env; origin: string; ip?: string };
export type FunctionRequest = UnauthenticatedFunctionRequest & { user: User; session: SupabaseSession };
export type AdminFunctionRequest = UnauthenticatedFunctionRequest & { user: User; session: SupabaseSession & { is_admin: true; unit: number } };
export type Env = Context["env"] & Record<string, string>;

export function runFunction<P extends object, R>(fn: (req: FunctionRequest, params: P) => Promise<R>) {
    return runUnauthenticatedFunction<P, R>(async (req, params) => {
        const { user, session } = await authenticateRequest(req);
        const userReq = req as FunctionRequest;
        userReq.user = user;
        userReq.session = session;
        return await fn(userReq, params);
    });
}

export function runAdminFunction<P extends object, R>(fn: (req: AdminFunctionRequest, params: P) => Promise<R>) {
    return runFunction<P, R>(async (req, params) => {
        if (!req.session.is_admin)
            throw new PermissionError("Admin access required");
        if (!req.session.unit)
            throw new UnauthorizedError("session.unit missing");
        return await fn(req as AdminFunctionRequest, params);
    });
}

export function runCaptchaProtectedFunction<P extends { captchaToken: string }, R>(fn: (req: UnauthenticatedFunctionRequest, params: P) => Promise<R>) {
    return runUnauthenticatedFunction<P, R>(async (req, params) => {
        if (req.env["DEVELOPMENT"]) {
            console.warn("DEVELOPMENT mode: bypassing captcha verification");
        } else {
            await verifyCaptcha(params.captchaToken, req.env, req.ip);
        }
        return await fn(req, params);
    });
}

export function runUnauthenticatedFunction<P extends object, R>(
    fn: (req: UnauthenticatedFunctionRequest, params: P) => Promise<R>
) {
    return <Endpoint<P, R>>(async context => {
        try {
            if (context.request.method !== "POST")
                throw new MethodNotAllowedError("Only POST allowed");
            const request = context.request as UnauthenticatedFunctionRequest;
            const params = (await context.request.json().catch(() => ({}))) as P;
            request.env = context.env as Env;
            request.origin = resolveOrigin(context);
            request.ip = (context.request.headers.get("CF-Connecting-IP") ?? context.request.headers.get("x-forwarded-for"))?.split(",")[0]?.trim();
            const result = await fn(request, params);
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
    const accountId = env["ACCOUNT_ID"];
    return _s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
    });
}

function resolveOrigin(context: Context) {
    const configuredOrigin = (context.env as Env)["APP_ORIGIN"];
    try {
        return new URL(context.request.url).origin;
    } catch {
        if (typeof configuredOrigin === "string" && configuredOrigin)
            return configuredOrigin.replace(/\/$/, "");
        return "http://localhost:4201";
    }
}

async function authenticateRequest(req: UnauthenticatedFunctionRequest) {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer "))
        throw new UnauthorizedError("Missing or invalid Authorization header");

    const jwt = authHeader.replace("Bearer ", "");
    const supabase = getSupabaseService(req.env as Env);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user)
        throw new UnauthorizedError("Invalid token");

    const session = JSON.parse(atob(jwt.split(".")[1]));
    return { user: userData.user, session };
}

async function verifyCaptcha(token: string, env: Env, remoteIp?: string) {
    const secret = env["TURNSTILE_SECRET"];
    const formData = new FormData();
    formData.set("secret", secret);
    formData.set("response", token);
    if (remoteIp) formData.set("remoteip", remoteIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: formData,
    });
    const result = await response.json() as { success: boolean; "error-codes"?: string[] };
    if (!result.success)
        throw new BadRequestError("captcha invalid");
}

abstract class ErrorBase extends Error { constructor(message: string, public status: number) { super(message); } }

export class BadRequestError extends ErrorBase { constructor(message: string) { super(message, 400); } }
export class UnauthorizedError extends ErrorBase { constructor(message: string) { super(message, 401); } }
export class PermissionError extends ErrorBase { constructor(message: string = "Forbidden") { super(message, 403); } }
export class NotFoundError extends ErrorBase { constructor(message: string) { super(message, 404); } }
export class MethodNotAllowedError extends ErrorBase { constructor(message: string = "Method Not Allowed") { super(message, 405); } }
export class PayloadTooLargeError extends ErrorBase { constructor(message: string = "Payload Too Large") { super(message, 413); } }
