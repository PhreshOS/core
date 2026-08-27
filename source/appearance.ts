import type { Subscribable } from "./subscribable.js"

type Defined<Value> = Exclude<Value, undefined>

/** One appearance value with either one shared value or explicit theme branches. */
export type ThemedValue<Value, DarkValue extends Value = never> = [DarkValue] extends [never]
  ? Readonly<{ light: Defined<Value> }>
  : Readonly<{ light: Defined<Value>, dark: Defined<Value> }>

/** Inclusive limits for one customizable Appearance value. */
export type AppearanceRange = Readonly<{
  minimum: number
  maximum: number
}>

/** Concrete defaults for the shared opaque Surface material. */
export type AppearanceSurface = Readonly<{
  grain: number
  grainAmount: number
  backdrop: number
  opacity: number
  distortion: number
  waves: number
  ripples: number
  saturation: number
  brightness: number
}>

/** Complete, unresolved visual state owned by the System. */
export type Appearance = Readonly<{
  background: ThemedValue<string, string>
  foreground: ThemedValue<string, string>
  accent: ThemedValue<string, string>
  spacing: ThemedValue<number>
  radius: ThemedValue<number>
  surface: ThemedValue<AppearanceSurface, AppearanceSurface>
  signInWallpaper: ThemedValue<string | null, string | null>
  desktopWallpaper: ThemedValue<string | null, string | null>
}>

/** System-owned bounds for Appearance customization. */
export const appearanceLimits = Object.freeze({
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
  spacing: AppearanceRange
  radius: AppearanceRange
  surface: Readonly<Record<keyof AppearanceSurface, AppearanceRange>>
}>

const standardSurface = Object.freeze({
  grain: 0,
  grainAmount: 0,
  backdrop: 0,
  opacity: 1,
  distortion: 0,
  waves: 0,
  ripples: 0,
  saturation: 1,
  brightness: 1
})

/** Complete standard Appearance available to every environment. */
export const standardAppearance = createAppearanceSnapshot({
  background: { light: "#fffff5", dark: "#101418" },
  foreground: { light: "#183447", dark: "#edf8fc" },
  accent: { light: "#4c9cff", dark: "#4c9cff" },
  spacing: { light: 12 },
  radius: { light: 10 },
  surface: { light: standardSurface, dark: standardSurface },
  signInWallpaper: { light: null, dark: null },
  desktopWallpaper: { light: null, dark: null }
})

/** Creates a deeply immutable Appearance snapshot at the contract boundary. */
export function createAppearanceSnapshot(appearance: Appearance): Appearance {
  return Object.freeze({
    background: themed(appearance.background),
    foreground: themed(appearance.foreground),
    accent: themed(appearance.accent),
    spacing: single(appearance.spacing),
    radius: single(appearance.radius),
    surface: themed(appearance.surface, value => Object.freeze({ ...value })),
    signInWallpaper: themed(appearance.signInWallpaper),
    desktopWallpaper: themed(appearance.desktopWallpaper)
  })
}

/** Live events published after the authoritative Appearance changes. */
export type AppearanceEvents = { change: Appearance }

/** Read-only access to the complete, unresolved System Appearance. */
export interface AppearanceSource extends Subscribable<AppearanceEvents, never> {
  readonly snapshot: () => Promise<Appearance>
}

/** Server authority that validates and replaces the complete Appearance. */
export interface WritableAppearance extends AppearanceSource {
  readonly update: (appearance: Appearance) => Promise<void>
}

function single<Value>(value: Readonly<{ light: Value }>, clone: (value: Value) => Value = same) {
  return Object.freeze({ light: clone(value.light) })
}

function themed<Value>(value: Readonly<{ light: Value, dark: Value }>, clone: (value: Value) => Value = same) {
  return Object.freeze({ light: clone(value.light), dark: clone(value.dark) })
}

function same<Value>(value: Value) { return value }
