import { environment } from "../../../environments/environment";

export function getSiteOrigin() {
    return environment.production
        ? window.location.origin
        : 'http://localhost:4201';
}