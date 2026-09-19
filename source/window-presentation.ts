import type { WindowTransaction } from "./appearance-transaction.js"
import type { Subscribable } from "./subscribable.js"
import type { Window, WindowEvents, WindowOperations } from "./window.js"

/** Mutations whose visual application can be grouped under one transaction. */
export interface WindowPresentationTransactionOperations extends Pick<
  WindowOperations,
  "move" | "resize" | "setGeometry" | "minimize" | "maximize" | "changeFrame"
> {
  /** Applies the authoritative state supported by this presentation. */
  follow(): Promise<void>
}

/** Mutations applied directly to one Client Window's current Desktop presentation. */
export interface WindowPresentationOperations extends WindowOperations {
  /** Applies the authoritative state supported by this presentation. */
  follow(): Promise<void>

  /** Stops applying later authoritative changes and preserves current presentation state. */
  unfollow(): Promise<void>
}

/**
 * The actual representation of the executing Client Window on one Desktop.
 *
 * Reads and mutations reject when the current layer has no corresponding
 * presentation concept. Event observation stays silent for unsupported
 * behavior because subscriptions are asynchronous observations.
 */
export interface WindowPresentation extends WindowPresentationOperations, Subscribable<WindowEvents, never> {
  title: Window["title"]
  header: Window["header"]
  frame: Window["frame"]
  position: Window["position"]
  size: Window["size"]
  minimized: Window["minimized"]
  maximized: Window["maximized"]
  front: Window["front"]
  layer: Window["layer"]

  /** Binds applicable mutations to a visual transaction and resolves after acceptance. */
  transaction(transaction: WindowTransaction): WindowPresentationTransactionOperations

  /** Binds applicable mutations and resolves each request after its visual transaction finishes. */
  transactionAndWait(transaction: WindowTransaction): WindowPresentationTransactionOperations
}
