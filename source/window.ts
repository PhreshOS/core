import type { Layer, Position, Size } from "./launch.js"
import type { Subscribable } from "./subscribable.js"

/** The authoritative runtime layer occupied by a Window. */
export type WindowLayer = Layer

/** Complete position and size committed as one authoritative Window change. */
export type WindowGeometry = Readonly<Position & Size>

/** Events emitted when authoritative Window state changes. */
export type WindowEvents = {
  /** The authoritative top-left position changed. */
  move: Position

  /** The authoritative width or height changed. */
  resize: Size

  /** The authoritative minimized state changed. */
  minimize: boolean

  /** The authoritative maximized state changed. */
  maximize: boolean

  /** The authoritative title changed. */
  changeTitle: string

  /** The Desktop-owned header visibility changed. */
  changeHeader: boolean

  /** Whether this Window became or ceased to be frontmost in its layer. */
  front: boolean
}

/** Current authoritative Window state. */
export type WindowState = Readonly<{
  /** Current title. */
  title: string

  /** Whether the Desktop-owned header is shown. */
  header: boolean

  /** Current top-left position. */
  position: Position

  /** Current width and height. */
  size: Size

  /** Whether the Window is minimized. */
  minimized: boolean

  /** Whether presentation fills the workspace when visible. Geometry is retained. */
  maximized: boolean

  /** Whether the Window is frontmost in its layer. */
  front: boolean

  /** Authoritative desktop layer containing the Window. */
  layer: WindowLayer

}>

/** The authoritative truth of a running Client Endpoint's Window. */
export interface Window extends WindowOperations, Subscribable<WindowEvents, never> {
  /** Returns the current title. */
  title(): Promise<string>

  /** Returns whether the Desktop-owned header is shown. */
  header(): Promise<boolean>

  /** Returns the current top-left position. */
  position(): Promise<Position>

  /** Returns the current width and height. */
  size(): Promise<Size>

  /** Returns whether the Window is minimized. */
  minimized(): Promise<boolean>

  /** Returns whether the Window is maximized. */
  maximized(): Promise<boolean>

  /** Returns whether the Window is frontmost in its layer. */
  front(): Promise<boolean>

  /** Returns the authoritative desktop layer containing the Window. */
  layer(): Promise<WindowLayer>

}

/** Mutations of one running Client Endpoint's authoritative Window state. */
export interface WindowOperations {
  /** Moves the stored geometry. */
  move(position: Position): Promise<void>

  /** Resizes the stored geometry. */
  resize(size: Size): Promise<void>

  /** Changes stored position and size as one operation. */
  setGeometry(geometry: WindowGeometry): Promise<void>

  /** Changes whether the Window is minimized. */
  minimize(minimized?: boolean): Promise<void>

  /** Changes maximization without modifying minimized state or stored geometry. */
  maximize(maximized?: boolean): Promise<void>

  /** Sets the Window title. */
  setTitle(title: string): Promise<void>

  /** Sets whether the Desktop-owned header is shown. */
  setHeader(header: boolean): Promise<void>

  /** Brings the Window to the front of its own layer. */
  raise(): Promise<void>
}
