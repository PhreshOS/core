import type { ScaleLevel } from "./scale.js"

/** Stable easing accepted by one Client representation's Surface transaction. */
export type ClientSurfaceEasing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | readonly [number, number, number, number]

/** Motion applied locally when one Client representation replaces its Surface target. */
export type ClientSurfaceTransaction = Readonly<{
  /** Duration in milliseconds. Omission uses the desktop duration. */
  duration?: number

  /** Timing curve. Omission uses the desktop curve. */
  easing?: ClientSurfaceEasing
}>

/** Local host Surface requested by one live Client representation. */
export type ClientSurfaceSettings = Readonly<{
  /** Whole-Surface opacity from zero through one. Omission means one. */
  opacity?: number

  /** A Theme-derived level, CSS pixels, or maximum proportional rounding. Omission means zero. */
  radius?: ScaleLevel | number | "full"

  /** Optional motion from the currently rendered values to this target. */
  transaction?: ClientSurfaceTransaction
}>
