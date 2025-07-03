import { Type } from "@angular/core";
import { Route, Routes } from "@angular/router";
import { PageComponent } from "../page/page";

export type RouteObject<P extends PageComponent = PageComponent> = {
    loadComponent: () => Promise<Type<P>>;
    childrenInside?: boolean; // If true, the component will be displayed when children are loaded
} | { [childPath: string]: RouteObject<P> };

export function mapRouteObject(routes?: { [path: string]: RouteObject }): Routes {
    return Object.entries(routes ?? {})
        .filter(([, { loadComponent }]) => !!loadComponent)
        .map(([path, { loadComponent, childrenInside, ...children }]) => <Route>{
            path,
            loadComponent,
            data: { animation: path },
            pathMatch: childrenInside ? 'prefix' : 'full',
            children: mapRouteObject(children),
        });
}
