import * as esbuild from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs'
import { join } from 'node:path'

const isWatch = process.argv.includes('--watch')

// --- Step 1: Bundle client (Preact + CSS) into a single JS string ---

async function buildClient(): Promise<void> {
  const clientResult = await esbuild.build({
    entryPoints: ['src/client/app.tsx'],
    bundle: true,
    format: 'iife',
    target: 'es2022',
    minify: !isWatch,
    write: false,
    outdir: 'dist',
    jsx: 'automatic',
    jsxImportSource: 'preact',
  })

  // Extract bundled JS and CSS
  const jsOut = clientResult.outputFiles.find(f => f.path.endsWith('.js'))
  const cssOut = clientResult.outputFiles.find(f => f.path.endsWith('.css'))

  const clientJS = jsOut?.text ?? ''
  const clientCSS = cssOut?.text ?? ''

  // Write as importable modules for the server build
  mkdirSync('dist', { recursive: true })
  writeFileSync('dist/_client_bundle.js', clientJS)
  writeFileSync('dist/_client_bundle.css', clientCSS)
}

// --- Step 2: Bundle server code (Node ESM) ---

async function buildServer(): Promise<void> {
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    format: 'esm',
    target: 'node18',
    platform: 'node',
    outdir: 'dist',
    packages: 'external',
  })
}

// --- Main ---

async function build(): Promise<void> {
  await buildClient()
  await buildServer()
  chmodSync('dist/index.js', 0o755)
  console.log('  ✓ Build complete')
}

if (isWatch) {
  // Simple watch: rebuild everything on change
  const ctx = await esbuild.context({
    entryPoints: ['src/index.ts'],
    bundle: true,
    format: 'esm',
    target: 'node18',
    platform: 'node',
    outdir: 'dist',
    packages: 'external',
    plugins: [{
      name: 'rebuild-client',
      setup(build) {
        build.onStart(async () => {
          await buildClient()
        })
      }
    }]
  })
  await ctx.watch()
  console.log('  ● Watching for changes...')
} else {
  await build()
}
