import type { AppearanceColor, AppearanceMaterial } from "./appearance.js"
import type { WindowPresentationTransaction } from "./appearance-transaction.js"
import type { Subscribable } from "./subscribable.js"
import type { WindowLayer } from "./window.js"

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

/**
 * A point of the drawing in CSS pixels, counted from the center of the Desktop: its top-left
 * corner, as it is written.
 */
export type WindowPresentationPosition = Readonly<{ x: number, y: number }>

/** The size of the drawing in CSS pixels: the Client document's own frame. */
export type WindowPresentationSize = Readonly<{ width: number, height: number }>

/** Position and size of the drawing together. */
export type WindowPresentationGeometry = WindowPresentationPosition & WindowPresentationSize

/** Changes in how the executing Client is drawn on its Desktop. */
export type WindowPresentationEvents = {
  /** The drawing moved. */
  move: WindowPresentationPosition
  /** The drawing changed size. */
  resize: WindowPresentationSize
  /** The drawing became, or stopped being, the front of its layer. */
  front: boolean
  /** Clicks began, or stopped, reaching the drawing instead of passing through it. */
  changeInteractive: boolean
  /** The Desktop-painted surface behind the drawing changed. */
  changeSurface: WindowPresentationSurface
}

/** Writes to the drawing that have a visual change, and so can move on a transaction's timing. */
export interface WindowPresentationTransactionOperations {
  /** Moves the drawing. */
  move(position: WindowPresentationPosition): Promise<void>

  /** Resizes the drawing. */
  resize(size: WindowPresentationSize): Promise<void>

  /** Moves and resizes the drawing as one change. */
  setGeometry(geometry: WindowPresentationGeometry): Promise<void>

  /** Replaces or removes the Desktop-painted surface behind the drawing. */
  setSurface(surface: WindowPresentationSurface): Promise<void>
}

/**
 * How the executing Client is actually drawn on its Desktop, in every layer. It is not the Window:
 * the Window is the value the System keeps and every Desktop follows; the presentation is the
 * drawing on this Desktop, in pixels.
 *
 * Every layer reads its drawing and hears it change. Only the raw layers — under, over, and
 * shell — write it: the Desktop never draws them on its own. A standard Window is drawn by the
 * Desktop from its Window, and the wallpaper is managed by the Desktop, so both refuse writes. A
 * move gesture hands a pointer move to the Desktop in every layer except the wallpaper, which has
 * nowhere to move.
 *
 * Writes take effect at once; `transaction()` moves them on the Appearance timing or a given one.
 */
export interface WindowPresentation extends WindowPresentationTransactionOperations, Subscribable<WindowPresentationEvents, never> {
  /** Returns the layer containing the drawing. */
  layer(): Promise<WindowLayer>

  /** Returns where the drawing is. */
  position(): Promise<WindowPresentationPosition>

  /** Returns how large the drawing is. */
  size(): Promise<WindowPresentationSize>

  /** Returns whether the drawing is the front of its layer. */
  front(): Promise<boolean>

  /** Returns whether clicks reach the drawing instead of passing through it. */
  interactive(): Promise<boolean>

  /** Returns the Desktop-painted surface behind the drawing. */
  surface(): Promise<WindowPresentationSurface>

  /** Hands a pointer move that began in the Client document to the Desktop. */
  beginMoveGesture: BeginWindowMoveGesture

  /** Changes whether clicks reach the drawing or pass through it. */
  setInteractive(interactive: boolean): Promise<void>

  /** Brings the drawing to the front of its layer. */
  raise(): Promise<void>

  /** Applies writes on the Appearance timing, or the one given. */
  transaction(transaction?: WindowPresentationTransaction): WindowPresentationTransactionOperations

  /** Applies writes on a timing, and resolves once they have arrived. */
  transactionAndWait(transaction?: WindowPresentationTransaction): WindowPresentationTransactionOperations
}
