/**
 * Angular + Bun Build Script
 *
 * This script compiles and bundles an Angular application using Bun's native bundler.
 * It bypasses the Angular CLI entirely.
 *
 * Key challenges solved:
 * 1. Angular decorators require reflect-metadata
 * 2. Template and style inlining
 * 3. Proper ESM output for browser
 * 4. Content hashing for cache busting
 * 5. Gzip/Brotli compression
 */

import { readFileSync, existsSync, mkdirSync, rmSync, statSync } from 'fs';
import { join, basename, dirname, resolve, isAbsolute, extname } from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';
import * as ts from 'typescript';

const projectRoot = join(import.meta.dir, '..');
const srcDir = join(projectRoot, 'src');
const distDir = join(projectRoot, 'dist');
const isProduction = process.env.NODE_ENV === 'production';
const appTsconfigPath = join(srcDir, 'tsconfig.app.json');

type AliasRule = {
  prefix: string;
  suffix: string;
  targets: string[];
  hasWildcard: boolean;
};

const RESOLVE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.html',
  '.d.ts',
];

function pathExistsAsFile(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function resolveWithExtensions(basePath: string): string | null {
  if (pathExistsAsFile(basePath)) return basePath;

  const extension = extname(basePath);
  const hasKnownExtension = extension.length > 0 && RESOLVE_EXTENSIONS.includes(extension);
  if (!hasKnownExtension) {
    for (const ext of RESOLVE_EXTENSIONS) {
      const withExt = `${basePath}${ext}`;
      if (pathExistsAsFile(withExt)) return withExt;
    }

    for (const ext of RESOLVE_EXTENSIONS) {
      const indexPath = join(basePath, `index${ext}`);
      if (pathExistsAsFile(indexPath)) return indexPath;
    }
  }

  return null;
}

function normalizeBaseUrl(tsconfigPath: string, baseUrl?: string): string {
  if (!baseUrl) return dirname(tsconfigPath);
  return isAbsolute(baseUrl) ? baseUrl : resolve(dirname(tsconfigPath), baseUrl);
}

function loadTsconfigPaths(tsconfigPath: string): { baseUrl: string; paths: Record<string, string[]> } {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n');
    throw new Error(`Failed to read tsconfig at ${tsconfigPath}: ${message}`);
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(tsconfigPath)
  );

  return {
    baseUrl: normalizeBaseUrl(tsconfigPath, parsed.options.baseUrl),
    paths: parsed.options.paths ?? {},
  };
}

function buildAliasRules(paths: Record<string, readonly string[]>): AliasRule[] {
  return Object.entries(paths).map(([pattern, targets]) => {
    const starIndex = pattern.indexOf('*');
    if (starIndex === -1) {
      return {
        prefix: pattern,
        suffix: '',
        targets: [...targets],
        hasWildcard: false,
      };
    }

    return {
      prefix: pattern.slice(0, starIndex),
      suffix: pattern.slice(starIndex + 1),
      targets: [...targets],
      hasWildcard: true,
    };
  });
}

function matchAlias(rule: AliasRule, specifier: string): string | null {
  if (!rule.hasWildcard) {
    return specifier === rule.prefix ? '' : null;
  }

  if (!specifier.startsWith(rule.prefix) || !specifier.endsWith(rule.suffix)) return null;
  return specifier.slice(rule.prefix.length, specifier.length - rule.suffix.length);
}

function resolveAliasSpecifier(specifier: string, rules: AliasRule[], baseUrl: string): string | null {
  for (const rule of rules) {
    const wildcard = matchAlias(rule, specifier);
    if (wildcard === null) continue;

    for (const target of rule.targets) {
      const mappedTarget = rule.hasWildcard ? target.replace('*', wildcard) : target;
      const candidate = resolve(baseUrl, mappedTarget);
      const resolved = resolveWithExtensions(candidate);
      if (resolved) return resolved;
    }
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createTsconfigPathsPlugin(tsconfigPath: string) {
  const { baseUrl, paths } = loadTsconfigPaths(tsconfigPath);
  const rules = buildAliasRules(paths);
  const filter = rules.length
    ? new RegExp(`^(${rules.map(rule => escapeRegExp(rule.prefix)).join('|')})`)
    : /$^/;

  return {
    name: 'tsconfig-paths',
    setup(build: { onResolve: Function }) {
      if (rules.length === 0) return;

      build.onResolve({ filter }, (args: { path: string }) => {
        const resolved = resolveAliasSpecifier(args.path, rules, baseUrl);
        return resolved ? { path: resolved } : undefined;
      });
    },
  };
}

console.log('🔨 Building Angular + Bun application...\n');

// Clean dist directory
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
}
mkdirSync(distDir, { recursive: true });

// Build with Bun
const startTime = performance.now();

/**
 * Compress assets with gzip and brotli
 */
async function compressAssets(files: { path: string; size: number }[]) {
  console.log('\n📦 Compressing assets...');
  let compressedCount = 0;

  for (const file of files) {
    // Only compress JS and CSS files
    if (!file.path.endsWith('.js') && !file.path.endsWith('.css')) continue;
    if (file.path.endsWith('.map')) continue;

    const content = await Bun.file(file.path).arrayBuffer();
    const buffer = Buffer.from(content);

    // Gzip compression
    const gzipped = gzipSync(buffer, { level: 9 });
    await Bun.write(`${file.path}.gz`, gzipped);

    // Brotli compression
    const brotli = brotliCompressSync(buffer);
    await Bun.write(`${file.path}.br`, brotli);

    compressedCount++;
  }

  console.log(`   Compressed ${compressedCount} files (gzip + brotli)`);
}

/**
 * Minify CSS (basic minification)
 */
function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ')             // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove space around punctuation
    .replace(/;}/g, '}')              // Remove last semicolon
    .trim();
}

