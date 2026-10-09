import type { Subscribable } from "./subscribable.js"

/** Effective visual mode of one Desktop. */
export type Theme = "light" | "dark"

/** A direct mode, or `"browser"`: follow the browser's own mode. */
export type ThemePreference = Theme | "browser"

/** A direct decision, or `"browser"`: follow the browser's reduced-motion setting. */
export type AnimationsPreference = boolean | "browser"

/** Bounds for a Desktop scale. */
export const desktopPreferencesLimits = Object.freeze({
  scale: Object.freeze({ minimum: 0.5, maximum: 2 })
})

/** Desktop scale when no other is chosen. */
export const defaultDesktopScale = 1

/** What the owner chose for one Desktop, as it is kept. */
export type DesktopPreferences = Readonly<{
  theme: ThemePreference
  animations: AnimationsPreference
  scale: number
}>

/** What one Desktop uses now: every `"browser"` choice resolved by its browser. */
export type ResolvedDesktopPreferences = Readonly<{
  theme: Theme
  animations: boolean
  scale: number
}>

/** At least one raw preference to merge into the current Desktop preferences. */
export type DesktopPreferencesUpdate =
  | Readonly<{ theme: ThemePreference, animations?: AnimationsPreference, scale?: number }>
  | Readonly<{ theme?: ThemePreference, animations: AnimationsPreference, scale?: number }>
  | Readonly<{ theme?: ThemePreference, animations?: AnimationsPreference, scale: number }>

/** Validates one requested partial Desktop preference update at an unknown boundary. */
export function parseDesktopPreferencesUpdate(value: unknown): DesktopPreferencesUpdate {
  const preferences = record(value)
  if (!("theme" in preferences) && !("animations" in preferences) && !("scale" in preferences)) {
    throw new Error("Desktop preferences must update theme, animations, scale, or a combination of them")
  }

  if ("theme" in preferences && !isThemePreference(preferences.theme)) {
    throw new Error("The Desktop theme preference must be light, dark, or browser")
  }

  if ("animations" in preferences && !isAnimationsPreference(preferences.animations)) {
    throw new Error("The Desktop animations preference must be true, false, or browser")
  }

  if ("scale" in preferences && !isScale(preferences.scale)) {
    throw new Error(`The Desktop scale preference must be a number between ${desktopPreferencesLimits.scale.minimum} and ${desktopPreferencesLimits.scale.maximum}`)
  }

  return Object.freeze({
    ...(preferences.theme === undefined ? {} : { theme: preferences.theme }),
    ...(preferences.animations === undefined ? {} : { animations: preferences.animations }),
    ...(preferences.scale === undefined ? {} : { scale: preferences.scale })
  }) as DesktopPreferencesUpdate
}

export type DesktopPreferencesEvents = {
  /** What the owner chose changed. */
  change: DesktopPreferences

  /** What the Desktop uses changed: a choice changed it, or the browser did while it is followed. */
  changeResolved: ResolvedDesktopPreferences
}

/** One Desktop's preferences: what was chosen, and what that resolves to now. */
export interface DesktopPreferencesSource extends Subscribable<DesktopPreferencesEvents, never> {
  /** What the owner chose, with `"browser"` where the browser is followed. */
  readonly snapshot: () => Promise<DesktopPreferences>

  /** What the Desktop uses now; only the Desktop knows its browser, so it answers. */
  readonly resolve: () => Promise<ResolvedDesktopPreferences>
}

/** Preferences one Desktop keeps, which may be changed. */
export interface WritableDesktopPreferencesSource extends DesktopPreferencesSource {
  readonly update: (preferences: DesktopPreferencesUpdate) => Promise<void>
}

/** Validates what was chosen for one Desktop at an unknown boundary. */
export function parseDesktopPreferences(value: unknown): DesktopPreferences {
  const source = record(value)
  if (!isThemePreference(source.theme) || !isAnimationsPreference(source.animations) || !isScale(source.scale)) {
    throw new Error("The Desktop returned invalid preferences")
  }
  return Object.freeze({ theme: source.theme, animations: source.animations, scale: source.scale })
}

/** Validates what one Desktop uses now at an unknown boundary. */
export function parseResolvedDesktopPreferences(value: unknown): ResolvedDesktopPreferences {
  const source = record(value)
  if ((source.theme !== "light" && source.theme !== "dark") || typeof source.animations !== "boolean" || !isScale(source.scale)) {
    throw new Error("The Desktop returned invalid resolved preferences")
  }
  return Object.freeze({ theme: source.theme, animations: source.animations, scale: source.scale })
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Desktop preferences must be an object")
  return value as Record<string, unknown>
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "browser"
}

function isAnimationsPreference(value: unknown): value is AnimationsPreference {
  return typeof value === "boolean" || value === "browser"
}

function isScale(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
    && value >= desktopPreferencesLimits.scale.minimum && value <= desktopPreferencesLimits.scale.maximum
}
