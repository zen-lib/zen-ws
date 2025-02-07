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
	build({
		...baseConfig,
		entryPoints: ['src/ZenSocket.ts'],
		platform: 'browser',
		format: 'esm',
		outdir: 'dist/client',
	}),
	build({
		...baseConfig,
		entryPoints: ['src/ZenSocket.ts'],
		platform: 'browser',
		format: 'cjs',
		outdir: 'dist/client',
		outExtension: { '.js': '.cjs' },
	}),
	build({
		...baseConfig,
		entryPoints: ['src/ZenSocketServer.ts'],
		platform: 'node',
		format: 'esm',
		outdir: 'dist/server',
	}),
]).catch(() => process.exit(1));
