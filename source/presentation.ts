import type { AppearanceColor, AppearanceMaterial } from "./appearance.js"
import type { PresentationTransaction } from "./transaction.js"
import type { Subscribable } from "./subscribable.js"
import type { WindowLayer } from "./window.js"

/** No Material or explicit Appearance-owned overrides for one optional presentation surface. */
export type PresentationSurfaceMaterial = false | Partial<AppearanceMaterial>

/** One optional Desktop-painted surface behind a presented Client document. */
export type PresentationSurface = false | true | Readonly<{
  /** Core Appearance radius in pixels, or a completely rounded boundary. */
  radius?: number | "full"

  /** An Appearance color role or an explicit CSS color. */
  color?: AppearanceColor | (string & {})

  /** Default Material, no Material, or explicit Core Material overrides. */
  material?: PresentationSurfaceMaterial
}>

/** One pointer position in the executing Client document's viewport. */
export type PresentationMovePoint = Readonly<{ x: number, y: number }>

/**
 * One move the Desktop carries out for a press that began in the Client document. Once it begins, the
 * document lets go of the pointer, so the Desktop may take it, and reports whatever of it still
 * reaches the document: where the hand takes it, and that it was let go. Some browsers hand the
 * pointer to the Desktop; others keep it with the document until the press ends. The Desktop moves
 * the Window by the pointer it has, or else by these reports, and owns the geometry, snapping, and
 * the result.
 */
export interface PresentationMoveGesture {
  /** Resolves once the move ended or was cancelled; rejects when it could not begin. */
  readonly finished: Promise<void>

  /**
   * The hand moved the pointer to this point. A pointer the window's own movement passes under, the
   * hand still, has not moved: reporting it moves the window again for a place nobody chose.
   */
  move(point: PresentationMovePoint): void

  /** The pointer was let go; the move settles at its last point. */
  end(): void

  /** Abandons the move. */
  cancel(): void
}

/** Begins one move the Desktop carries out, from where the press began. */
export type BeginPresentationMoveGesture = (origin: PresentationMovePoint) => PresentationMoveGesture

/**
 * What a drawing is fixed to. On `"viewport"` it stays where it is in the viewport while the
 * viewport moves across the plane; on `"plane"` it is fixed to a place on the plane and moves with
 * it, as standard Windows do.
 */
export type PresentationAnchor = "viewport" | "plane"

/**
 * A point of the drawing in CSS pixels: its top-left corner, counted from the center of what it is
 * anchored to — the viewport, or the plane, whose center is the center of its middle view.
 */
export type PresentationPosition = Readonly<{ x: number, y: number }>

/** The size of the drawing in CSS pixels: the Client document's own frame. */
export type PresentationSize = Readonly<{ width: number, height: number }>

/** Position and size of the drawing together. */
export type PresentationGeometry = PresentationPosition & PresentationSize

/** How the executing Client is drawn on its Desktop, read at once. */
export type PresentationState = Readonly<{
  /** The layer containing the drawing. */
  layer: WindowLayer
  /** What the drawing is fixed to. */
  anchor: PresentationAnchor
  /** Where the drawing is. */
  position: PresentationPosition
  /** How large the drawing is. */
  size: PresentationSize
  /** Whether the drawing is the front of its layer. */
  front: boolean
  /** Whether this Desktop focuses the drawing; see `Presentation.focused`. */
  focused: boolean
  /** Whether clicks reach the drawing instead of passing through it. */
  interactive: boolean
  /** The Desktop-painted surface behind the drawing. */
  surface: PresentationSurface
}>

/** Changes in how the executing Client is drawn on its Desktop. */
export type PresentationEvents = {
  /** The drawing moved. */
  move: PresentationPosition
  /** The drawing changed size. */
  resize: PresentationSize
  /** The drawing became, or stopped being, the front of its layer. */
  front: boolean
  /** This Desktop focused the drawing, or focused another. */
  focus: boolean
  /** Clicks began, or stopped, reaching the drawing instead of passing through it. */
  changeInteractive: boolean
  /** The Desktop-painted surface behind the drawing changed. */
  changeSurface: PresentationSurface
  /** The drawing became fixed to the viewport, or to the plane. */
  changeAnchor: PresentationAnchor
}

