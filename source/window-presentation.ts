import type { AppearanceColor, AppearanceMaterial } from "./appearance.js"
import type { WindowPresentationTransaction } from "./appearance-transaction.js"
import type { Position, Size } from "./launch.js"
import type { WindowGeometry, WindowLayer } from "./window.js"

/** No Material or explicit Appearance-owned overrides for one optional presentation surface. */
export type WindowPresentationSurfaceMaterial = false | Partial<AppearanceMaterial>

/** One optional Desktop-painted surface behind a presented Client document. */
export type WindowPresentationSurface = false | true | Readonly<{
  /** Core Appearance radius in pixels, or a completely rounded boundary. */
  radius?: number | "full"

  /** An Appearance color role or an explicit CSS color. */
  color?: AppearanceColor | (string & {})

  /** Default Material, no Material, or explicit Core Material overrides. */
  material?: WindowPresentationSurfaceMaterial
}>

/** One pointer position in the executing Client document's viewport. */
export type WindowMovePoint = Readonly<{ x: number, y: number }>

/** The press origin and first intentional movement that initiate one move. */
export type WindowMoveGestureStart = Readonly<{
  origin: WindowMovePoint
  point: WindowMovePoint
}>

/** One move whose continuous pointer interaction is owned by the presenting Desktop. */
export interface WindowMoveGesture {
  /** Resolves after the presenting Desktop is ready to receive pointer events. */
  readonly ready: Promise<void>

  /** Resolves after the Desktop ends or cancels the interaction. */
  readonly finished: Promise<void>

  /** Cancels the interaction when its initiating Client lifecycle ends first. */
  cancel(): void
}

/** Starts one host-owned move from a pointer interaction initiated by presented content. */
export type BeginWindowMoveGesture = (start: WindowMoveGestureStart) => WindowMoveGesture

/** Raw presentation mutations that can be visually transacted. */
export interface WindowPresentationTransactionOperations {
  /** Moves the local presentation to one position. */
  move(position: Position): Promise<void>

  /** Resizes the local presentation to one size. */
  resize(size: Size): Promise<void>

  /** Changes local position and size as one operation. */
  setGeometry(geometry: WindowGeometry): Promise<void>

  /** Replaces or removes the Desktop-painted surface behind the Client document. */
  setSurface(surface: WindowPresentationSurface): Promise<void>
}

/**
 * Controls the executing Client Window's presentation in its current Desktop.
 *
 * `layer()` is always available and equals the authoritative Window layer for
 * this execution context. Standard Windows accept `beginMoveGesture()` and
 * reject raw mutations. Under, over, and shell presentations accept raw
 * mutations and reject `beginMoveGesture()`. Wallpaper presentations reject
 * both because their fixed representation belongs to the Desktop.
 */
export interface WindowPresentation extends WindowPresentationTransactionOperations {
  /** Returns the layer containing this presentation and its authoritative Window. */
  layer(): Promise<WindowLayer>

  /** Hands a Client-originated pointer move to a standard Window's Desktop. */
  beginMoveGesture: BeginWindowMoveGesture

  /** Enables or disables interaction with this raw presentation. */
  setInteractive(interactive: boolean): Promise<void>

  /** Brings this raw presentation to the front of its own layer. */
  raise(): Promise<void>

  /** Applies supported mutations with Appearance timing or explicit timing. */
  transaction(transaction?: WindowPresentationTransaction): WindowPresentationTransactionOperations

  /** Applies supported mutations and resolves them after their visual transition finishes. */
  transactionAndWait(transaction?: WindowPresentationTransaction): WindowPresentationTransactionOperations
}
