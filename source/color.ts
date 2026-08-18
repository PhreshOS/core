/** Semantic treatments derived from one explicit CSS color. */
export type ColorLevel = "subtle" | "soft" | "base" | "strong" | "intense"

/** Complete color scale derived from one explicit CSS color. */
export type ColorScale = Readonly<Record<ColorLevel, string>>

/**
 * Derives a balanced color scale while preserving the supplied color as its
 * exact base. CSS performs the mixing in OKLCH, so every valid CSS color can be
 * the source without the system maintaining a second palette.
 */
export function color(value: string): ColorScale {
  return Object.freeze({
    subtle: `color-mix(in oklch, ${value} 25%, white)`,
    soft: `color-mix(in oklch, ${value} 60%, white)`,
    base: value,
    strong: `color-mix(in oklch, ${value} 82%, black)`,
    intense: `color-mix(in oklch, ${value} 68%, black)`
  })
}
