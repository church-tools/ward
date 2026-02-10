import { BadRequestError, getS3Client, PayloadTooLargeError, PermissionError, runAuthenticatedFunction } from "../shared/functions-utils";

const MAX_UPLOAD_BYTES_CAP = 10_000_000;

export const onRequest = runAuthenticatedFunction<{ key?: string }>(async req => {
    const { session } = req;
    if (!session.unit)
        throw new BadRequestError("session.unit missing");

    const bucket = "ward-tools";
    const folder = `unit_${session.unit}`;

    const form = await req.formData();
    const key = String(form.get("key") ?? "");
    const file = form.get("file") as File | null;
    if (!key) throw new BadRequestError("key is required");
    if (!(file instanceof File)) throw new BadRequestError("file is required");

    const { ListObjectsV2Command, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3Client = await getS3Client(req.env);
    const result = await s3Client.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: `${folder}/` })
    );
    let total = 0;
    for (const obj of result.Contents ?? [])
        total += obj.Size ?? 0;

    const remainingBytes = MAX_UPLOAD_BYTES_CAP - total;
    if (remainingBytes <= 0)
        throw new PermissionError("Upload limit reached");

    const allowedSize = Math.min(remainingBytes, MAX_UPLOAD_BYTES_CAP);
    if (file.size > allowedSize)
        throw new PayloadTooLargeError();

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: `${folder}/${key}`,
            Body: new Uint8Array(await file.arrayBuffer()),
            ContentType: file.type || "application/octet-stream",
        })
    );
});
