import type { AppearanceTransaction, WaitedTransaction } from "./appearance-transaction.js"
import type { Window, WindowOperations } from "./window.js"

/** Commands that change one Client Window's physical representation. */
export interface LocalWindowOperations extends Pick<WindowOperations, "move" | "resize" | "setGeometry" | "minimize" | "maximize"> {
  /** Adds the host Surface; available in under and over layers only. */
  addSurface(): Promise<void>

  /** Removes the host Surface; available in under and over layers only. */
  removeSurface(): Promise<void>

  /** Follows the supplied authoritative Window, replacing any previous target. */
  follow(window: Window): Promise<void>

  /** Stops following and preserves the current local state. */
  unfollow(): Promise<void>
}

/**
 * One Client Window's physical representation on the current Desktop. It has
 * no events: its commands neither change authoritative state nor broadcast
 * anything.
 */
export interface LocalWindow extends LocalWindowOperations, WindowOperations {
  /** Returns the same commands bound to one visual transaction. */
  transaction(transaction: AppearanceTransaction | WaitedTransaction): LocalWindowOperations
}
