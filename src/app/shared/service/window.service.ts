import { DOCUMENT, EventEmitter, inject, Injectable, signal } from "@angular/core";
import { NavigationEnd, NavigationStart, Router, UrlTree } from "@angular/router";
import { filter, tap } from "rxjs";
import { AsyncState } from "../utils/async-state";
import { executeOnce } from "../utils/flow-control-utils";
import { xcomputed, xeffect } from "../utils/signal-utils";
import { getParentUrl, getRoutePaths, isInsideParentUrl, RoutePathObject } from "../utils/route-utils";
import { hasQueryParam, isHttpUrl, normalizeInternalUrl } from "../utils/url-utils";

const CTRL_KEY = navigator.platform.match('Mac') ? 'metaKey' : 'ctrlKey';

export enum WindowSize { sm = 1, md = 2, lg = 3, xl = 4 }

const BREAKPOINT_SM = 640;
const BREAKPOINT_MD = 1007;
const BREAKPOINT_LG = 1366;

@Injectable({
    providedIn: 'root',
})
export class WindowService {

    private readonly document = inject<Document>(DOCUMENT);
    private readonly router = inject(Router);
    readonly timeout = 10;

    private readonly onKeyPress = new EventEmitter<KeyboardEvent>();
    readonly onResize = new EventEmitter<Screen>();
    readonly onResizeBreakpoint = new EventEmitter<WindowSize>();
    readonly onFocusChange = new EventEmitter<boolean>();

    private readonly _currentRoute = signal<string>(this.router.url);
    readonly currentRoute = this._currentRoute.asReadonly();
    private readonly _size = signal<WindowSize>(this.getSize(this.document.defaultView!.innerWidth));
    readonly size = this._size.asReadonly();
    private readonly _focused = signal(this.document.hasFocus?.()); 
    readonly focused = this._focused.asReadonly();
    private readonly _darkColorScheme = signal(this.document.defaultView!.matchMedia?.('(prefers-color-scheme: dark)').matches); 
    readonly darkColorScheme = this._darkColorScheme.asReadonly();
    readonly isSmall = xcomputed([this.size], size => size === WindowSize.sm);
    readonly isLarge = xcomputed([this.size], size => size > WindowSize.md);
    readonly mobileOS = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    readonly hasTouch = 'ontouchstart' in window;
    readonly hasMouse = !('ontouchstart' in window) || this.document.defaultView?.matchMedia?.('(pointer: fine)').matches;
    readonly isExtraLarge = xcomputed([this.size], size => size > WindowSize.lg);
    readonly isOnline = signal(navigator.onLine);
    readonly backUrl = signal<string | null>(null);
    readonly onlineState = new AsyncState<boolean>();
    readonly titleBarColors = signal<{ focused: { light: string, dark: string }, unfocused: { light: string, dark: string } } | null>(null);

    private allRoutePaths: RoutePathObject[] | null = null;
    private routePathsPromise: Promise<RoutePathObject[]> | null = null;
    private isHandlingMobileBack = false;

    constructor() {
        this.document.addEventListener('DOMContentLoaded', () => {
            this._focused.set(this.document.hasFocus?.());
        }, { once: true });
        const defaultView = this.document.defaultView;
        if (!defaultView) throw new Error("WindowService requires access to the defaultView of the document.");
        void this.ensureAllRoutePaths();
        this.setupViewListeners(defaultView);
        this.setupOnlineStateListeners(defaultView);
        this.setupRouterListeners();
        this.setupFocusListeners(defaultView);
        xeffect([this._focused, this.titleBarColors], (focused, colors) => {
            if (!colors) return;
            const color = focused ? colors.focused : colors.unfocused;
            this.document.querySelector?.('meta[name=theme-color][media="(prefers-color-scheme: light)"]')
                ?.setAttribute('content', color.light);
            this.document.querySelector?.('meta[name=theme-color][media="(prefers-color-scheme: dark)"]')
                ?.setAttribute('content', color.dark);
        });
    }

    onKeyPressed(keyName: string) {
        return this.onKeyPress.pipe(filter(event => event.key === keyName));
    }

    onCtrlAndKeyPressed(keyName: string) {
        return this.onKeyPress.pipe(
            filter(event => event[CTRL_KEY] && event.key === keyName),
            tap(event => event.preventDefault())
        );
    }

