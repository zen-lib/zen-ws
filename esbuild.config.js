import { build } from 'esbuild';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

/** @type {import('esbuild').BuildOptions} */
const baseConfig = {
	entryPoints: ['src/index.ts'],
	bundle: true,
	platform: 'node',
	outdir: 'dist',
	external: [
		// Get all dependencies from package.json
		...Object.keys(pkg.dependencies || {}),
		...Object.keys(pkg.peerDependencies || {}),
		...Object.keys(pkg.devDependencies || {}),
	],
};

// Build both ESM and CJS versions
Promise.all([
	// ESM build
	build({
		...baseConfig,
		format: 'esm',
		outdir: 'dist/esm',
	}),
	// CommonJS build
	build({
		...baseConfig,
		format: 'cjs',
		outdir: 'dist/cjs',
	}),
]).catch(() => process.exit(1));
