/** A visual level derived around one concrete default value. */
export type ScaleLevel = "xsmall" | "small" | "medium" | "large" | "xlarge"

/** Every numeric level derived around one concrete default value. */
export type NumericScale = Readonly<Record<ScaleLevel, number>>

const factors: Readonly<Record<ScaleLevel, number>> = Object.freeze({
  xsmall: 0.25,
  small: 0.5,
  medium: 1,
  large: 1.5,
  xlarge: 2
})

/** Returns whether a value names one of the system's derived visual levels. */
export function isScaleLevel(value: unknown): value is ScaleLevel {
  return value === "xsmall" || value === "small" || value === "medium" || value === "large" || value === "xlarge"
}

/** Derives one visual level around a concrete default value. */
export function scale(value: number, level: ScaleLevel): number {
  return value * factors[level]
}

/** Derives the complete visual scale around one concrete default value. */
export function numericScale(value: number): NumericScale {
  return Object.freeze({
    xsmall: scale(value, "xsmall"),
    small: scale(value, "small"),
    medium: scale(value, "medium"),
    large: scale(value, "large"),
    xlarge: scale(value, "xlarge")
  })
}

/** Derives a multiplier while preserving its neutral value of one. */
export function scaleMultiplier(value: number, level: ScaleLevel): number {
  return 1 + (value - 1) * factors[level]
}
