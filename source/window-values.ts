import { appearanceLimits, type AppearanceMaterial } from "./appearance.js"
import type { AppearanceTransaction, Easing, WindowTransaction } from "./appearance-transaction.js"
import type { WindowFrame } from "./window.js"

/** Validates and canonicalizes one authoritative Window frame value. */
export function parseWindowFrame(value: unknown): WindowFrame {
  if (typeof value === "boolean") return value

  const source = record(value, "Window frame")
  const radius = source.radius
  const color = source.color
  const material = source.material

  if (radius !== undefined && radius !== "full") {
    const limits = appearanceLimits.radius
    if (!finite(radius) || radius < limits.minimum || radius > limits.maximum) {
      throw new Error(`A Window frame radius must be "full" or a finite number from ${limits.minimum} to ${limits.maximum}`)
    }
  }

  if (color !== undefined && (typeof color !== "string" || color.length === 0)) {
    throw new Error("A Window frame color must be a non-empty color value")
  }

  return Object.freeze({
    ...(radius === undefined ? {} : { radius }),
    ...(color === undefined ? {} : { color }),
    ...(material === undefined ? {} : { material: parseFrameMaterial(material) })
  })
}

/** Validates timing selected for Window presentation without applying Appearance's customization cap. */
export function parseWindowTransaction(value: unknown): WindowTransaction {
  if (typeof value === "boolean") return value
  if (typeof value === "number") {
    if (!finite(value) || value < 0) throw new Error("A Window transaction duration must be finite non-negative milliseconds")
    return value
  }

  const source = record(value, "Window transaction")
  if (!finite(source.duration) || source.duration < 0) throw new Error("A Window transaction duration must be finite non-negative milliseconds")

  return Object.freeze({ duration: source.duration, easing: parseEasing(source.easing) })
}

function parseFrameMaterial(value: unknown): boolean | Partial<AppearanceMaterial> {
  if (typeof value === "boolean") return value

  const source = record(value, "Window frame material")
  const result: Partial<Record<keyof AppearanceMaterial, number>> = {}

  for (const name of materialNames) {
    const entry = source[name]
    if (entry === undefined) continue
    const limits = appearanceLimits.material[name]
    if (!finite(entry) || entry < limits.minimum || entry > limits.maximum) {
      throw new Error(`Window frame material ${name} must be a finite number from ${limits.minimum} to ${limits.maximum}`)
    }
    result[name] = entry
  }

  return Object.freeze(result)
}

function parseEasing(value: unknown): Easing {
  if (value === "linear" || value === "ease" || value === "ease-in" || value === "ease-out" || value === "ease-in-out") return value
  if (!Array.isArray(value)
    || value.length !== 4
    || !value.every((entry, index) => finite(entry) && ((index !== 0 && index !== 2) || entry >= 0 && entry <= 1))) {
    throw new Error("A Window transaction easing must be a standard easing name or four cubic Bézier numbers with x values from 0 to 1")
  }
  return Object.freeze([...value]) as AppearanceTransaction["easing"]
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`)
  return value as Record<string, unknown>
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

const materialNames = ["grain", "grainAmount", "backdrop", "opacity", "distortion", "saturation"] as const