/** Writes to the drawing that have a visual change, and so can move on a transaction's timing. */
export interface PresentationTransactionOperations {
  /** Moves the drawing. */
  move(position: PresentationPosition): Promise<void>

  /** Resizes the drawing. */
  resize(size: PresentationSize): Promise<void>

  /** Moves and resizes the drawing as one change. */
  setGeometry(geometry: PresentationGeometry): Promise<void>

  /** Replaces or removes the Desktop-painted surface behind the drawing. */
  setSurface(surface: PresentationSurface): Promise<void>
}

/**
 * How the executing Client is actually drawn on its Desktop, in every layer. It is not the Window:
 * the Window carries the values of a standard Window, which the System keeps and every Desktop
 * follows; the presentation is the Client's drawing on this Desktop, in pixels. What a standard
 * Window does not need belongs here, never on the Window.
 *
 * Every layer reads its drawing and hears it change, as it is at the moment: while the Desktop
 * carries it with the pointer, and along a motion, as well as at rest. An effect that only changes
 * how the drawing looks, such as the scale it enters with, moves nothing and is not a change.
 *
 * Only the raw layers — under, over, and shell — write it: the Desktop never draws them on its
 * own. A standard Window is drawn by the Desktop from its Window, and the wallpaper is managed by
 * the Desktop, so both refuse writes. A move gesture hands a pointer move to the Desktop in every
 * layer except the wallpaper, which has nowhere to move.
 *
 * Writes take effect at once; `transaction()` moves them on the motion the Desktop derives for the
 * change, that motion made longer or shorter, or an exact one.
 *
 * A standard Window is always fixed to the plane, and the wallpaper and the Shell to the viewport.
 * A drawing in `under` or `over` is fixed to the viewport until its Program fixes it to the plane.
 */
export interface Presentation extends PresentationTransactionOperations, Subscribable<PresentationEvents, never> {
  /** Returns the layer containing the drawing. */
  layer(): Promise<WindowLayer>

  /** Returns what the drawing is fixed to. */
  anchor(): Promise<PresentationAnchor>

  /** Returns where the drawing is. */
  position(): Promise<PresentationPosition>

  /** Returns how large the drawing is. */
  size(): Promise<PresentationSize>

  /** Returns whether the drawing is the front of its layer. */
  front(): Promise<boolean>

  /**
   * Returns whether this Desktop focuses the drawing. Each Desktop focuses one standard Window: the
   * one last raised while in its view; a Window raised where it does not look is raised there, not
   * focused. A drawing in any other layer is always focused.
   */
  focused(): Promise<boolean>

  /** Returns whether clicks reach the drawing instead of passing through it. */
  interactive(): Promise<boolean>

  /** Returns the Desktop-painted surface behind the drawing. */
  surface(): Promise<PresentationSurface>

  /** Begins a move the Desktop carries out for a press that began in the Client document. */
  beginMoveGesture: BeginPresentationMoveGesture

  /** Changes whether clicks reach the drawing or pass through it. */
  setInteractive(interactive: boolean): Promise<void>

  /**
   * Fixes the drawing to the viewport or to the plane, in `under` and `over`. It stays where it is
   * in the viewport when it changes: only how it follows the viewport does, so there is nothing to move.
   */
  setAnchor(anchor: PresentationAnchor): Promise<void>

  /** Brings the drawing to the front of its layer. */
  raise(): Promise<void>

  /** Applies writes on the derived motion, that motion times a multiplier, or an exact transaction. */
  transaction(transaction?: PresentationTransaction): PresentationTransactionOperations

  /** Applies writes on a timing, and resolves once they have arrived. */
  transactionAndWait(transaction?: PresentationTransaction): PresentationTransactionOperations
}
