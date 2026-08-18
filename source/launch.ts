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

/** A structurally isolated desktop layer. */
export type Layer = "window" | "under" | "over"

/** Every structurally isolated desktop layer. */
export const layers: readonly Layer[] = ["window", "under", "over"]

/** Per-Process overrides used when starting a Client and its Window. */
export type LaunchClient = Readonly<{
  /** Initial Window size for this Process. */
  size?: Size

  /** Initial Window position for this Process. */
  position?: Position

  /** Structurally isolated layer containing this Process's Window. */
  layer?: Layer

  /** Initial page beneath the Client's declared location scope. */
  location?: string

  /** Whether the Window initially opens minimized. */
  minimize?: boolean
}>

/** Initial endpoint selection and immutable options for one Process. */
export type Launch = Readonly<{
  /** Optional meaningful name unique among this Program's live Processes. */
  name?: string

  /** Whether to start the declared Server. Uses its declaration when omitted. */
  server?: boolean

  /** Whether and how to start the declared Client. Uses its declaration when omitted. */
  client?: boolean | LaunchClient

  /** Immutable string options readable by the created Process. */
  options?: Readonly<Record<string, string>>
}>
