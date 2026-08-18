import type { Subscribable } from "./subscribable.js"

/** Inclusive limits for one customizable Theme value. */
export type ThemeRange = Readonly<{
  /** Smallest accepted value. */
  minimum: number

  /** Largest accepted value. */
  maximum: number
}>

/** Bounded controls for the shared glass material. */
export type ThemeGlass = Readonly<{
  /** Default strength of the refracted backdrop. */
  distortion: number

  /** Default backdrop blur in CSS pixels. */
  blur: number

  /** Default backdrop saturation multiplier. */
  saturation: number

  /** Default backdrop brightness multiplier. */
  brightness: number

  /** Default material opacity from zero to the system's glass cap. */
  opacity: number
}>

/** The complete set of system-defined Theme properties. */
export type ThemeProperties = Readonly<{
  /** CSS color underlying shared interface surfaces and materials. */
  background: string

  /** CSS color used for shared interface content. */
  foreground: string

  /** CSS color used for shared interface emphasis and interaction. */
  accent: string

  /** Default component spacing expressed in CSS pixels. */
  spacing: number

  /** Default component corner radius expressed in CSS pixels. */
  radius: number

  /** Default values for the shared glass material. */
  glass: ThemeGlass
}>

/** System-owned bounds for Theme customization. */
export const themeLimits = Object.freeze({
  spacing: Object.freeze({ minimum: 6, maximum: 18 }),
  radius: Object.freeze({ minimum: 6, maximum: 18 }),
  glass: Object.freeze({
    distortion: Object.freeze({ minimum: 48, maximum: 92 }),
    blur: Object.freeze({ minimum: 2, maximum: 8 }),
    saturation: Object.freeze({ minimum: 1.25, maximum: 1.8 }),
    brightness: Object.freeze({ minimum: 1.02, maximum: 1.1 }),
    opacity: Object.freeze({ minimum: 0, maximum: 0.3 })
  })
}) satisfies Readonly<{
  spacing: ThemeRange
  radius: ThemeRange
  glass: Readonly<Record<keyof ThemeGlass, ThemeRange>>
}>

/** Complete standard Theme available to every environment. */
export const standardTheme = createThemeSnapshot({
  background: "#edf8fc",
  foreground: "#183447",
  accent: "#4c9cff",
  spacing: 12,
  radius: 10,
  glass: {
    distortion: 70,
    blur: 4,
    saturation: 1.8,
    brightness: 1.06,
    opacity: 0.12
  }
})

/** Creates a complete immutable Theme snapshot at the contract boundary. */
export function createThemeSnapshot(theme: ThemeProperties): ThemeProperties {
  return Object.freeze({
    ...theme,
    glass: Object.freeze({ ...theme.glass })
  })
}

/** Live events published by a Theme after a subscription exists. */
export type ThemeEvents<Properties extends object = ThemeProperties> = {
  /** A complete replacement Theme snapshot published after registration. */
  change: Readonly<Properties>
}

/**
 * A read-only source of Theme properties.
 *
 * Reading and observing are distinct, explicit operations. `snapshot()` asks
 * the host for its current value. The inherited subscription surface observes
 * only changes published after registration; it does not replay a snapshot.
 */
export interface Theme<Properties extends object = ThemeProperties> extends Subscribable<ThemeEvents<Properties>, never> {
  /** Explicitly requests the complete current Theme snapshot from the host. */
  readonly snapshot: () => Promise<Readonly<Properties>>
}

/** A Theme authority that can validate and replace the current snapshot. */
export interface WritableTheme<Properties extends object = ThemeProperties> extends Theme<Properties> {
  /** Replaces the complete Theme and resolves after the authority accepts it. */
  readonly update: (theme: Properties) => Promise<void>
}

/** An element whose semantic color may be selected. */
export interface Colorable<Color = unknown> {
  /** Semantic role from which the element derives its colors. */
  readonly color?: Color
}

/** An element whose supported size may be selected. */
export interface Sizable<Size = unknown> {
  /** Semantic element size. */
  readonly size?: Size
}

/** An element whose supported corner shape may be selected. */
export interface Shapeable<Radius = unknown> {
  /** Semantic corner-radius level. */
  readonly radius?: Radius
}

/** An element whose component-specific visual treatment may be selected. */
export interface Variantable<Variant extends string> {
  /** Visual treatment defined by the element implementing this capability. */
  readonly variant?: Variant
}

/** An element whose surface depth may be selected. */
export interface Elevatable<Elevation = unknown> {
  /** Semantic surface-depth level. */
  readonly elevation?: Elevation
}
