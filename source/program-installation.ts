import { parseLaunch } from "./launch-validation.js"
import type { ProgramInstallOptions, ProgramUninstallOptions } from "./program.js"

/** Validates the decisions for one Program installation. */
export function parseProgramInstallOptions(value: unknown): ProgramInstallOptions {
  const source = options(value)
  return Object.freeze({
    ...purge(source),
    ...(source.launch === undefined ? {} : { launch: source.launch === true ? true as const : parseLaunch(source.launch) })
  })
}

/** Validates the decisions for one Program uninstallation. */
export function parseProgramUninstallOptions(value: unknown): ProgramUninstallOptions {
  return Object.freeze(purge(options(value)))
}

function options(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Program installation options must be an object")
  return value as Record<string, unknown>
}

function purge(source: Record<string, unknown>): ProgramUninstallOptions {
  if (source.purge === undefined) return {}
  if (typeof source.purge !== "boolean") throw new Error("Program purge must be a boolean")
  return { purge: source.purge }
}
