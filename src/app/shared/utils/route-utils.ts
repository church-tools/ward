import { Type } from "@angular/core";
import { Route, Routes } from "@angular/router";
import { PageComponent } from "../page/page";

export type RouteObject<P extends PageComponent = PageComponent> = {
    admin?: boolean;
    loadComponent: () => Promise<Type<P>>;
    childrenInside?: boolean; // If true, the component will be displayed when children are loaded
} | { [childPath: string]: RouteObject<P> };

export function mapRouteObject(routes?: { [path: string]: RouteObject }, isAdmin = false, parentPath: string[] = [], prependPath = false): Routes {
    return Object.entries(routes ?? {})
        .filter(([_, { loadComponent, admin }]) => !!loadComponent && (!admin || isAdmin))
        .map(([path, { loadComponent, childrenInside, admin, ...children }]) => {
            const fullPath = [...parentPath, path].join('/');
            const route = <Route>{
                path: prependPath ? fullPath : path,
                loadComponent,
                pathMatch: childrenInside ? 'prefix' : 'full',
            };
            return childrenInside
                ? [{ ...route, children: mapRouteObject(children, isAdmin, [...parentPath, path]) }]
                : [route, ...mapRouteObject(children, isAdmin, [...parentPath, path], true)];
        }).flat();
}
