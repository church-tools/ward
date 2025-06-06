#!/usr/bin/env pwsh

# SCSS Bundle Optimization Script
# This script helps update all component SCSS files to use shared variables only

Write-Host "SCSS Bundle Optimization - Converting component files to use shared variables" -ForegroundColor Green

# Find all SCSS files except the global ones
$componentScssFiles = Get-ChildItem -Path "src\app" -Recurse -Filter "*.scss" | Where-Object { 
    $_.Name -ne "styles.scss" -and $_.Name -ne "shared.scss" 
}

Write-Host "Found $($componentScssFiles.Count) component SCSS files to update" -ForegroundColor Yellow

foreach ($file in $componentScssFiles) {
    Write-Host "Processing: $($file.FullName)" -ForegroundColor Cyan
    
    $content = Get-Content $file.FullName -Raw
    
    # Skip if already using shared
    if ($content -match '@use "shared"') {
        Write-Host "  - Already using shared imports, skipping" -ForegroundColor Gray
        continue
    }
    
    # Replace multiple @use imports with single shared import
    $patterns = @(
        '@use "animation"[^;]*;',
        '@use "layout"[^;]*;', 
        '@use "font"[^;]*;',
        '@use "color"[^;]*;',
        '@use "card"[^;]*;',
        '@use "breakpoints"[^;]*;',
        '@use "shadow"[^;]*;'
    )
    
    $hasReplacements = $false
    foreach ($pattern in $patterns) {
        if ($content -match $pattern) {
            $hasReplacements = $true
            $content = $content -replace $pattern, ''
        }
    }
    
    if ($hasReplacements) {
        # Add shared import at the top (after any existing filepath comment)
        if ($content -match '^// filepath:.*\n') {
            $content = $content -replace '^(// filepath:.*\n)', "`$1@use `"shared`" as *; // Import only shared variables and mixins, no CSS output`n"
        } else {
            $content = "@use `"shared`" as *; // Import only shared variables and mixins, no CSS output`n" + $content
        }
        
        # Remove variable prefixes (e.g., animation.$duration -> $duration)
        $content = $content -replace 'animation\.\$', '$'
        $content = $content -replace 'font\.\$', '$'
        $content = $content -replace 'color\.\$', '$'
        $content = $content -replace 'card\.\$', '$'
        $content = $content -replace 'breakpoints\.\$', '$'
        $content = $content -replace 'layout\.\$', '$'
        
        # Clean up multiple empty lines
        $content = $content -replace '\n\n\n+', "`n`n"
        
        # Write the updated content
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  - Updated successfully" -ForegroundColor Green
    } else {
        Write-Host "  - No global imports found, skipping" -ForegroundColor Gray
    }
}

Write-Host "`nOptimization complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Test your build: npm run build" -ForegroundColor White
Write-Host "2. Check bundle sizes in dist folder" -ForegroundColor White
Write-Host "3. Run your application to verify everything works" -ForegroundColor White
