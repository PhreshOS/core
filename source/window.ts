import type { Layer, Position, Size } from "./launch.js"
import type { AppearanceColor, AppearanceMaterial } from "./appearance.js"
import type { WindowTransaction } from "./appearance-transaction.js"
import type { Subscribable } from "./subscribable.js"

/** The authoritative runtime layer occupied by a Window. */
export type WindowLayer = Layer

/** No Material or explicit Appearance-owned overrides for one optional Desktop frame. */
export type WindowFrameMaterial = false | Partial<AppearanceMaterial>

/** The frame surrounding a Window presentation, or `false` when it is absent. */
export type WindowFrame = boolean | Readonly<{
  /** Core Appearance radius in pixels, or a completely rounded boundary. */
  radius?: number | "full"

  /** An Appearance color role or an explicit CSS color. */
  color?: AppearanceColor | (string & {})

  /** Default Material, no Material, or explicit Core Material overrides. */
  material?: WindowFrameMaterial
}>

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

  /** The authoritative frame definition changed. */
  changeFrame: WindowFrame

  /** The default presentation transaction changed. */
  changeTransaction: WindowTransaction

  /** Whether this Window became or ceased to be frontmost in its layer. */
  front: boolean
}

/** Current authoritative Window state. */
export type WindowState = Readonly<{
  /** Current title. */
  title: string

  /** Whether the Desktop-owned header is shown. */
  header: boolean

  /** Authoritative frame definition retained independently of presentation support. */
  frame: WindowFrame

  /** Default transaction for presentation operations that support one. */
  transaction: WindowTransaction

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

/** Authoritative Window state permanently owned by one Client Endpoint. */
export interface Window extends WindowOperations, Subscribable<WindowEvents, never> {
  /** Returns the current title. */
  title(): Promise<string>

  /** Returns whether the Desktop-owned header is shown. */
  header(): Promise<boolean>

  /** Returns the authoritative frame definition. */
  frame(): Promise<WindowFrame>

  /** Returns the default presentation transaction. */
  transaction(): Promise<WindowTransaction>

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

  /** Replaces the default presentation transaction. */
  setTransaction(transaction: WindowTransaction): Promise<void>
}

/** Operations shared by authoritative Windows and their Desktop presentations. */
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

  /** Sets the authoritative frame definition. */
  setFrame(frame: WindowFrame): Promise<void>

  /** Brings the Window to the front of its own layer. */
  raise(): Promise<void>
}
