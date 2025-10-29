import fs from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const pkgJson = JSON.parse(fs.readFileSync(path.resolve(cwd, 'package.json'), 'utf-8'))

fs.writeFileSync(path.resolve(cwd, 'jsr.json'), JSON.stringify({
  name: '@webpod/template',
  version: pkgJson.version,
  exports: {
    '.': './src/index.ts'
  },
  publish: {
    include: [
      'src',
      'LICENSE',
      'README.md'
    ]
  }
}, null, 2))
