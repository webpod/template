import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs'
import util from 'node:util'

import esbuild from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import { entryChunksPlugin } from 'esbuild-plugin-entry-chunks'
import { transformHookPlugin } from 'esbuild-plugin-transform-hook'
import { extractHelpersPlugin } from 'esbuild-plugin-extract-helpers'
import { hybridExportPlugin } from 'esbuild-plugin-hybrid-export'

const outdir = 'build'
const argv = util.parseArgs({
  options: {
    banner:     { type: 'boolean' },
    sourcemap:  { type: 'boolean', default: false },
    hybrid:     { type: 'boolean', default: false },
    minify:     { type: 'boolean', default: false },

    entry:      { type: 'string', default: './src/index.ts' },
    external:   { type: 'string', default: 'node:*' },
    bundle:     { type: 'string', default: 'src' }, // 'all' | 'none'
    license:    { type: 'string', default: 'eof' },
    format:     { type: 'string', default: 'cjs,esm' },
    cwd:        { type: 'string', default: process.cwd()},
  }
}).values

const plugins = []
const cwd = [argv.cwd].flat().pop()
const formats = argv.format.split(',')
const bundle = argv.bundle !== 'none' && !process.argv.includes('--no-bundle')
const entryPoints = argv.entry.includes('*')
  ? fs.globSync(unwrapQuotes(argv.entry).split(':'), { cwd })
  : unwrapQuotes(argv.entry).split(':')
const external = bundle
  ? argv.external.split(',')
  : undefined  // https://github.com/evanw/esbuild/issues/1466

if (bundle && entryPoints.length > 1) {
  plugins.push(entryChunksPlugin())
}

if (argv.bundle === 'src') {
  // https://github.com/evanw/esbuild/issues/619
  // https://github.com/pradel/esbuild-node-externals/pull/52
  plugins.push(nodeExternalsPlugin())
}

if (argv.hybrid) {
  plugins.push(
    hybridExportPlugin({
      loader: 'reexport',
      to:     'build',
      toExt:  '.js',
    })
  )
}

const cjsPlugins = [
  extractHelpersPlugin({
    helper:   'cjslib.cjs',
    cwd:      outdir,
    include:  /\.cjs/,
  }),
  transformHookPlugin({
    hooks: [
      {
        on: 'end',
        pattern: entryPointsToRegexp(entryPoints),
        transform(contents: string) {
          return contents
            .toString()
            .replaceAll('"node:', '"')
            .replace(
              /0 && \(module\.exports =(.|\n)+/,
              ($0) => {
                if (!$0.includes('...')) return $0

                const vars: string[] = []
                const reexports: string[] = []
                const lines = $0.split('\n').slice(1, -1)
                lines.forEach((l) => {
                  const e = /\s*\.{3}(require\(.+\))/.exec(l)?.[1]
                  if (e) {
                    reexports.push(e)
                  } else {
                    vars.push(l)
                  }
                })

                return `0 && (module.exports = Object.assign({
${vars.join('\n')}
}, ${reexports.join(',\n')}))`
              }
            )
        },
      },]
  })
]
const esmConfig = {
  logLevel:       'error',
  absWorkingDir:  cwd,
  entryPoints,
  outdir,
  bundle,
  external,
  plugins,
  minify:         argv.minify,
  legalComments:  argv.license,
  sourcemap:      argv.sourcemap,
  sourcesContent: false,
  tsconfig:       './tsconfig.json',
  platform:       'node',
  target:         'es2019',
  format:         'esm',
  outExtension: {
    '.js': '.mjs'
  },
}

const cjsConfig = {
  ...esmConfig,
  outdir: outdir,
  target: 'es2015',
  format: 'cjs',
  banner: {},
  outExtension: {
    '.js': '.cjs'
  },
  plugins: [
    ...plugins,
    ...cjsPlugins
  ],
}

for (const format of formats) {
  const config = format === 'cjs' ? cjsConfig : esmConfig

  await esbuild
    .build(config)
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}

function entryPointsToRegexp(entryPoints: string[]) {
  return new RegExp(
    '(' + entryPoints.map((e) => escapeRegExp(path.parse(e).name)).join('|') + ')\\.cjs$'
  )
}

function escapeRegExp(str: string) {
  return str.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
}

function unwrapQuotes(str: string) {
  return str.replace(/^['"]|['"]$/g, '')
}

console.log('build:esbuild — ok')
process.exit(0)
