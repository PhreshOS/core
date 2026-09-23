import type { Value } from "./value.js"

/** A Window's top-left position. */
export type Position = Readonly<{
  /** Horizontal position. */
  x: Value

  /** Vertical position. */
  y: Value
}>

/** A Window's width and height. */
export type Size = Readonly<{
  /** Window width. */
  width: Value

  /** Window height. */
  height: Value
}>

/** Every structurally isolated Desktop layer, ordered from back to front. */
export const layers = ["wallpaper", "under", "window", "over", "shell"] as const

/** A structurally isolated desktop layer. */
export type Layer = (typeof layers)[number]

/** Whether a value names a structurally isolated desktop layer. */
export function isLayer(value: unknown): value is Layer {
  return layers.some(layer => layer === value)
}

/** Settings for one Server Endpoint execution context. */
export type ServerLaunch = Readonly<{
  /** Whether this execution context may become discoverable through `system.service`. */
  service?: boolean
}>

/** Settings for starting one Client Endpoint and explicitly replacing Window values. */
export type ClientLaunch = Readonly<{
  /** Whether this execution context may become discoverable through `system.service`. */
  service?: boolean

  /** Window title to use when this Client starts. */
  title?: string

  /** Whether a standard Window shows its Desktop-owned header after this start. */
  header?: boolean

  /** Window size to use after this start. */
  size?: Size

  /** Window position to use after this start. */
  position?: Position

  /** Structurally isolated layer containing this Process's Window. */
  layer?: Layer

  /** Whether the Window is minimized after this start. */
  minimize?: boolean
  /** Whether the Window fills its Desktop workspace after this start. */
  maximize?: boolean
}>

/** Initial endpoint selection and immutable options for one Process. */
export type Launch = Readonly<{
  /** Optional meaningful name unique among this Program's live Processes. */
  name?: string

  /** Terminate the existing Program-local named Process before creating its replacement. Requires `name`. */
  replace?: boolean

  /** Whether and how to start the declared Server. Uses its declaration when omitted. */
  server?: boolean | ServerLaunch

  /** Whether and how to start the declared Client. Uses its declaration when omitted. */
  client?: boolean | ClientLaunch

  /** Immutable string options readable by both Endpoints of the created Process. */
  options?: Readonly<Record<string, string>>
}>
