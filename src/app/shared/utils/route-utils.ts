import { Type } from "@angular/core";
import { Route, Routes } from "@angular/router";
import { PageComponent } from "../page/page";

export type RouteObject<P extends PageComponent = PageComponent> = {
    loadComponent: () => Promise<Type<P>>;
    childrenInside?: boolean; // If true, the component will be displayed when children are loaded
} | { [childPath: string]: RouteObject<P> };

export function mapRouteObject(routes?: { [path: string]: RouteObject }, parentPath: string[] = [], prependPath = false): Routes {
    return Object.entries(routes ?? {})
        .filter(([, { loadComponent }]) => !!loadComponent)
        .map(([path, { loadComponent, childrenInside, ...children }]) => {
            const fullPath = [...parentPath, path].join('/');
            const route = <Route>{
                path: prependPath ? fullPath : path,
                loadComponent,
                data: { animation: fullPath },
                pathMatch: childrenInside ? 'prefix' : 'full',
            };
            if (childrenInside) {
                return <Routes>[{ ...route, children: mapRouteObject(children, [...parentPath, path]) }];
            } else {
                return [route, ...mapRouteObject(children, [...parentPath, path], true)];
            }
        }).flat();
}
