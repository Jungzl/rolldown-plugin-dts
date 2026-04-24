/* eslint-disable @typescript-eslint/no-require-imports */
import { createDebug } from 'obug'
import { RE_JS, RE_SVELTE, RE_TS } from '../filename.ts'

const debug = createDebug('rolldown-plugin-dts:tsc-svelte')

const RE_SVELTE_IMPORT = /(['"])([^'"\n\r]+\.svelte)\1/g
const RE_SVELTE_TSX_IMPORT = /(['"])([^'"\n\r]+\.svelte)\.tsx\1/g

function toSvelteTsxImport(code: string): string {
  return code.replaceAll(
    RE_SVELTE_IMPORT,
    (_, quote: string, specifier: string) => {
      return `${quote}${specifier}.tsx${quote}`
    },
  )
}

export function toSvelteTsxId(id: string): string {
  return `${id}.tsx`
}

export function restoreSvelteImport(code: string): string {
  return code.replaceAll(
    RE_SVELTE_TSX_IMPORT,
    (_, quote: string, specifier: string) => `${quote}${specifier}${quote}`,
  )
}

function loadSvelte2tsx(): typeof import('svelte2tsx') {
  debug('loading svelte2tsx')
  try {
    const svelte2tsxPath = require.resolve('svelte2tsx')
    return require(svelte2tsxPath) as typeof import('svelte2tsx')
  } catch (error) {
    debug('svelte2tsx not found', error)
    throw new Error(
      'Failed to load svelte2tsx. Please manually install svelte2tsx.',
      { cause: error },
    )
  }
}

function resolveSvelteShims(): string {
  const svelte2tsxPath = require.resolve('svelte2tsx')
  try {
    return require.resolve('svelte2tsx/svelte-shims-v4.d.ts', {
      paths: [svelte2tsxPath],
    })
  } catch {
    return require.resolve('svelte2tsx/svelte-shims.d.ts', {
      paths: [svelte2tsxPath],
    })
  }
}

export interface SvelteVirtualFiles {
  files: Record<string, string>
  shimPath: string
}

export function createSvelteVirtualFiles(
  files: Iterable<{ id: string; code: string }>,
): SvelteVirtualFiles | undefined {
  const modules = Array.from(files)
  const hasSvelte = modules.some((mod) => RE_SVELTE.test(mod.id))
  if (!hasSvelte) {
    return
  }

  const { svelte2tsx } = loadSvelte2tsx()
  const svelteFiles: Record<string, string> = {}

  for (const mod of modules) {
    if (RE_SVELTE.test(mod.id)) {
      const result = svelte2tsx(mod.code, {
        filename: mod.id,
        mode: 'dts',
      })
      svelteFiles[toSvelteTsxId(mod.id)] = result.code
      continue
    }

    if (
      (RE_TS.test(mod.id) || RE_JS.test(mod.id)) &&
      mod.code.includes('.svelte')
    ) {
      svelteFiles[mod.id] = toSvelteTsxImport(mod.code)
    }
  }

  return {
    files: svelteFiles,
    shimPath: resolveSvelteShims(),
  }
}
