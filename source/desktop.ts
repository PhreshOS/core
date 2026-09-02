import type { Subscribable } from "./subscribable.js"
import type { WritableDesktopPreferencesSource } from "./theme.js"

/** Measured dimensions of one Desktop surface in CSS pixels. */
export type DesktopSize = Readonly<{
  width: number
  height: number
}>

/** Complete current state of one Desktop surface. */
export type DesktopSurfaceSnapshot = Readonly<{
  size: DesktopSize
}>

/** Changes published by a Desktop surface. */
export type DesktopSurfaceEvents = {
  resize: DesktopSurfaceSnapshot
}

/** Read-only access to one Desktop surface and its future resizes. */
export interface DesktopSurfaceSource extends Subscribable<DesktopSurfaceEvents, never> {
  snapshot(): Promise<DesktopSurfaceSnapshot>
}

/** The Desktop environment containing one Client endpoint. */
export interface Desktop {
  readonly surface: DesktopSurfaceSource
  readonly preferences: WritableDesktopPreferencesSource
}
