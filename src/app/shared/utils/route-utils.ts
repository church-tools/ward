import { Type } from "@angular/core";
import { Route, Routes } from "@angular/router";
import { PageComponent } from "../page/page";

export type RouteObject<P extends PageComponent = PageComponent> = {
    admin?: boolean;
    loadComponent: () => Promise<Type<P>>;
    insideParent?: true; // On child: true to render inside parent
} | { [childPath: string]: RouteObject<P> };

export function mapRouteObject(routes?: { [path: string]: RouteObject }, isAdmin = false, parentPath: string[] = [], prependPath = false): Routes {
    return Object.entries(routes ?? {})
        .filter(([_, { loadComponent, admin }]) => !!loadComponent && (!admin || isAdmin))
        .map(([path, { loadComponent, admin, ...children }]) => {
            const fullPath = [...parentPath, path].join('/');
            const { insideChildren, outsideChildren } = Object.entries(children).reduce(
                (acc, [childPath, childRoute]) => {
                    const target = (childRoute as RouteObject).insideParent ? acc.insideChildren : acc.outsideChildren;
                    target[childPath] = childRoute;
                    return acc;
                },
                { insideChildren: {} as { [childPath: string]: RouteObject }, outsideChildren: {} as { [childPath: string]: RouteObject } }
            );

            const hasInsideChildren = Object.keys(insideChildren).length > 0;
            const route = <Route>{
                path: prependPath ? fullPath : path,
                loadComponent,
                pathMatch: hasInsideChildren ? 'prefix' : 'full',
            };

            const nestedRoutes = hasInsideChildren
                ? [{ ...route, children: mapRouteObject(insideChildren, isAdmin, [...parentPath, path]) }]
                : [route];

            return [
                ...nestedRoutes,
                ...mapRouteObject(outsideChildren, isAdmin, [...parentPath, path], true),
            ];
        }).flat();
}

export function getRoutePaths(routes?: { [path: string]: any }, parentPath: string | null = null): { path: string, parent: string | null }[] {
    return Object.entries(routes ?? {})
        .filter(([_, route]) => typeof route === 'object' && route !== null)
        .map(([path, route]) => {
            const fullPath = parentPath ? `${parentPath}/${path}` : path;
            const { loadComponent, admin, insideParent, translateId, icon, onBottom, ...children } = route;
            const paths = [];
            if (loadComponent) {
                paths.push({ path: fullPath, parent: parentPath });
            }
            paths.push(...getRoutePaths(children, fullPath));
            return paths;
        }).flat();
}

export function getParentUrl(url: string, routePaths: { path: string, parent: string | null }[]): string | null {
    const pathOnly = url.split('?')[0].split('#')[0];
    const urlSegments = pathOnly.split('/').filter(s => s);

    let bestMatch: { route: { path: string, parent: string | null }, score: number } | null = null;

    for (const route of routePaths) {
        const routeSegments = route.path.split('/').filter(s => s);
        if (routeSegments.length !== urlSegments.length) continue;

        let match = true;
        let score = 0;
        for (let i = 0; i < routeSegments.length; i++) {
            if (routeSegments[i].startsWith(':')) {
                if (!/^\d+$/.test(urlSegments[i])) {
                    match = false;
                    break;
                }
            } else if (routeSegments[i] === urlSegments[i]) {
                score++;
            } else {
                match = false;
                break;
            }
        }

        if (match) {
            if (!bestMatch || score > bestMatch.score) {
                bestMatch = { route, score };
            }
        }
    }

    if (bestMatch && bestMatch.route.parent) {
        const parentSegments = bestMatch.route.parent.split('/').filter(s => s);
        return '/' + urlSegments.slice(0, parentSegments.length).join('/');
    }

    return null;
}
