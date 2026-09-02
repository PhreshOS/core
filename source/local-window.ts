import type { Position, Size } from "./launch.js"
import type { Transaction } from "./transaction.js"
import type { WindowGeometry } from "./window.js"

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
}

/**
 * One Client Window's physical representation on the current Desktop. It has
 * no events: its commands neither change authoritative state nor broadcast
 * anything.
 */
export interface LocalWindow extends LocalWindowOperations {
  /** Returns the same commands bound to one visual transaction. */
  transaction(transaction: Transaction): LocalWindowOperations
}
