import type { Position, Size } from "./launch.js"
import type { Transaction } from "./transaction.js"
import type { Window, WindowGeometry } from "./window.js"

/** Commands that change one Client Window's physical representation. */
export interface LocalWindowOperations {
  /** Adds the host Surface. */
  addSurface(): Promise<void>

  /** Removes the host Surface. */
  removeSurface(): Promise<void>

  /** Moves the local representation. */
  move(position: Position): Promise<void>

  /** Resizes the local representation. */
  resize(size: Size): Promise<void>

  /** Changes local position and size as one operation. */
  setGeometry(geometry: WindowGeometry): Promise<void>

  /** Changes whether the local representation is minimized. */
  minimize(minimized?: boolean): Promise<void>

  /** Presents this local Window with another Window's geometry and minimized state. */
  follow(window: Window): Promise<void>

  /** Ends following and returns to the local representation held before it began. */
  unfollow(): Promise<void>
}

/**
 * One Client Window's physical representation on the current Desktop. It has
 * no events: its commands neither change authoritative state nor broadcast
 * anything.
 */
export interface LocalWindow extends LocalWindowOperations {
  /** Returns the same commands bound to one visual transaction. */
  transaction(transaction: Transaction): LocalWindowOperations

  /** Brings the local representation to the front of its own layer. */
  raise(): Promise<void>
}