try {
  const tsconfigPathsPlugin = createTsconfigPathsPlugin(appTsconfigPath);
  const result = await Bun.build({
    entrypoints: [join(srcDir, 'main.ts')],
    outdir: distDir,
    target: 'browser',
    format: 'esm',
    minify: isProduction,
    sourcemap: isProduction ? 'external' : 'inline',
    splitting: true,
    // Content hashing for cache busting
    naming: isProduction
      ? {
          entry: '[name]-[hash].js',
          chunk: '[name]-[hash].js',
          asset: '[name]-[hash].[ext]',
        }
      : undefined,
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'ngDevMode': isProduction ? 'false' : 'true',
      'ngJitMode': 'false',
      '__DEV__': isProduction ? 'false' : 'true',
    },
    external: [],
    // Handle Angular-specific requirements
    loader: {
      '.ts': 'ts',
      '.d.ts': 'ts',
      '.html': 'text',
      '.css': 'text',
    },
    plugins: [
      tsconfigPathsPlugin,
      {
        name: 'angular-decorator-plugin',
        setup(build) {
          // Add reflect-metadata polyfill at the start
          build.onLoad({ filter: /main\.ts$/ }, async (args) => {
            let contents = await Bun.file(args.path).text();

            // Ensure reflect-metadata is imported first
            if (!contents.includes('reflect-metadata')) {
              contents = `import 'reflect-metadata';\n${contents}`;
            }

            return {
              contents,
              loader: 'ts',
            };
          });
        },
      },
    ],
  });

  if (!result.success) {
    console.error('❌ Build failed:');
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  // Find the main entry file (with hash if production)
  const mainOutput = result.outputs.find(o =>
    basename(o.path).startsWith('main') && o.path.endsWith('.js') && !o.path.endsWith('.map')
  );

  if (!mainOutput) {
    throw new Error('Could not find main.js output');
  }

  const mainFileName = basename(mainOutput.path);

  // Copy and update index.html with hashed filename
  let indexHtml = readFileSync(join(srcDir, 'index.html'), 'utf-8');
  indexHtml = indexHtml.replace(
    '<script type="module" src="/main.js"></script>',
    `<script type="module" src="/${mainFileName}"></script>`
  );
  await Bun.write(join(distDir, 'index.html'), indexHtml);

  const endTime = performance.now();
  const buildTime = ((endTime - startTime) / 1000).toFixed(2);

  console.log('✅ Build completed successfully!');
  console.log(`⏱️  Build time: ${buildTime}s`);
  console.log(`📁 Output: ${distDir}`);
  console.log('\nOutput files:');

  // Calculate total size
  let totalSize = 0;
  const jsFiles: { path: string; size: number }[] = [];

  for (const output of result.outputs) {
    const size = output.size / 1024;
    totalSize += output.size;
    console.log(`  - ${basename(output.path)} (${size.toFixed(2)} KB)`);

    if (output.path.endsWith('.js')) {
      jsFiles.push({ path: output.path, size: output.size });
    }
  }

  console.log(`\n📊 Total bundle size: ${(totalSize / 1024).toFixed(2)} KB`);

  // Compress in production
  if (isProduction) {
    await compressAssets(result.outputs.map(o => ({ path: o.path, size: o.size })));

    // Remove source maps from dist in production (optional - keep for debugging)
    // for (const output of result.outputs) {
    //   if (output.path.endsWith('.map')) {
    //     rmSync(output.path);
    //   }
    // }
  }

} catch (error) {
  console.error('❌ Build error:', error);
  process.exit(1);
}