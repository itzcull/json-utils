import { x } from 'tinyexec'
import { describe, expect, it } from 'vitest'
import { getPackageExportsManifest } from 'vitest-package-exports'
import yaml from 'yaml'

describe('exports-snapshot', async () => {
  const packages = JSON.parse(
    await x('pnpm', ['ls', '--only-projects', '-r', '--json']).then(r => r.stdout),
  ) satisfies { name: string, path: string, private?: boolean }[]

  for (const pkg of packages) {
    if (pkg.private)
      continue
    it(`${pkg.name}`, async () => {
      const manifest = await getPackageExportsManifest({
        importMode: 'src',
        cwd: pkg.path,
      })
      await expect(yaml.stringify(manifest.exports))
        .toMatchFileSnapshot(`./exports/${pkg.name}.yaml`)
    })
  }
})
