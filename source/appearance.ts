import type { Subscribable } from "./subscribable.js"

import type { AppearanceTransaction } from "./appearance-transaction.js"

/** One value with complete branches for both supported Themes. */
export type ThemedValue<Value> = Readonly<{ light: Value, dark: Value }>

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
  background: string
  foreground: string
  primary: string
  secondary: string
  success: string
  warning: string
  danger: string
  info: string
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
  colors: ThemedValue<AppearanceColors>
  spacing: number
  radius: number
  shadow: ThemedValue<AppearanceShadow>
  material: ThemedValue<AppearanceMaterial>
  transaction: AppearanceTransaction
  signInWallpaper: ThemedValue<string | null>
  desktopWallpaper: ThemedValue<string | null>
}>

/** System-owned bounds for Appearance customization. */
export const appearanceLimits = Object.freeze({
  spacing: Object.freeze({ minimum: 6, maximum: 18 }),
  radius: Object.freeze({ minimum: 6, maximum: 18 }),
  transaction: Object.freeze({
    duration: Object.freeze({ minimum: 0, maximum: 60_000 })
  }),
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
  transaction: Readonly<{ duration: AppearanceRange }>
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
    light: {
      background: "#ffffff",
      foreground: "#183447",
      primary: "#4c9cff",
      secondary: "#8b5cf6",
      success: "#16a34a",
      warning: "#d97706",
      danger: "#dc2626",
      info: "#0891b2"
    },
    dark: {
      background: "#121a21",
      foreground: "#edf8fc",
      primary: "#4c9cff",
      secondary: "#a78bfa",
      success: "#4ade80",
      warning: "#fbbf24",
      danger: "#f87171",
      info: "#22d3ee"
    }
  },
  spacing: 12,
  radius: 10,
  shadow: { light: defaultShadow, dark: defaultShadow },
  material: { light: defaultMaterial, dark: { ...defaultMaterial, opacity: 0.35 } },
  transaction: { duration: 120, easing: "ease-out" },
  signInWallpaper: { light: null, dark: null },
  desktopWallpaper: { light: null, dark: null }
})

/** Creates a deeply immutable Appearance snapshot at the contract boundary. */
export function createAppearanceSnapshot(appearance: Appearance): Appearance {
  return Object.freeze({
    colors: themed(appearance.colors, value => Object.freeze({ ...value })),
    spacing: appearance.spacing,
    radius: appearance.radius,
    shadow: themed(appearance.shadow, value => Object.freeze({ ...value })),
    material: themed(appearance.material, value => Object.freeze({ ...value })),
    transaction: Object.freeze({ ...appearance.transaction }),
    signInWallpaper: themed(appearance.signInWallpaper),
    desktopWallpaper: themed(appearance.desktopWallpaper)
  })
}

/** Validates unknown boundary data and returns one canonical Appearance snapshot. */
export function parseAppearance(value: unknown): Appearance {
  const source = exactRecord(value, appearanceKeys, "Appearance")

  return createAppearanceSnapshot({
    colors: parseThemed(source.colors, parseColors, "Appearance colors"),
    spacing: bounded(source.spacing, appearanceLimits.spacing, "Appearance spacing"),
    radius: bounded(source.radius, appearanceLimits.radius, "Appearance radius"),
    shadow: parseThemed(source.shadow, parseShadow, "Appearance shadow"),
    material: parseThemed(source.material, parseMaterial, "Appearance material"),
    transaction: parseTransaction(source.transaction),
    signInWallpaper: parseThemed(source.signInWallpaper, parseWallpaper, "sign-in wallpaper"),
    desktopWallpaper: parseThemed(source.desktopWallpaper, parseWallpaper, "desktop wallpaper")
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

function themed<Value>(value: ThemedValue<Value>, clone: (value: Value) => Value = same) {
  return Object.freeze({ light: clone(value.light), dark: clone(value.dark) })
}

function same<Value>(value: Value) { return value }

const appearanceKeys = ["colors", "spacing", "radius", "shadow", "material", "transaction", "signInWallpaper", "desktopWallpaper"] as const
const colorKeys = ["background", "foreground", "primary", "secondary", "success", "warning", "danger", "info"] as const
const shadowKeys = ["x", "y", "blur", "spread", "opacity"] as const
const materialKeys = ["grain", "grainAmount", "backdrop", "opacity", "distortion", "saturation"] as const

function parseColors(value: unknown): AppearanceColors {
  const source = exactRecord(value, colorKeys, "Appearance colors")
  return Object.freeze(Object.fromEntries(colorKeys.map(key => [key, nonempty(source[key], `Appearance color ${key}`)]))) as AppearanceColors
}

function parseShadow(value: unknown): AppearanceShadow {
  const source = exactRecord(value, shadowKeys, "Appearance shadow")
  return Object.freeze(Object.fromEntries(shadowKeys.map(key => [key, bounded(source[key], appearanceLimits.shadow[key], `Appearance shadow ${key}`)]))) as AppearanceShadow
}

function parseMaterial(value: unknown): AppearanceMaterial {
  const source = exactRecord(value, materialKeys, "Appearance material")
  return Object.freeze(Object.fromEntries(materialKeys.map(key => [key, bounded(source[key], appearanceLimits.material[key], `Appearance material ${key}`)]))) as AppearanceMaterial
}

function parseTransaction(value: unknown): AppearanceTransaction {
  const source = exactRecord(value, ["duration", "easing"] as const, "Appearance transaction")
  const easing = source.easing
  const named = easing === "linear" || easing === "ease" || easing === "ease-in" || easing === "ease-out" || easing === "ease-in-out"
  const curve = Array.isArray(easing)
    && easing.length === 4
    && easing.every((entry, index) => typeof entry === "number" && Number.isFinite(entry) && ((index !== 0 && index !== 2) || entry >= 0 && entry <= 1))

  if (!named && !curve) throw new Error("Appearance transaction easing is invalid")

  return Object.freeze({
    duration: bounded(source.duration, appearanceLimits.transaction.duration, "Appearance transaction duration"),
    easing: Array.isArray(easing) ? Object.freeze([...easing]) as AppearanceTransaction["easing"] : easing
  })
}

function parseWallpaper(value: unknown) {
  if (value === null || typeof value === "string") return value
  throw new Error("Appearance wallpaper is invalid")
}

function parseThemed<Value>(value: unknown, parse: (value: unknown) => Value, name: string): ThemedValue<Value> {
  const source = exactRecord(value, ["light", "dark"] as const, name)
  return Object.freeze({ light: parse(source.light), dark: parse(source.dark) })
}

function exactRecord<const Keys extends readonly string[]>(value: unknown, keys: Keys, name: string): Record<Keys[number], unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} is invalid`)
  const source = value as Record<string, unknown>
  if (Object.keys(source).length !== keys.length || Object.keys(source).some(key => !keys.includes(key))) throw new Error(`${name} is invalid`)
  return source
}

function bounded(value: unknown, range: AppearanceRange, name: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < range.minimum || value > range.maximum) throw new Error(`${name} is invalid`)
  return value
}

function nonempty(value: unknown, name: string) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is invalid`)
  return value
}
