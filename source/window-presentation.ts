import type { WindowTransaction } from "./appearance-transaction.js"
import type { Subscribable } from "./subscribable.js"
import type { Window, WindowEvents, WindowSurface, WindowOperations, WindowState } from "./window.js"

type WindowPresentationGeometryState = Readonly<Pick<
  WindowState,
  "position" | "size" | "minimized" | "maximized" | "front"
>>

/** Complete readable values used by one Desktop to represent a Window. */
export type WindowPresentationState =
  | (WindowPresentationGeometryState & Readonly<{
      layer: "window"
      title: string
      header: boolean
      surface: WindowSurface
    }>)
  | (WindowPresentationGeometryState & Readonly<{
      layer: "under" | "over" | "shell"
      surface: WindowSurface
    }>)
  | Readonly<{ layer: "wallpaper" }>

/** Mutations whose visual application can be grouped under one transaction. */
export interface WindowPresentationTransactionOperations extends Pick<
  WindowOperations,
  "move" | "resize" | "setGeometry" | "minimize" | "maximize" | "setSurface"
> {
  /** Applies supported authoritative values; resolves unchanged when none apply. */
  follow(): Promise<void>
}

/** Mutations applied to the values one Desktop relies on to represent a Client Window. */
export interface WindowPresentationOperations extends WindowOperations {
  /** Applies supported authoritative values; resolves unchanged when none apply. */
  follow(): Promise<void>

  /** Stops applying later authoritative changes and preserves current presentation state. */
  unfollow(): Promise<void>
}

/**
 * The values one Desktop relies on to represent the executing Client Window.
 *
 * These values describe the Desktop's presentation input, not measurements of
 * where or how the rendered Window currently appears. They may follow the
 * authoritative Window or diverge where the layer permits local control.
 * Property reads and property mutations reject when the current layer has no
 * corresponding presentation concept. `follow()` and `unfollow()` remain
 * valid even when there is no applicable value. Event observation stays
 * silent for unsupported behavior because subscriptions are asynchronous
 * observations.
 */
export interface WindowPresentation extends WindowPresentationOperations, Subscribable<WindowEvents, never> {
  title: Window["title"]
  header: Window["header"]
  surface: Window["surface"]
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
