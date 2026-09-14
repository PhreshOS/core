import { parseLaunch } from "./launch-validation.js"
import type { ProgramInstallOptions, ProgramUninstallOptions } from "./program.js"

/** Validates the decisions for one Program installation. */
export function parseProgramInstallOptions(value: unknown): ProgramInstallOptions {
  const source = options(value, ["launch", "purge"])
  return Object.freeze({
    ...purge(source),
    ...(source.launch === undefined ? {} : { launch: source.launch === true ? true as const : parseLaunch(source.launch) })
  })
}

/** Validates the decisions for one Program uninstallation. */
export function parseProgramUninstallOptions(value: unknown): ProgramUninstallOptions {
  return Object.freeze(purge(options(value, ["purge"])))
}

function options(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Program installation options must be an object")
  const source = value as Record<string, unknown>
  const unknown = Object.keys(source).find(key => !keys.includes(key))
  if (unknown) throw new Error(`Program installation options contain the unknown field "${unknown}"`)
  return source
}

function purge(source: Record<string, unknown>): ProgramUninstallOptions {
  if (source.purge === undefined) return {}
  if (typeof source.purge !== "boolean") throw new Error("Program purge must be a boolean")
  return { purge: source.purge }
}
