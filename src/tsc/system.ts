import path from 'node:path'
import process from 'node:process'
import { createDebug } from 'obug'
import ts from 'typescript'

const debug = createDebug('rolldown-plugin-dts:tsc-system')

export function normalizePath(id: string): string {
  return path.posix.normalize(
    process !== undefined && process.platform === 'win32'
      ? id.replaceAll('\\', '/')
      : id,
  )
}

/**
 * A system that writes files to both memory and disk. It will try read files
 * from memory firstly and fallback to disk if not found.
 */
export function createFsSystem(files: Map<string, string>): ts.System {
  return {
    ...ts.sys,

    // Hide the output of tsc by default
    write(message: string): void {
      debug(message)
    },

    // Copied from
    // https://github.com/microsoft/TypeScript-Website/blob/b0e9a5c0/packages/typescript-vfs/src/index.ts#L571-L574
    resolvePath(path) {
      const memKey = normalizePath(path)
      if (files.has(memKey)) {
        return memKey
      }
      return normalizePath(ts.sys.resolvePath(path))
    },

    // Copied from
    // https://github.com/microsoft/TypeScript-Website/blob/b0e9a5c0/packages/typescript-vfs/src/index.ts#L532C1-L534C8
    directoryExists(directory) {
      const memKey = normalizePath(directory)
      const prefix = memKey.endsWith('/') ? memKey : `${memKey}/`
      if (
        Array.from(files.keys()).some(
          (fileName) => fileName === memKey || fileName.startsWith(prefix),
        )
      ) {
        return true
      }
      return ts.sys.directoryExists(directory)
    },

    fileExists(fileName) {
      if (files.has(normalizePath(fileName))) {
        return true
      }
      return ts.sys.fileExists(fileName)
    },

    readFile(fileName, ...args) {
      const memKey = normalizePath(fileName)
      if (files.has(memKey)) {
        return files.get(memKey)
      }
      return ts.sys.readFile(fileName, ...args)
    },

    writeFile(path, data, ...args) {
      files.set(normalizePath(path), data)
      ts.sys.writeFile(path, data, ...args)
    },

    deleteFile(fileName, ...args) {
      files.delete(normalizePath(fileName))
      ts.sys.deleteFile?.(fileName, ...args)
    },
  }
}

// A system that only writes files to memory. It will read files from both
// memory and disk.
export function createMemorySystem(files: Map<string, string>): ts.System {
  return {
    ...createFsSystem(files),

    writeFile(path, data) {
      files.set(normalizePath(path), data)
    },

    deleteFile(fileName) {
      files.delete(normalizePath(fileName))
    },
  }
}
