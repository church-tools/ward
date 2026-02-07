

let _envLoadPromise: Promise<Record<string, string | undefined>> | null = null;
function loadEnv(): Promise<Record<string, string | undefined>> {
    if (_envLoadPromise) return _envLoadPromise;
    _envLoadPromise = (async () => {
        const res = await fetch('/functions/env.json', { cache: 'no-store' });
        return await res.json();
    })();
    return _envLoadPromise;
}

export async function callLocal<T>(
    fn: string, accessToken: string | undefined,
    body?: Record<string, unknown>, file?: File
): Promise<T> {
    const fnModule = await import(`../api/${fn}.ts`);
    if (!fnModule) throw new Error(`No function "${fn}" in functions/api`);
    const { onRequest } = await fnModule;
    const localEnv = await loadEnv();
    const headers = new Headers();
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

    let requestBody: BodyInit | undefined;
    if (file) {
        const form = new FormData();
        for (const [k, v] of Object.entries(body ?? {}))
            form.append(k, String(v));
        form.append('file', file, file.name);
        requestBody = form;
    } else if (body) {
        requestBody = JSON.stringify(body);
        headers.set('Content-Type', 'application/json');
    }

    const request = new Request(`http://localhost/api/${fn}`, {
        method: 'POST', headers, body: requestBody,
    });

    const context = {
        request,
        env: localEnv,
        params: {},
        data: {},
        functionPath: `/api/${fn}`,
        next: () => Promise.resolve(new Response(null, { status: 404 })),
        waitUntil: () => {},
    };

    const response = await onRequest(context);

    if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(`Function ${fn} failed (${response.status}): ${message}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) return await response.json();
    return await response.text() as T;
}
