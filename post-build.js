const fs = require('fs');
const path = require('path');
const purgecss = require('@fullhuman/postcss-purgecss');
const postcss = require('postcss');

const distDir = path.join(__dirname, 'dist/ward-tools');

async function purgeUnusedCSS() {
  try {
    // Find all CSS files in the dist directory
    const cssFiles = [];
    
    function walkDir(dir) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (file.endsWith('.css')) {
          cssFiles.push(fullPath);
        }
      });
    }
    
    walkDir(distDir);
    
    if (cssFiles.length === 0) {
      console.log('⚠️  No CSS files found in dist directory');
      return;
    }
    
    console.log(`🧹 Processing ${cssFiles.length} CSS file(s) with PurgeCSS...`);
    
    for (const cssFile of cssFiles) {
      const filename = path.relative(distDir, cssFile);
      const originalSize = fs.statSync(cssFile).size;
      
      const css = fs.readFileSync(cssFile, 'utf-8');
      
      const colorNames = [
        'palevioletred',
        'red',
        'tomato',
        'coral',
        'chocolate',
        'orange',
        'goldenrod',
        'yellow',
        'yellowgreen',
        'lawngreen',
        'green',
        'aquamarine',
        'turquoise',
        'teal',
        'powderblue',
        'skyblue',
        'steelblue',
        'dodgerblue',
        'royalblue',
        'blue',
        'mediumpurple',
        'indigo',
        'magenta',
        'deeppink'
      ];
      const semanticColorNames = [
        'accent',
        'accent-variation-1',
        'accent-variation-2',
        'success',
        'warning',
        'danger'
      ];
      const allColorNames = [...colorNames, ...semanticColorNames].join('|');

      const purgePlugin = purgecss({
        content: [
          'src/**/*.{html,ts}',
          'src/**/*.component.ts'
        ],
        safelist: {
          standard: [
            // Angular core classes
            /^ng-/,
            /^ng[A-Z]/,
            // Angular Material (if used)
            /^mat-/,
            /^cdk-/,
            // Specific pattern matches only (more aggressive)
            'ng-enter',
            'ng-leave',
            'ng-enter-active',
            'ng-leave-active',
            // Form control states - more specific
            'ng-touched',
            'ng-untouched',
            'ng-valid',
            'ng-invalid',
            'ng-pristine',
            'ng-dirty',
            'ng-pending',
          ],
          deep: [
            // Only shadow prefixed classes
            /^shadow-/,
            // Color classes - more specific patterns
            new RegExp(`^(${allColorNames})$`),
            new RegExp(`^(${allColorNames})-(btn|bg|fg|text|border|active|active-bg|high-contrast|high-contrast-bg|mute|mute-bg)$`),
            new RegExp(`^(from|to)-(${allColorNames})$`),
            /^bg-gradient$/,
            /^fg-gradient$/,
            /^color-(bg|fg|border|text|active)$/,
            // Button variants
            /^btn(-[a-z0-9]+)?$/,
            // Card and component styles
            /^(card|form|input|link)(-[a-z0-9]+)?$/,
            // Spacing - be more selective
            /^(m|p|gap|gap-[xy])-[0-9]+$/,
            /^(mx|my|px|py|mt|mb|ml|mr|pt|pb|pl|pr)-[0-9]+$/,
            /^-?(m|p)(x|y)?-[0-9]+$/,
            // Size utilities
            /^(w|h|min-[wh]|max-[wh])-[0-9]+$/,
            // Grid and flex
            /^(col|grid|flex|justify|items|self)(-[a-z0-9]+)?$/,
            // Position and display
            /^(absolute|relative|sticky|fixed|block|inline|hidden|flex)(-[a-z0-9]+)?$/,
            // Other utilities
            /^(opacity|z)-[0-9]+$/,
            /^(font|heading|animation|overflow)(-[a-z0-9]+)?$/,
          ]
        },
        extractors: [
          {
            extractor: (content) => {
              return content.match(/[\w-/%#:.]+/g) || [];
            },
            extensions: ['html', 'ts']
          }
        ],
        keyframes: true,
        variables: true
      });
      
      const result = await postcss([purgePlugin]).process(css, {
        from: undefined
      });
      
      const newSize = result.css.length;
      const reduction = Math.round(((originalSize - newSize) / originalSize) * 100);
      
      fs.writeFileSync(cssFile, result.css, 'utf-8');
      
      console.log(`  ✓ ${filename}: ${(originalSize / 1024).toFixed(2)}kB → ${(newSize / 1024).toFixed(2)}kB (${reduction}% reduction)`);
    }
    
    console.log('✅ PurgeCSS complete!');
  } catch (error) {
    console.error('❌ Error running PurgeCSS:', error.message);
    process.exit(1);
  }
}

purgeUnusedCSS();
