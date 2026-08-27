import type { Subscribable } from "./subscribable.js"

/** Inclusive limits for one customizable Theme value. */
export type ThemeRange = Readonly<{
  /** Smallest accepted value. */
  minimum: number

  /** Largest accepted value. */
  maximum: number
}>

/** Concrete defaults for the shared opaque Surface material. */
export type ThemeSurface = Readonly<{
  /** Grain intensity from zero to one. */
  grain: number

  /** Fraction of deterministic grain cells retained from zero to one. */
  grainAmount: number

  /** Optional backdrop blur in CSS pixels. */
  backdrop: number

  /** Material opacity from zero to one. */
  opacity: number

  /** Organic backdrop displacement in CSS pixels. */
  distortion: number

  /** Directional-wave backdrop displacement in CSS pixels. */
  waves: number

  /** Ripple backdrop displacement in CSS pixels. */
  ripples: number

  /** Backdrop saturation multiplier, neutral at one. */
  saturation: number

  /** Backdrop brightness multiplier, neutral at one. */
  brightness: number
}>

/** The complete set of system-defined Theme properties. */
export type ThemeProperties = Readonly<{
  /** CSS color underlying interfaces and painted by Surface materials. */
  background: string

  /** CSS color used for shared interface content. */
  foreground: string

  /** CSS color used for shared interface emphasis and interaction. */
  accent: string

  /** Default component spacing expressed in CSS pixels. */
  spacing: number

  /** Default component corner radius expressed in CSS pixels. */
  radius: number

  /** Default values for the shared opaque Surface material. */
  surface: ThemeSurface
}>

/** System-owned bounds for Theme customization. */
export const themeLimits = Object.freeze({
  spacing: Object.freeze({ minimum: 6, maximum: 18 }),
  radius: Object.freeze({ minimum: 6, maximum: 18 }),
  surface: Object.freeze({
    grain: Object.freeze({ minimum: 0, maximum: 1 }),
    grainAmount: Object.freeze({ minimum: 0, maximum: 1 }),
    backdrop: Object.freeze({ minimum: 0, maximum: 24 }),
    opacity: Object.freeze({ minimum: 0, maximum: 1 }),
    distortion: Object.freeze({ minimum: 0, maximum: 140 }),
    waves: Object.freeze({ minimum: 0, maximum: 40 }),
    ripples: Object.freeze({ minimum: 0, maximum: 40 }),
    saturation: Object.freeze({ minimum: 1, maximum: 2.6 }),
    brightness: Object.freeze({ minimum: 1, maximum: 1.12 })
  })
}) satisfies Readonly<{
  spacing: ThemeRange
  radius: ThemeRange
  surface: Readonly<Record<keyof ThemeSurface, ThemeRange>>
}>

/** Complete standard Theme available to every environment. */
export const standardTheme = createThemeSnapshot({
  background: "#fffff5",
  foreground: "#183447",
  accent: "#4c9cff",
  spacing: 12,
  radius: 10,
  surface: {
    grain: 0,
    grainAmount: 0,
    backdrop: 0,
    opacity: 1,
    distortion: 0,
    waves: 0,
    ripples: 0,
    saturation: 1,
    brightness: 1
  }
})

/** Creates a complete immutable Theme snapshot at the contract boundary. */
export function createThemeSnapshot(theme: ThemeProperties): ThemeProperties {
  return Object.freeze({
    ...theme,
    surface: Object.freeze({ ...theme.surface })
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
