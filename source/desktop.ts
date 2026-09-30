import type { AppearanceTransaction } from "./appearance-transaction.js"
import type { Subscribable } from "./subscribable.js"
import type { WritableDesktopPreferencesSource } from "./theme.js"
import type { Connection } from "./connection.js"

/** Measured dimensions of one Desktop viewport in CSS pixels. */
export type DesktopSize = Readonly<{
  width: number
  height: number
}>

/**
 * The point of the standard-Window plane shown at the center of one Desktop's
 * view, in CSS pixels. Positions on that plane count from its center, so a
 * Desktop that has not moved shows zero at its center. It belongs to that
 * Desktop alone and starts at zero.
 */
export type DesktopOffset = Readonly<{
  x: number
  y: number
}>

/** Both values of one Desktop viewport, read together. */
export type DesktopViewportState = Readonly<{
  size: DesktopSize
  offset: DesktopOffset
}>

/**
 * Where the view went, announced as it sets off, and the motion it takes to get there: the
 * Desktop chooses it for each move, from how far it goes. `null` when the view is there at once,
 * as when a hand drags it or animations are off. Whatever draws the plane can follow the view by
 * taking the same motion from where the view was.
 */
export type DesktopViewportMove = Readonly<{
  offset: DesktopOffset
  transaction: AppearanceTransaction | null
}>

/** Changes published by a Desktop viewport. */
export type DesktopViewportEvents = {
  /** The Desktop's size changed. */
  resize: DesktopSize
  /** The Desktop's view moved across the plane. */
  move: DesktopViewportMove
}

/** Read-only access to one Desktop viewport and its future changes. */
export interface DesktopViewportSource extends Subscribable<DesktopViewportEvents, never> {
  size(): Promise<DesktopSize>
  offset(): Promise<DesktopOffset>
}

/** Changes published by a Desktop's plane. */
export type DesktopPlaneEvents = {
  /** The plane's size changed, with the Desktop's. */
  resize: DesktopSize
}

/**
 * The plane of standard Windows one Desktop shows a view of: five views across and five down,
 * each the size of the Desktop, centered on zero. It reaches from minus half its size to plus half
 * its size in each direction, and changes size with the Desktop.
 */
export interface DesktopPlaneSource extends Subscribable<DesktopPlaneEvents, never> {
  size(): Promise<DesktopSize>
}

/** Access to one Desktop viewport that can also move the view. */
export interface WritableDesktopViewportSource extends DesktopViewportSource {
  /** Moves the view so this point of the plane is shown at the center. */
  move(offset: DesktopOffset): Promise<void>
}

/** The Desktop environment containing one Client endpoint. */
export interface Desktop {
  readonly viewport: WritableDesktopViewportSource
  readonly plane: DesktopPlaneSource
  readonly preferences: WritableDesktopPreferencesSource

  /** Returns the browser Connection carrying this Desktop. */
  connection(): Promise<Connection>
}
