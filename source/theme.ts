import type { Subscribable } from "./subscribable.js"

/** Effective visual mode of one Desktop. */
export type Theme = "light" | "dark"

/** A direct mode or a request to follow the native environment. */
export type ThemePreference = Theme | "default"

/** A direct animation decision or a request to follow the native environment. */
export type AnimationsPreference = boolean | "default"

/** A concrete Desktop presentation multiplier or a request for its default. */
export type DesktopScalePreference = number | "default"

/** Bounds for a concrete effective Desktop scale. */
export const desktopPreferencesLimits = Object.freeze({
  scale: Object.freeze({ minimum: 0.5, maximum: 2 })
})

/** Effective Desktop scale when no override is stored. */
export const defaultDesktopScale = 1

/** Complete effective preferences of one Desktop representation. */
export type DesktopPreferences = Readonly<{
  theme: Theme
  animations: boolean
  scale: number
}>

/** At least one raw preference to replace on the current Desktop. */
export type DesktopPreferencesUpdate =
  | Readonly<{ theme: ThemePreference, animations?: AnimationsPreference, scale?: DesktopScalePreference }>
  | Readonly<{ theme?: ThemePreference, animations: AnimationsPreference, scale?: DesktopScalePreference }>
  | Readonly<{ theme?: ThemePreference, animations?: AnimationsPreference, scale: DesktopScalePreference }>

/** Validates one requested Desktop preference replacement at an unknown boundary. */
export function parseDesktopPreferencesUpdate(value: unknown): DesktopPreferencesUpdate {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Desktop preferences must be an object")
  }

  const preferences = value as Record<string, unknown>
  if (!("theme" in preferences) && !("animations" in preferences) && !("scale" in preferences)) {
    throw new Error("Desktop preferences must update theme, animations, scale, or a combination of them")
  }

  if ("theme" in preferences && preferences.theme !== "light" && preferences.theme !== "dark" && preferences.theme !== "default") {
    throw new Error("The Desktop theme preference must be light, dark, or default")
  }

  if ("animations" in preferences && typeof preferences.animations !== "boolean" && preferences.animations !== "default") {
    throw new Error("The Desktop animations preference must be true, false, or default")
  }

  if ("scale" in preferences && preferences.scale !== "default" && (
    typeof preferences.scale !== "number"
    || !Number.isFinite(preferences.scale)
    || preferences.scale < desktopPreferencesLimits.scale.minimum
    || preferences.scale > desktopPreferencesLimits.scale.maximum
  )) {
    throw new Error(`The Desktop scale preference must be default or between ${desktopPreferencesLimits.scale.minimum} and ${desktopPreferencesLimits.scale.maximum}`)
  }

  return Object.freeze({
    ...(preferences.theme === undefined ? {} : { theme: preferences.theme }),
    ...(preferences.animations === undefined ? {} : { animations: preferences.animations }),
    ...(preferences.scale === undefined ? {} : { scale: preferences.scale })
  }) as DesktopPreferencesUpdate
}

export type DesktopPreferencesEvents = { change: DesktopPreferences }

/** Read-only access to the effective preferences of one Desktop. */
export interface DesktopPreferencesSource extends Subscribable<DesktopPreferencesEvents, never> {
  readonly snapshot: () => Promise<DesktopPreferences>
}

/** Mutable access to preferences local to one Desktop. */
export interface WritableDesktopPreferencesSource extends DesktopPreferencesSource {
  readonly update: (preferences: DesktopPreferencesUpdate) => Promise<void>
}
