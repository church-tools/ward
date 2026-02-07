import type { ExecutionContext, ExportedHandler, Request as CFRequest, Response as CFResponse } from "@cloudflare/workers-types";

type WorkerEnv = Record<string, string>;

const API_PREFIX = "/api/";

async function handleApiRequest(request: CFRequest, env: WorkerEnv, ctx: ExecutionContext): Promise<CFResponse> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith(API_PREFIX))
        return new Response("Not Found", { status: 404 }) as unknown as CFResponse;

    const fnName = url.pathname.slice(API_PREFIX.length);
    if (!fnName)
        return new Response("Not Found", { status: 404 }) as unknown as CFResponse;

    try {
        const mod = await import(`./api/${fnName}.ts`);
        if (!mod?.onRequest)
            return new Response("Not Found", { status: 404 }) as unknown as CFResponse;

        const context = {
            request,
            env,
            params: {},
            data: {},
            functionPath: url.pathname,
            next: () => Promise.resolve(new Response("Not Found", { status: 404 }) as unknown as CFResponse),
            waitUntil: (promise: Promise<unknown>) => ctx.waitUntil(promise),
        };

        return await mod.onRequest(context as Parameters<typeof mod.onRequest>[0]);
    } catch (err) {
        console.error("Error loading function:", err);
        return new Response("Function error", { status: 500 }) as unknown as CFResponse;
    }
}

const handler: ExportedHandler<WorkerEnv> = {
    async fetch(request, env, ctx) {
        return await handleApiRequest(request, env, ctx);
    },
};

export default handler;
