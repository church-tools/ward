import { environment } from "../../../environments/environment";

export function getSiteOrigin() {
    return environment.production
        ? window.location.origin
        : 'http://localhost:4201';
}

export function isHttpUrl(url: string) {
    return url.startsWith('http://') || url.startsWith('https://');
}

export function normalizeInternalUrl(url: string) {
    if (!url)
        return '/';
    return url.startsWith('/') || isHttpUrl(url)
        ? url
        : `/${url}`;
}

export function hasQueryParam(url: string, param: string) {
    const queryString = url.split('?')[1]?.split('#')[0];
    if (!queryString)
        return false;
    const params = new URLSearchParams(queryString);
    return params.has(param);
}