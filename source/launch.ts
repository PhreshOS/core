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

/** Every structurally isolated desktop layer. */
export const layers = ["window", "under", "over", "wallpaper", "start-menu"] as const

/** A structurally isolated desktop layer. */
export type Layer = (typeof layers)[number]

/** Whether a value names a structurally isolated desktop layer. */
export function isLayer(value: unknown): value is Layer {
  return layers.some(layer => layer === value)
}

/** Settings for one Server Endpoint incarnation. */
export type ServerLaunch = Readonly<{
  /** Whether this incarnation can be addressed through `system.service()`. */
  service?: boolean
}>

/** Settings for one Client Endpoint incarnation and its Window. */
export type ClientLaunch = Readonly<{
  /** Whether this incarnation can be addressed through `system.service()`. */
  service?: boolean

  /** Initial Window title for this Client incarnation. */
  title?: string

  /** Whether a standard Window initially shows its Desktop-owned header. */
  header?: boolean

  /** Initial Window size for this Process. */
  size?: Size

  /** Initial Window position for this Process. */
  position?: Position

  /** Structurally isolated layer containing this Process's Window. */
  layer?: Layer

  /** Whether the Window initially opens minimized. */
  minimize?: boolean
  /** Whether the Window initially fills its Desktop workspace. */
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
