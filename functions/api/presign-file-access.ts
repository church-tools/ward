import { BadRequestError, runAuthenticatedFunction } from "../shared/functions-utils";

export const onRequest = runAuthenticatedFunction<{ key?: string; method?: string }>(async req => {
    const { session } = req;
    if (!session.unit)
        throw new BadRequestError("session.unit missing");

    const accessKey = req.env["AWS_ACCESS_KEY_ID"] ?? "";
    const secretKey = req.env["AWS_SECRET_ACCESS_KEY"] ?? "";
    const accountId = req.env["R2_ACCOUNT_ID"] ?? "";
    if (!accessKey || !secretKey || !accountId)
        throw new BadRequestError("R2 credentials not configured");

    const bucket = "ward-tools";
    const folder = `unit_${session.unit}`;

    const { key, method } = req.params;
    if (!key || !method) throw new BadRequestError("key and method are required");
    if (method !== "GET" && method !== "DELETE")
        throw new BadRequestError("body.method has to be GET or DELETE");

    const enc = new TextEncoder();
    const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
    const hash = async (data: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(data)));
    const asU8 = (k: Uint8Array | ArrayBuffer) => {
        if (k instanceof ArrayBuffer) return new Uint8Array(k);
        return new Uint8Array(k.buffer.slice(k.byteOffset, k.byteOffset + k.byteLength));
    };
    const hmac = async (hmacKey: Uint8Array | ArrayBuffer, msg: string) => {
        const k = await crypto.subtle.importKey(
            "raw", <any>asU8(hmacKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
        );
        return crypto.subtle.sign("HMAC", k, enc.encode(msg));
    };

    const encodedKey = `${folder}/${encodeURIComponent(key)}`;
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/auto/s3/aws4_request`;
    const host = `${accountId}.r2.cloudflarestorage.com`;

    const params = new URLSearchParams({
        "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        "X-Amz-Credential": `${accessKey}/${scope}`,
        "X-Amz-Date": amzDate,
        "X-Amz-Expires": "900",
        "X-Amz-SignedHeaders": "host",
    });

    const canonicalQS = [...params.keys()].sort()
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params.get(k)!)}`)
        .join("&");
    const canonicalReq = [method, `/${bucket}/${encodedKey}`, canonicalQS, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");

    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await hash(canonicalReq)].join("\n");
    const kDate = await hmac(enc.encode("AWS4" + secretKey), dateStamp);
    const kRegion = await hmac(kDate, "auto");
    const kService = await hmac(kRegion, "s3");
    const kSigning = await hmac(kService, "aws4_request");
    const signature = hex(await hmac(kSigning, stringToSign));

    params.set("X-Amz-Signature", signature);
    return { url: `https://${host}/${bucket}/${encodedKey}?${params}` };
});
