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
  default: string
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

export type TaskbarPosition = "top" | "left" | "bottom" | "right"

/** Unthemed System placement settings for the built-in Taskbar. */
export type AppearanceTaskbar = Readonly<{
  position: TaskbarPosition
  size: number
  /** Whether the Taskbar is intended to overlay standard Window space. */
  overlay: boolean
}>

/** Complete, unresolved visual state owned by the System. */
export type Appearance = Readonly<{
  colors: ThemedValue<AppearanceColors>
  spacing: number
  radius: number
  shadow: ThemedValue<AppearanceShadow>
  material: ThemedValue<AppearanceMaterial>
  transaction: AppearanceTransaction
  taskbar: AppearanceTaskbar
  signInWallpaper: ThemedValue<string | null>
  desktopWallpaper: ThemedValue<string | null>
}>

type AppearanceUpdateFields = Readonly<{
  colors?: Readonly<{
    light?: Readonly<Partial<AppearanceColors>>
    dark?: Readonly<Partial<AppearanceColors>>
  }>
  spacing?: number
  radius?: number
  shadow?: Readonly<{
    light?: Readonly<Partial<AppearanceShadow>>
    dark?: Readonly<Partial<AppearanceShadow>>
  }>
  material?: Readonly<{
    light?: Readonly<Partial<AppearanceMaterial>>
    dark?: Readonly<Partial<AppearanceMaterial>>
  }>
  transaction?: Readonly<Partial<AppearanceTransaction>>
  taskbar?: Readonly<Partial<AppearanceTaskbar>>
  signInWallpaper?: Readonly<Partial<ThemedValue<string | null>>>
  desktopWallpaper?: Readonly<Partial<ThemedValue<string | null>>>
}>

/** At least one partial Appearance field merged recursively into one complete snapshot. */
export type AppearanceUpdate = {
  [Field in keyof AppearanceUpdateFields]-?: Readonly<
    Required<Pick<AppearanceUpdateFields, Field>> & Omit<AppearanceUpdateFields, Field>
  >
}[keyof AppearanceUpdateFields]

