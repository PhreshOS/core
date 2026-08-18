import type { Layer, Position, Size } from "./launch.js"
import type { ScaleLevel } from "./scale.js"
import type { Subscribable } from "./subscribable.js"

/** The authoritative runtime layer occupied by a Window. */
export type WindowLayer = Layer | "wallpaper"

/** Stable easing accepted by a Window Surface transaction. */
export type WindowSurfaceEasing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | readonly [number, number, number, number]

/** Motion applied by a desktop when one authoritative Surface target replaces another. */
export type WindowSurfaceTransaction = Readonly<{
  /** Duration in milliseconds. Omission uses the system duration. */
  duration?: number

  /** Timing curve. Omission uses the system curve. */
  easing?: WindowSurfaceEasing
}>

/** Authoritative target settings for one Window's optional host Surface. */
export type WindowSurfaceSettings = Readonly<{
  /** Whole-Surface opacity from zero through one. Omission means one. */
  opacity?: number

  /** A Theme-derived level, CSS pixels, or maximum proportional rounding. Omission means zero. */
  radius?: ScaleLevel | number | "full"

  /** Optional motion from the currently rendered values to this target. */
  transaction?: WindowSurfaceTransaction
}>

/** Live changes emitted by one Window Surface capability. */
export type WindowSurfaceEvents = {
  /** The authoritative target changed, including immediate removal as null. */
  change: WindowSurfaceSettings | null
}

/** Optional host-rendered material owned by one authoritative Window. */
export interface WindowSurface extends Subscribable<WindowSurfaceEvents, never> {
  /** Explicitly reads the authoritative target, or null when no Surface exists. */
  snapshot(): Promise<WindowSurfaceSettings | null>

  /** Creates or replaces the authoritative target. Omission creates the default Surface. */
  set(settings?: WindowSurfaceSettings): Promise<void>

  /** Immediately removes the authoritative Surface. */
  remove(): Promise<void>
}

/** Events emitted when authoritative Window state changes. */
export type WindowEvents = {
  /** The authoritative top-left position changed. */
  move: Position

  /** The authoritative width or height changed. */
  resize: Size

  /** The authoritative minimized state changed. */
  minimize: boolean

  /** The authoritative title changed. */
  changeTitle: string

  /** Whether this Window became or ceased to be frontmost in its layer. */
  front: boolean
}

/** Current authoritative Window state. */
export type WindowState = Readonly<{
  /** Current title. */
  title: string

  /** Current top-left position. */
  position: Position

  /** Current width and height. */
  size: Size

  /** Whether the Window is minimized. */
  minimized: boolean

  /** Whether the Window is frontmost in its layer. */
  front: boolean

  /** Authoritative desktop layer containing the Window. */
  layer: WindowLayer

  /** Current page beneath the declared Client location. */
  location: string

  /** Current authoritative host Surface target, or null when absent. */
  surface: WindowSurfaceSettings | null
}>

/** Presentation capability owned by one Client handle. */
export interface Window extends Subscribable<WindowEvents, never> {
  /** Authoritative host-rendered material associated with this Window. */
  readonly surface: WindowSurface

  /** Returns the current title. */
  title(): Promise<string>

  /** Returns the current top-left position. */
  position(): Promise<Position>

  /** Returns the current width and height. */
  size(): Promise<Size>

  /** Returns whether the Window is minimized. */
  minimized(): Promise<boolean>

  /** Returns whether the Window is frontmost in its layer. */
  front(): Promise<boolean>

  /** Returns the authoritative desktop layer containing the Window. */
  layer(): Promise<WindowLayer>

  /** Returns the current page rooted beneath the declared Client location. */
  location(): Promise<string>

  /** Moves the authoritative Window. */
  move(position: Position): Promise<void>

  /** Resizes the authoritative Window. */
  resize(size: Size): Promise<void>

  /** Changes whether the Window is minimized. */
  minimize(minimized?: boolean): Promise<void>

  /** Changes the Window title. */
  changeTitle(title: string): Promise<void>

  /** Brings the Window to the front of its own layer. */
  raise(): Promise<void>
}
