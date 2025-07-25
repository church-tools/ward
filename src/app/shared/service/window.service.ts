import { DOCUMENT, EventEmitter, inject, Injectable, signal } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { filter, tap } from "rxjs";
import { AsyncState } from "../utils/async-state";
import { executeOnce } from "../utils/flow-control-utils";
import { xcomputed } from "../utils/signal-utils";

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
    readonly onRouteChange = new EventEmitter<string>();
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
    readonly isExtraLarge = xcomputed([this.size], size => size > WindowSize.lg);
    readonly isOnline = signal(navigator.onLine);
    readonly onlineState = new AsyncState<boolean>();

    constructor() {
        this.document.addEventListener('DOMContentLoaded', () => {
            this._focused.set(this.document.hasFocus?.());
        }, { once: true });
        this.document.defaultView!.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', event => {
            this._darkColorScheme.set(event.matches);
        });
        this.document.defaultView!.addEventListener?.('keydown', async event => {
            executeOnce(() => this.onKeyPress.emit(event), this.timeout);
        });
        this.document.defaultView!.addEventListener?.('resize', async event => {
            executeOnce(() => {
                const newSize = this.getSize(this.document.defaultView!.innerWidth);
                if (this.size() !== newSize) {
                    this._size.set(newSize);
                    this.onResizeBreakpoint.emit(newSize);
                }
                this.onResize.emit(window.screen);
            }, this.timeout);
        });
        if (navigator.onLine)
            this.onlineState.set(true);
        this.document.defaultView!.addEventListener?.('online', () => { this.isOnline.set(true); this.onlineState.set(true); });
        this.document.defaultView!.addEventListener?.('offline', () => { this.isOnline.set(false); this.onlineState.unset(); });
        this.router.events.subscribe(res => {
            if (res instanceof NavigationEnd) {
                this.onRouteChange.emit(res.urlAfterRedirects);
                this._currentRoute.set(res.urlAfterRedirects);
            }
        });
        if (this.document.defaultView) {
            this.document.defaultView.onfocus = () => {
                const activeElement = this.document.activeElement as HTMLElement | null;
                if (activeElement)
                    activeElement["blur"]?.(); // Prevents automatic focus on input fields
                this._focused.set(true);
                this.onFocusChange.emit(true);
            };
            this.document.defaultView.onblur = () => {
                this._focused.set(false);
                this.onFocusChange.emit(false);
            };
        }
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

    private getSize(width: number): WindowSize {
        if (width < BREAKPOINT_SM) return WindowSize.sm;
        if (width < BREAKPOINT_MD) return WindowSize.md;
        if (width < BREAKPOINT_LG) return WindowSize.lg;
        return WindowSize.xl;
    }

}