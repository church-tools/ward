import { FileAccessMethod, signFileAccessUrl } from "../shared/file-signing-utils";
import { BadRequestError, runFunction } from "../shared/functions-utils";

export const onRequest = runFunction(async (req, params: { key?: string; method?: FileAccessMethod }) => {
    const { session } = req;
    if (!session.unit)
        throw new BadRequestError("session.unit missing");

    const { key, method } = params;
    if (!key || !method) throw new BadRequestError("key and method are required");

    return { url: await signFileAccessUrl(req.env, session.unit, key, method) };
});

export type PresignFileAccessFunction = typeof onRequest;