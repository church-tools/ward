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
