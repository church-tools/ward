/**
 * Angular + Bun Development Server
 *
 * A custom dev server using Bun.serve() that:
 * 1. Serves the Angular application
 * 2. Compiles TypeScript on-the-fly
 * 3. Provides HMR via WebSocket (CSS hot reload, full reload for TS)
 * 4. Handles SPA routing (returns index.html for non-file routes)
 */

import { watch, statSync } from 'fs';
import { join, extname, relative, dirname, resolve, isAbsolute } from 'path';
import * as ts from 'typescript';

const projectRoot = join(import.meta.dir, '..');
const srcDir = join(projectRoot, 'src');
const PORT = parseInt(process.env.PORT || '4201');
const appTsconfigPath = join(srcDir, 'tsconfig.app.json');

// Store WebSocket connections for HMR
const clients = new Set<any>();

// HMR message types
type HMRMessage =
  | { type: 'full-reload' }
  | { type: 'css-update'; path: string; content: string }
  | { type: 'connected' };

// MIME types
const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

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

const tsconfigPathsPlugin = createTsconfigPathsPlugin(appTsconfigPath);

/**
 * Broadcast HMR message to all connected clients
 */
function broadcastHMR(message: HMRMessage) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    try {
      client.send(data);
    } catch (e) {
      clients.delete(client);
    }
  }
}

// Build the application
async function buildApp() {
  const startTime = performance.now();

  const result = await Bun.build({
    entrypoints: [join(srcDir, 'main.ts')],
    outdir: join(projectRoot, '.bun-dev'),
    target: 'browser',
    format: 'esm',
    minify: false,
    sourcemap: 'inline',
    splitting: true,
    define: {
      'process.env.NODE_ENV': '"development"',
      'ngDevMode': 'true',
      'ngJitMode': 'false',
    },
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
          build.onLoad({ filter: /main\.ts$/ }, async (args) => {
            let contents = await Bun.file(args.path).text();
            if (!contents.includes('reflect-metadata')) {
              contents = `import 'reflect-metadata';\n${contents}`;
            }
            return { contents, loader: 'ts' };
          });
        },
      },
    ],
  });

  const endTime = performance.now();

  if (!result.success) {
    console.error('❌ Build failed:');
    for (const log of result.logs) {
      console.error(log);
    }
    return false;
  }

  console.log(`✅ Rebuilt in ${((endTime - startTime)).toFixed(0)}ms`);
  return true;
}

// Read index.html with HMR script injected
async function getIndexHtml(): Promise<string> {
  const indexPath = join(srcDir, 'index.html');
  let html = await Bun.file(indexPath).text();

  // Inject HMR client script
  const hmrScript = `
<script>
  (function() {
    const ws = new WebSocket('ws://localhost:${PORT}/__hmr');

    ws.onopen = function() {
      console.log('[HMR] Connected');
    };

    ws.onmessage = function(event) {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'full-reload':
          console.log('[HMR] Full reload...');
          location.reload();
          break;

        case 'css-update':
          console.log('[HMR] CSS update:', message.path);
          updateCSS(message.path, message.content);
          break;

        case 'connected':
          console.log('[HMR] Ready');
          break;
      }
    };

    ws.onclose = function() {
      console.log('[HMR] Connection lost. Reconnecting...');
      setTimeout(() => location.reload(), 1000);
    };

    ws.onerror = function(error) {
      console.error('[HMR] WebSocket error:', error);
    };

    // CSS hot update without page reload
    function updateCSS(path, content) {
      // For inline styles in Angular components, we need a full reload
      // This could be enhanced to target specific style tags in the future
      const existingStyle = document.querySelector('style[data-hmr-path="' + path + '"]');
      if (existingStyle) {
        existingStyle.textContent = content;
      } else {
        // For component styles embedded in JS, trigger full reload
        // TODO: Implement smarter component style injection
        location.reload();
      }
    }
  })();
</script>
</head>`;

  html = html.replace('</head>', hmrScript);
  return html;
}

// Initial build
console.log('🚀 Starting Angular + Bun development server...\n');
await buildApp();

// Start the server
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Handle WebSocket upgrade for HMR
    if (pathname === '/__hmr') {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // Serve built JS files from .bun-dev
    if (pathname.endsWith('.js') || pathname.endsWith('.js.map')) {
      const filePath = join(projectRoot, '.bun-dev', pathname.slice(1));
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file, {
          headers: { 'Content-Type': 'application/javascript' },
        });
      }
    }

    // Serve static files from src
    if (pathname !== '/' && pathname !== '/index.html') {
      const ext = extname(pathname);
      if (ext && mimeTypes[ext]) {
        const filePath = join(srcDir, pathname);
        const file = Bun.file(filePath);
        if (await file.exists()) {
          return new Response(file, {
            headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' },
          });
        }
      }
    }

    // SPA fallback - serve index.html for all other routes
    const html = await getIndexHtml();
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  },
  websocket: {
    open(ws) {
      clients.add(ws);
      // Send connected message
      ws.send(JSON.stringify({ type: 'connected' }));
    },
    close(ws) {
      clients.delete(ws);
    },
    message() {},
  },
});

console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🚀 Angular + Bun Dev Server (HMR enabled)        ║
║                                                    ║
║   Local:   http://localhost:${PORT.toString().padEnd(23)}║
║                                                    ║
║   Features:                                        ║
║   • Hot Module Replacement (HMR)                   ║
║   • CSS Hot Reload                                 ║
║   • Auto rebuild on file changes                   ║
║                                                    ║
║   Press Ctrl+C to stop                             ║
║                                                    ║
╚════════════════════════════════════════════════════╝
`);

// Watch for file changes
let rebuildTimeout: Timer | null = null;

/**
 * Handle file changes with smart HMR
 */
async function handleFileChange(filename: string) {
  const ext = extname(filename);
  const fullPath = join(srcDir, filename);

  // For standalone CSS files, try hot update
  if (ext === '.css' && !filename.includes('.component.')) {
    try {
      const content = await Bun.file(fullPath).text();
      broadcastHMR({ type: 'css-update', path: filename, content });
      console.log(`   [HMR] CSS updated: ${filename}`);
      return;
    } catch (e) {
      // Fall through to full rebuild
    }
  }

  // For TypeScript and component styles, full rebuild
  const success = await buildApp();
  if (success) {
    broadcastHMR({ type: 'full-reload' });
  }
}

function triggerRebuild(filename: string) {
  if (rebuildTimeout) {
    clearTimeout(rebuildTimeout);
  }
  rebuildTimeout = setTimeout(() => handleFileChange(filename), 100);
}

// Watch src directory for changes
const watcher = watch(srcDir, { recursive: true }, (event, filename) => {
  if (filename && (filename.endsWith('.ts') || filename.endsWith('.html') || filename.endsWith('.css'))) {
    console.log(`\n📝 Change detected: ${filename}`);
    triggerRebuild(filename);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  watcher.close();
  server.stop();
  process.exit(0);
});