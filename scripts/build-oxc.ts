import fs from 'node:fs'
import path from 'node:path'
import { transform } from 'oxc-transform'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const root = path.resolve(__dirname, '../')
const outDir = path.join(root, 'build')
const srcDir = path.join(root, 'src')

for (const file of fs.globSync('**/*.ts', { cwd: srcDir })) {
  const { dir, name } = path.parse(file)
  const input = path.join(srcDir, file)
  const source = fs.readFileSync(input, 'utf-8')
  const { code, declaration } = transform(file, source, {
    lang: 'ts',
    typescript: {
      declaration: {},
      rewriteImportExtensions: 'rewrite'
    }
  })

  fs.writeFileSync(path.join(outDir, dir, name + '.js'), code)
  fs.writeFileSync(path.join(outDir, dir, name + '.d.ts'), declaration)
}