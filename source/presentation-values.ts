import { appearanceLimits, type AppearanceMaterial } from "./appearance.js"
import { parseTransaction, type PresentationTransaction } from "./transaction.js"
import type { PresentationSurface } from "./presentation.js"

/** Validates and canonicalizes one Desktop-painted surface behind a presentation. */
export function parsePresentationSurface(value: unknown): PresentationSurface {
  if (typeof value === "boolean") return value

  const source = record(value, "Window surface")
  const radius = source.radius
  const color = source.color
  const material = source.material

  if (radius !== undefined && radius !== "full") {
    const limits = appearanceLimits.radius
    if (!finite(radius) || radius < limits.minimum || radius > limits.maximum) {
      throw new Error(`A Window surface radius must be "full" or a finite number from ${limits.minimum} to ${limits.maximum}`)
    }
  }

  if (color !== undefined && (typeof color !== "string" || color.length === 0)) {
    throw new Error("A Window surface color must be a non-empty color value")
  }

  return Object.freeze({
    ...(radius === undefined ? {} : { radius }),
    ...(color === undefined ? {} : { color }),
    ...(material === undefined ? {} : { material: parseSurfaceMaterial(material) })
  })
}

/** Validates explicit timing selected for a presentation operation. */
export function parsePresentationTransaction(value: unknown): PresentationTransaction {
  if (typeof value === "number") {
    const limits = appearanceLimits.tempo
    if (!finite(value) || value < limits.minimum || value > limits.maximum) {
      throw new Error(`A Window transaction multiplier must be a finite number from ${limits.minimum.toFixed(3)} to ${limits.maximum}`)
    }
    return value
  }

  return parseTransaction(value, "A Window transaction")
}

function parseSurfaceMaterial(value: unknown): false | Partial<AppearanceMaterial> {
  if (value === false) return false

  const source = record(value, "Window surface material")
  const result: Partial<Record<keyof AppearanceMaterial, number>> = {}

  for (const name of materialNames) {
    const entry = source[name]
    if (entry === undefined) continue
    const limits = appearanceLimits.material[name]
    if (!finite(entry) || entry < limits.minimum || entry > limits.maximum) {
      throw new Error(`Window surface material ${name} must be a finite number from ${limits.minimum} to ${limits.maximum}`)
    }
    result[name] = entry
  }

  return Object.freeze(result)
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`)
  return value as Record<string, unknown>
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

const materialNames = ["grain", "grainAmount", "backdrop", "opacity", "distortion", "saturation"] as const
