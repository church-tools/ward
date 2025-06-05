import { environment } from "../../../environments/environment";

export function getSiteOrigin() {
    return environment.production
        ? window.location.origin + '/ward'
        : 'http://localhost:4200';
}