import { BadRequestError, Env } from "./functions-utils";

const FILE_BUCKET = "ward-tools";

export type FileAccessMethod = "GET" | "DELETE";

export async function signFileAccessUrl(env: Env, unitId: number, key: string, method: FileAccessMethod): Promise<string> {
	if (!unitId) throw new BadRequestError("unit required");
	if (!key) throw new BadRequestError("key required");
	if (method !== "GET" && method !== "DELETE")
		throw new BadRequestError("body.method has to be GET or DELETE");

	const { accessKey, secretKey, accountId } = getSigningCredentials(env);
	const folder = `unit_${unitId}`;
	const enc = new TextEncoder();
	const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
	const hash = async (data: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(data)));
	const asU8 = (value: Uint8Array | ArrayBuffer) => {
		if (value instanceof ArrayBuffer) return new Uint8Array(value);
		return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer);
	};
	const hmac = async (hmacKey: Uint8Array | ArrayBuffer, msg: string) => {
		const cryptoKey = await crypto.subtle.importKey(
			"raw", asU8(hmacKey) as any, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
		);
		return await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
	};

	const objectKey = `${folder}/${encodeURIComponent(key)}`;
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

	const canonicalQueryString = [...params.keys()].sort()
		.map(paramKey => `${encodeURIComponent(paramKey)}=${encodeURIComponent(params.get(paramKey)!)}`)
		.join("&");
	const canonicalRequest = [method, `/${FILE_BUCKET}/${objectKey}`, canonicalQueryString, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
	const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await hash(canonicalRequest)].join("\n");
	const keyDate = await hmac(enc.encode(`AWS4${secretKey}`), dateStamp);
	const keyRegion = await hmac(keyDate, "auto");
	const keyService = await hmac(keyRegion, "s3");
	const keySigning = await hmac(keyService, "aws4_request");
	const signature = hex(await hmac(keySigning, stringToSign));

	params.set("X-Amz-Signature", signature);
	return `https://${host}/${FILE_BUCKET}/${objectKey}?${params}`;
}

function getSigningCredentials(env: Env): { accessKey: string; secretKey: string; accountId: string } {
	const accessKey = env["AWS_ACCESS_KEY_ID"] ?? "";
	const secretKey = env["AWS_SECRET_ACCESS_KEY"] ?? "";
	const accountId = env["ACCOUNT_ID"] ?? "";
	if (!accessKey || !secretKey || !accountId)
		throw new BadRequestError("R2 credentials not configured");
	return { accessKey, secretKey, accountId };
}