/** System-owned bounds for Appearance customization. */
export const appearanceLimits = Object.freeze({
  spacing: Object.freeze({ minimum: 6, maximum: 18 }),
  radius: Object.freeze({ minimum: 6, maximum: 18 }),
  transaction: Object.freeze({
    duration: Object.freeze({ minimum: 0, maximum: 60_000 })
  }),
  taskbar: Object.freeze({
    size: Object.freeze({ minimum: 0, maximum: 100 })
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
  taskbar: Readonly<{ size: AppearanceRange }>
  shadow: Readonly<Record<keyof AppearanceShadow, AppearanceRange>>
  material: Readonly<Record<keyof AppearanceMaterial, AppearanceRange>>
}>

/** Complete default Appearance available to every environment. */
export const defaultAppearance = createAppearanceSnapshot({
  colors: {
    light: {
      background: "#fbf8f4",
      foreground: "#2b211a",
      default: "#fffdfa",
      primary: "#f5b37d",
      secondary: "#3f7de0",
      success: "#3f9a4e",
      warning: "#d99a1e",
      danger: "#d8483b",
      info: "#1b9aa6"
    },
    dark: {
      // Indigo from the dark wallpaper (OKLCH hue 255) at the earlier neutral lightness.
      background: "#0a131f",
      foreground: "#e7edf5",
      default: "#15202d",
      primary: "#f5b37d",
      secondary: "#6ea2ff",
      success: "#6cc47a",
      warning: "#f0bd4f",
      danger: "#f07564",
      info: "#4cc9d3"
    }
  },
  spacing: 12,
  radius: 10,
  shadow: {
    light: { x: 0, y: 0, blur: 10, spread: 0, opacity: 0.07 },
    dark: { x: 0, y: 0, blur: 12, spread: 0, opacity: 0.3 }
  },
  material: {
    light: { grain: 0.04, grainAmount: 0.95, backdrop: 5, opacity: 0.8, distortion: 0, saturation: 1.66 },
    dark: { grain: 0.03, grainAmount: 0.95, backdrop: 12, opacity: 0.8, distortion: 0, saturation: 1.77 }
  },
  transaction: { duration: 120, easing: "ease-out" },
  taskbar: { position: "bottom", size: 44, overlay: false },
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
    taskbar: Object.freeze({ ...appearance.taskbar }),
    signInWallpaper: themed(appearance.signInWallpaper),
    desktopWallpaper: themed(appearance.desktopWallpaper)
  })
}

/** Validates unknown boundary data and returns one canonical Appearance snapshot. */
export function parseAppearance(value: unknown): Appearance {
  const source = record(value, "Appearance")

  return createAppearanceSnapshot({
    colors: parseThemed(source.colors, parseColors, "Appearance colors"),
    spacing: bounded(source.spacing, appearanceLimits.spacing, "Appearance spacing"),
    radius: bounded(source.radius, appearanceLimits.radius, "Appearance radius"),
    shadow: parseThemed(source.shadow, parseShadow, "Appearance shadow"),
    material: parseThemed(source.material, parseMaterial, "Appearance material"),
    transaction: parseTransaction(source.transaction),
    taskbar: parseTaskbar(source.taskbar),
    signInWallpaper: parseThemed(source.signInWallpaper, parseWallpaper, "sign-in wallpaper"),
    desktopWallpaper: parseThemed(source.desktopWallpaper, parseWallpaper, "desktop wallpaper")
  })
}

/** Validates and recursively merges one partial update into a complete Appearance. */
export function applyAppearanceUpdate(appearance: Appearance, value: unknown): Appearance {
  const update = record(value, "Appearance update")
  const keys = ["colors", "spacing", "radius", "shadow", "material", "transaction", "taskbar", "signInWallpaper", "desktopWallpaper"] as const

  if (!keys.some(key => Object.hasOwn(update, key))) throw new Error("An Appearance update must contain at least one Appearance field")

  // A supplied nested object owns only its supplied leaves. Keeping this merge
  // here ensures every SDK and transport interprets a partial Appearance alike.
  return parseAppearance({
    colors: Object.hasOwn(update, "colors") ? mergeThemedRecord(appearance.colors, update.colors, "Appearance colors update") : appearance.colors,
    spacing: Object.hasOwn(update, "spacing") ? update.spacing : appearance.spacing,
    radius: Object.hasOwn(update, "radius") ? update.radius : appearance.radius,
    shadow: Object.hasOwn(update, "shadow") ? mergeThemedRecord(appearance.shadow, update.shadow, "Appearance shadow update") : appearance.shadow,
    material: Object.hasOwn(update, "material") ? mergeThemedRecord(appearance.material, update.material, "Appearance material update") : appearance.material,
    transaction: Object.hasOwn(update, "transaction") ? { ...appearance.transaction, ...record(update.transaction, "Appearance transaction update") } : appearance.transaction,
    taskbar: Object.hasOwn(update, "taskbar") ? { ...appearance.taskbar, ...record(update.taskbar, "Appearance taskbar update") } : appearance.taskbar,
    signInWallpaper: Object.hasOwn(update, "signInWallpaper") ? mergeThemedValue(appearance.signInWallpaper, update.signInWallpaper, "Appearance sign-in wallpaper update") : appearance.signInWallpaper,
    desktopWallpaper: Object.hasOwn(update, "desktopWallpaper") ? mergeThemedValue(appearance.desktopWallpaper, update.desktopWallpaper, "Appearance desktop wallpaper update") : appearance.desktopWallpaper
  })
}

/** Live events published after the authoritative Appearance changes. */
export type AppearanceEvents = { change: Appearance }

/** Read-only access to the complete, unresolved System Appearance. */
export interface AppearanceSource extends Subscribable<AppearanceEvents, never> {
  readonly snapshot: () => Promise<Appearance>
}

/** Server authority that validates and merges partial Appearance values. */
export interface WritableAppearance extends AppearanceSource {
  readonly update: (appearance: AppearanceUpdate) => Promise<void>
}

function themed<Value>(value: ThemedValue<Value>, clone: (value: Value) => Value = same) {
  return Object.freeze({ light: clone(value.light), dark: clone(value.dark) })
}

function same<Value>(value: Value) { return value }

const colorKeys = ["background", "foreground", "default", "primary", "secondary", "success", "warning", "danger", "info"] as const
const shadowKeys = ["x", "y", "blur", "spread", "opacity"] as const
const materialKeys = ["grain", "grainAmount", "backdrop", "opacity", "distortion", "saturation"] as const

function parseColors(value: unknown): AppearanceColors {
  const source = record(value, "Appearance colors")
  return Object.freeze(Object.fromEntries(colorKeys.map(key => [key, nonempty(source[key], `Appearance color ${key}`)]))) as AppearanceColors
}

function parseShadow(value: unknown): AppearanceShadow {
  const source = record(value, "Appearance shadow")
  return Object.freeze(Object.fromEntries(shadowKeys.map(key => [key, bounded(source[key], appearanceLimits.shadow[key], `Appearance shadow ${key}`)]))) as AppearanceShadow
}

function parseMaterial(value: unknown): AppearanceMaterial {
  const source = record(value, "Appearance material")
  return Object.freeze(Object.fromEntries(materialKeys.map(key => [key, bounded(source[key], appearanceLimits.material[key], `Appearance material ${key}`)]))) as AppearanceMaterial
}

function parseTransaction(value: unknown): AppearanceTransaction {
  const source = record(value, "Appearance transaction")
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

function parseTaskbar(value: unknown): AppearanceTaskbar {
  const source = record(value, "Appearance taskbar")
  const position = source.position

  if (position !== "top" && position !== "left" && position !== "bottom" && position !== "right") {
    throw new Error("Appearance taskbar position is invalid")
  }

  return Object.freeze({
    position,
    size: bounded(source.size, appearanceLimits.taskbar.size, "Appearance taskbar size"),
    overlay: boolean(source.overlay, "Appearance taskbar overlay")
  })
}

function boolean(value: unknown, name: string) {
  if (typeof value !== "boolean") throw new Error(`${name} must be true or false`)
  return value
}

function parseWallpaper(value: unknown) {
  if (value === null || typeof value === "string") return value
  throw new Error("Appearance wallpaper is invalid")
}

function parseThemed<Value>(value: unknown, parse: (value: unknown) => Value, name: string): ThemedValue<Value> {
  const source = record(value, name)
  return Object.freeze({ light: parse(source.light), dark: parse(source.dark) })
}

function mergeThemedRecord<Value extends object>(current: ThemedValue<Value>, value: unknown, name: string): ThemedValue<Value> {
  const update = record(value, name)
  return {
    light: Object.hasOwn(update, "light") ? { ...current.light, ...record(update.light, `${name} light`) } : current.light,
    dark: Object.hasOwn(update, "dark") ? { ...current.dark, ...record(update.dark, `${name} dark`) } : current.dark
  }
}

function mergeThemedValue<Value>(current: ThemedValue<Value>, value: unknown, name: string): ThemedValue<Value> {
  const update = record(value, name)
  return {
    light: Object.hasOwn(update, "light") ? update.light as Value : current.light,
    dark: Object.hasOwn(update, "dark") ? update.dark as Value : current.dark
  }
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} is invalid`)
  return value as Record<string, unknown>
}

function bounded(value: unknown, range: AppearanceRange, name: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < range.minimum || value > range.maximum) throw new Error(`${name} is invalid`)
  return value
}

function nonempty(value: unknown, name: string) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is invalid`)
  return value
}
