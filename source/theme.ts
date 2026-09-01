import type { Subscribable } from "./subscribable.js"

/** Effective visual mode of one Desktop. */
export type Theme = "light" | "dark"

/** A direct mode or a request to follow the native environment. */
export type ThemePreference = Theme | "default"

/** A direct animation decision or a request to follow the native environment. */
export type AnimationsPreference = boolean | "default"

/** Complete effective preferences of one Desktop representation. */
export type DesktopPreferences = Readonly<{
  theme: Theme
  animations: boolean
}>

/** At least one raw preference to replace on the current Desktop. */
export type DesktopPreferencesUpdate =
  | Readonly<{ theme: ThemePreference, animations?: AnimationsPreference }>
  | Readonly<{ theme?: ThemePreference, animations: AnimationsPreference }>

export type DesktopPreferencesEvents = { change: DesktopPreferences }

/** Read-only access to the effective preferences of one Desktop. */
export interface DesktopPreferencesSource extends Subscribable<DesktopPreferencesEvents, never> {
  readonly snapshot: () => Promise<DesktopPreferences>
}

/** Mutable access to preferences local to one Desktop. */
export interface WritableDesktopPreferencesSource extends DesktopPreferencesSource {
  readonly update: (preferences: DesktopPreferencesUpdate) => Promise<void>
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
