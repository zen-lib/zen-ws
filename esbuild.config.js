import { build } from 'esbuild';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

/** @type {import('esbuild').BuildOptions} */
const baseConfig = {
	bundle: true,
	external: [
		// Get all dependencies from package.json
		...Object.keys(pkg.dependencies || {}),
		...Object.keys(pkg.peerDependencies || {}),
		...Object.keys(pkg.devDependencies || {}),
	],
};

Promise.all([
	// Client ESM
	build({
		...baseConfig,
		entryPoints: ['src/ZenSocket.ts'],
		platform: 'browser',
		format: 'esm',
		outdir: 'dist/client',
	}),
	// Client CJS
	build({
		...baseConfig,
		entryPoints: ['src/ZenSocket.ts'],
		platform: 'browser',
		format: 'cjs',
		outdir: 'dist/client',
		outExtension: { '.js': '.cjs' },
	}),
	// Server ESM
	build({
		...baseConfig,
		entryPoints: ['src/ZenSocketServer.ts'],
		platform: 'node',
		format: 'esm',
		outdir: 'dist/server',
	}),
	// Server CJS
	build({
		...baseConfig,
		entryPoints: ['src/ZenSocketServer.ts'],
		platform: 'node',
		format: 'cjs',
		outdir: 'dist/server',
		outExtension: { '.js': '.cjs' },
	}),
]).catch(() => process.exit(1));
