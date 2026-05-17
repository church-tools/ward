#!/usr/bin/env bun
/**
 * Angular Bun CLI
 *
 * A drop-in replacement for Angular CLI that uses Bun under the hood.
 * Provides familiar `ng` commands mapped to Bun scripts.
 */

import { parseArgs } from 'util';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
    configuration: { type: 'string', short: 'c' },
    port: { type: 'string', short: 'p' },
    open: { type: 'boolean', short: 'o' },
    watch: { type: 'boolean', short: 'w' },
    coverage: { type: 'boolean' },
    ssr: { type: 'boolean' },
  },
  allowPositionals: true,
  strict: false,
});

const [command, ...args] = positionals;

async function main() {
  if (values.help || !command) {
    printHelp();
    return;
  }

  if (values.version) {
    await printVersion();
    return;
  }

  switch (command) {
    case 'serve':
    case 's':
      await serve(values);
      break;
    case 'build':
    case 'b':
      await build(values);
      break;
    case 'test':
    case 't':
      await test(values);
      break;
    case 'generate':
    case 'g':
      await generate(args, values);
      break;
    case 'version':
    case 'v':
      await printVersion();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run `ng --help` for available commands.');
      process.exit(1);
  }
}

async function serve(options: Record<string, any>) {
  if (options.port) {
    process.env.PORT = options.port;
  }

  const script = options.ssr ? './scripts/ssr-server.ts' : './scripts/dev-server.ts';
  const proc = Bun.spawn(['bun', 'run', script], {
    stdio: ['inherit', 'inherit', 'inherit'],
  });

  if (options.open) {
    const port = options.port || (options.ssr ? '4000' : '4200');
    setTimeout(() => {
      Bun.spawn(['open', `http://localhost:${port}`], { stdio: 'ignore' });
    }, 2000);
  }

  await proc.exited;
}

async function build(options: Record<string, any>) {
  const config = options.configuration || 'production';
  process.env.NODE_ENV = config === 'production' ? 'production' : 'development';

  const script = options.ssr ? './scripts/build-ssr.ts' : './scripts/build.ts';
  const proc = Bun.spawn(['bun', 'run', script], {
    stdio: ['inherit', 'inherit', 'inherit'],
  });

  await proc.exited;
}

async function test(options: Record<string, any>) {
  const args = ['vitest'];

  if (options.watch) {
    // No --run flag for watch mode
  } else {
    args.push('run');
  }

  if (options.coverage) {
    args.push('--coverage');
  }

  const proc = Bun.spawn(args, {
    stdio: ['inherit', 'inherit', 'inherit'],
  });

  await proc.exited;
}

async function generate(args: string[], options: Record<string, any>) {
  const [schematic, name] = args;

  if (!schematic || !name) {
    console.error('Usage: ng generate <schematic> <name>');
    console.log('\nAvailable schematics:');
    console.log('  component, c   Generate a new component');
    console.log('  service, s     Generate a new service');
    console.log('  page, p        Generate a new page component');
    process.exit(1);
  }

  const templates: Record<string, (name: string) => string> = {
    component: (n) => componentTemplate(n),
    c: (n) => componentTemplate(n),
    service: (n) => serviceTemplate(n),
    s: (n) => serviceTemplate(n),
    page: (n) => pageTemplate(n),
    p: (n) => pageTemplate(n),
  };

  const template = templates[schematic];
  if (!template) {
    console.error(`Unknown schematic: ${schematic}`);
    console.log('Available: component, service, page');
    process.exit(1);
  }

  const content = template(name);
  const kebabName = toKebabCase(name);

  let filePath: string;
  if (schematic === 'page' || schematic === 'p') {
    filePath = `./src/app/pages/${kebabName}.component.ts`;
  } else if (schematic === 'service' || schematic === 's') {
    filePath = `./src/app/services/${kebabName}.service.ts`;
  } else {
    filePath = `./src/app/components/${kebabName}.component.ts`;
  }

  // Ensure directory exists
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  await Bun.spawn(['mkdir', '-p', dir]).exited;

  await Bun.write(filePath, content.trim());
  console.log(`CREATE ${filePath}`);
}

function componentTemplate(name: string): string {
  const pascalName = toPascalCase(name);
  const kebabName = toKebabCase(name);

  return `
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-${kebabName}',
  standalone: true,
  template: \`
    <div class="${kebabName}">
      <h2>${pascalName} works!</h2>
    </div>
  \`,
  styles: [\`
    .${kebabName} {
      padding: 1rem;
    }
  \`]
})
export class ${pascalName}Component {
}
`;
}

function pageTemplate(name: string): string {
  const pascalName = toPascalCase(name);
  const kebabName = toKebabCase(name);

  return `
import { Component } from '@angular/core';

@Component({
  selector: 'app-${kebabName}',
  standalone: true,
  template: \`
    <div class="${kebabName}-page">
      <h2>${pascalName}</h2>
      <p>This is the ${name} page.</p>
    </div>
  \`,
  styles: [\`
    .${kebabName}-page {
      padding: 1rem;
    }

    h2 {
      margin-bottom: 1rem;
    }
  \`]
})
export class ${pascalName}Component {
}
`;
}

function serviceTemplate(name: string): string {
  const pascalName = toPascalCase(name);

  return `
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ${pascalName}Service {
  constructor() {}
}
`;
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase());
}

async function printVersion() {
  const pkg = await Bun.file('./package.json').json();
  console.log(`Angular Bun CLI v${pkg.version || '1.0.0'}`);
  console.log(`Bun ${Bun.version}`);

  // Get Angular version
  try {
    const angularCore = await Bun.file('./node_modules/@angular/core/package.json').json();
    console.log(`Angular ${angularCore.version}`);
  } catch {
    // Ignore if not found
  }
}

function printHelp() {
  console.log(`
Angular Bun CLI

A drop-in replacement for Angular CLI that uses Bun for faster builds.

Usage: ng <command> [options]

Commands:
  serve, s       Start development server
  build, b       Build the application
  test, t        Run unit tests
  generate, g    Generate component/service/page
  version, v     Show version info

Serve Options:
  -p, --port <port>    Port to run the server (default: 4200)
  -o, --open           Open browser automatically
  --ssr                Run SSR server instead of dev server

Build Options:
  -c, --configuration  Build configuration (development/production)
  --ssr                Build for server-side rendering

Test Options:
  -w, --watch          Watch for changes
  --coverage           Generate coverage report

Generate Schematics:
  component, c   Generate a standalone component
  service, s     Generate an injectable service
  page, p        Generate a page component (lazy-loadable)

Examples:
  ng serve                    Start dev server
  ng serve --port 3000 -o     Start on port 3000 and open browser
  ng build                    Production build
  ng build --ssr              Build for SSR
  ng test --watch             Run tests in watch mode
  ng generate component foo   Create FooComponent
  ng g service api            Create ApiService
  ng g page dashboard         Create DashboardComponent page
`);
}

main().catch(console.error);