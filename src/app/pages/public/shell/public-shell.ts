import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../../../shared/supabase.service';
import WindowService from '../../../shared/window.service';

@Component({
    selector: 'app-public-shell',
    templateUrl: './public-shell.html',
    styleUrl: './public-shell.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterOutlet],
})
export class PublicShellComponent implements OnInit {

    protected readonly windowService = inject(WindowService);
    private readonly supabaseService = inject(SupabaseService);
    private readonly router = inject(Router);

    constructor() {
    }

    ngOnInit() {
        
    }

}