    setTitleBarColor(colors: { focused: { light: string, dark: string }, unfocused: { light: string, dark: string } }) {
        this.titleBarColors.set(colors);
    }

    shouldReplaceHistory(target: string | UrlTree): boolean {
        const url = normalizeInternalUrl(this.toUrl(target));
        if (isHttpUrl(url))
            return false;
        if (hasQueryParam(url, 'popover'))
            return true;
        if (!this.allRoutePaths) {
            void this.ensureAllRoutePaths();
            return false;
        }
        return isInsideParentUrl(url, this.allRoutePaths);
    }

    private getSize(width: number): WindowSize {
        if (width < BREAKPOINT_SM) return WindowSize.sm;
        if (width < BREAKPOINT_MD) return WindowSize.md;
        if (width < BREAKPOINT_LG) return WindowSize.lg;
        return WindowSize.xl;
    }

    private shouldHandleMobileBack(): boolean {
        return this.isSmall() && (this.mobileOS || this.hasTouch);
    }

    private setupViewListeners(defaultView: Window) {
        defaultView.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', event => {
            this._darkColorScheme.set(event.matches);
        });
        defaultView.addEventListener?.('keydown', event => {
            executeOnce(() => this.onKeyPress.emit(event), this.timeout);
        });
        defaultView.addEventListener?.('resize', () => {
            executeOnce(() => {
                const newSize = this.getSize(defaultView.innerWidth);
                if (this.size() !== newSize) {
                    this._size.set(newSize);
                    this.onResizeBreakpoint.emit(newSize);
                }
                this.onResize.emit(window.screen);
            }, this.timeout);
        });
    }

    private setupOnlineStateListeners(defaultView: Window) {
        if (navigator.onLine)
            this.onlineState.set(true);
        defaultView.addEventListener?.('online', () => { this.isOnline.set(true); this.onlineState.set(true); });
        defaultView.addEventListener?.('offline', () => { this.isOnline.set(false); this.onlineState.unset(); });
    }

    private setupRouterListeners() {
        this.router.events.pipe(filter((e): e is NavigationStart => e instanceof NavigationStart)).subscribe(res => {
            if (this.isHandlingMobileBack || res.navigationTrigger !== 'popstate' || !this.shouldHandleMobileBack()) return;
            const parentUrl = this.backUrl();
            if (!parentUrl || parentUrl === this.currentRoute()) return;
            this.isHandlingMobileBack = true;
            this.router.navigateByUrl(parentUrl, { replaceUrl: true })
                .finally(() => {
                    this.isHandlingMobileBack = false;
                });
        });
        this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(async res => {
            this._currentRoute.set(res.urlAfterRedirects);
            this.backUrl.set(await this.getBackUrl(res.urlAfterRedirects));
        });
    }

    private setupFocusListeners(defaultView: Window) {
        defaultView.onfocus = () => {
            const activeElement = this.document.activeElement as HTMLElement | null;
            if (activeElement)
                activeElement["blur"]?.(); // Prevents automatic focus on input fields
            this._focused.set(true);
            this.onFocusChange.emit(true);
        };
        defaultView.onblur = () => {
            this._focused.set(false);
            this.onFocusChange.emit(false);
        };
    }

    private async getBackUrl(url: string): Promise<string | null> {
        const routePaths = await this.ensureAllRoutePaths();
        const parentUrl = getParentUrl(url, routePaths);
        return parentUrl && isInsideParentUrl(url, routePaths)
            ? getParentUrl(parentUrl, routePaths)
            : parentUrl;
    }

    private toUrl(target: string | UrlTree): string {
        return typeof target === 'string'
            ? target
            : this.router.serializeUrl(target);
    }

    private async ensureAllRoutePaths() {
        if (this.allRoutePaths)
            return this.allRoutePaths;
        this.routePathsPromise ??= this.getAllRoutePaths().then(routePaths => {
            this.allRoutePaths = routePaths;
            return routePaths;
        });
        return this.routePathsPromise;
    }

    private async getAllRoutePaths() {
        return [
            ...getRoutePaths((await import('@/private/private.routes')).privateTabs),
            ...getRoutePaths((await import('@/public/public.routes')).publicTabs)
        ];
    }

}