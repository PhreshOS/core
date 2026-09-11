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

/** Concrete controls for visual material, independent of any component that consumes it. */
export type AppearanceMaterial = Readonly<{
  grain: number
  grainAmount: number
  backdrop: number
  opacity: number
  distortion: number
  saturation: number
}>

/** Named colors available to every Appearance consumer. */
export type AppearanceColors = Readonly<{
  background: ThemedValue<string, string>
  foreground: ThemedValue<string, string>
  primary: ThemedValue<string, string>
  secondary: ThemedValue<string, string>
  success: ThemedValue<string, string>
  warning: ThemedValue<string, string>
  danger: ThemedValue<string, string>
  info: ThemedValue<string, string>
}>

export type AppearanceColor = keyof AppearanceColors

/** Independent outer shadow geometry in CSS pixels and color opacity. */
export type AppearanceShadow = Readonly<{
  x: number
  y: number
  blur: number
  spread: number
  opacity: number
}>

/** Complete, unresolved visual state owned by the System. */
export type Appearance = Readonly<{
  colors: AppearanceColors
  spacing: ThemedValue<number>
  radius: ThemedValue<number>
  shadow: ThemedValue<AppearanceShadow, AppearanceShadow>
  material: ThemedValue<AppearanceMaterial, AppearanceMaterial>
  signInWallpaper: ThemedValue<string | null, string | null>
  desktopWallpaper: ThemedValue<string | null, string | null>
}>

/** System-owned bounds for Appearance customization. */
export const appearanceLimits = Object.freeze({
  spacing: Object.freeze({ minimum: 6, maximum: 18 }),
  radius: Object.freeze({ minimum: 6, maximum: 18 }),
  shadow: Object.freeze({
    x: Object.freeze({ minimum: -48, maximum: 48 }),
    y: Object.freeze({ minimum: -48, maximum: 48 }),
    blur: Object.freeze({ minimum: 0, maximum: 96 }),
    spread: Object.freeze({ minimum: -24, maximum: 24 }),
    opacity: Object.freeze({ minimum: 0, maximum: 1 })
  }),
  material: Object.freeze({
    grain: Object.freeze({ minimum: 0, maximum: 1 }),
    grainAmount: Object.freeze({ minimum: 0, maximum: 1 }),
    backdrop: Object.freeze({ minimum: 0, maximum: 24 }),
    opacity: Object.freeze({ minimum: 0, maximum: 1 }),
    distortion: Object.freeze({ minimum: 0, maximum: 140 }),
    saturation: Object.freeze({ minimum: 1, maximum: 2.6 })
  })
}) satisfies Readonly<{
  spacing: AppearanceRange
  radius: AppearanceRange
  shadow: Readonly<Record<keyof AppearanceShadow, AppearanceRange>>
  material: Readonly<Record<keyof AppearanceMaterial, AppearanceRange>>
}>

const defaultMaterial = Object.freeze({
  grain: 0,
  grainAmount: 0,
  backdrop: 12,
  opacity: 0.2,
  distortion: 0,
  saturation: 1
})

const defaultShadow = Object.freeze({ x: 0, y: 8, blur: 24, spread: 0, opacity: 0.16 })

/** Complete default Appearance available to every environment. */
export const defaultAppearance = createAppearanceSnapshot({
  colors: {
    background: { light: "#ffffff", dark: "#121a21" },
    foreground: { light: "#183447", dark: "#edf8fc" },
    primary: { light: "#4c9cff", dark: "#4c9cff" },
    secondary: { light: "#8b5cf6", dark: "#a78bfa" },
    success: { light: "#16a34a", dark: "#4ade80" },
    warning: { light: "#d97706", dark: "#fbbf24" },
    danger: { light: "#dc2626", dark: "#f87171" },
    info: { light: "#0891b2", dark: "#22d3ee" }
  },
  spacing: { light: 12 },
  radius: { light: 10 },
  shadow: { light: defaultShadow, dark: defaultShadow },
  material: { light: defaultMaterial, dark: { ...defaultMaterial, opacity: 0.35 } },
  signInWallpaper: { light: null, dark: null },
  desktopWallpaper: { light: null, dark: null }
})

/** Creates a deeply immutable Appearance snapshot at the contract boundary. */
export function createAppearanceSnapshot(appearance: Appearance): Appearance {
  return Object.freeze({
    colors: Object.freeze({
      background: themed(appearance.colors.background),
      foreground: themed(appearance.colors.foreground),
      primary: themed(appearance.colors.primary),
      secondary: themed(appearance.colors.secondary),
      success: themed(appearance.colors.success),
      warning: themed(appearance.colors.warning),
      danger: themed(appearance.colors.danger),
      info: themed(appearance.colors.info)
    }),
    spacing: single(appearance.spacing),
    radius: single(appearance.radius),
    shadow: themed(appearance.shadow, value => Object.freeze({ ...value })),
    material: themed(appearance.material, value => Object.freeze({ ...value })),
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
