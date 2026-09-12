import type { Subscribable } from "./subscribable.js"
import type { WritableDesktopPreferencesSource } from "./theme.js"

/** Measured dimensions of one Desktop viewport in CSS pixels. */
export type DesktopSize = Readonly<{
  width: number
  height: number
}>

/** Complete current state of one Desktop viewport. */
export type DesktopViewportSnapshot = Readonly<{
  size: DesktopSize
}>

/** Changes published by a Desktop viewport. */
export type DesktopViewportEvents = {
  resize: DesktopViewportSnapshot
}

/** Read-only access to one Desktop viewport and its future resizes. */
export interface DesktopViewportSource extends Subscribable<DesktopViewportEvents, never> {
  snapshot(): Promise<DesktopViewportSnapshot>
}

/** The Desktop environment containing one Client endpoint. */
export interface Desktop {
  readonly viewport: DesktopViewportSource
  readonly preferences: WritableDesktopPreferencesSource
}
