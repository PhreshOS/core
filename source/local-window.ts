import type { Position, Size } from "./launch.js"
import type { ScaleLevel } from "./scale.js"
import type { Transaction } from "./transaction.js"
import type { WindowGeometry, WindowLayer } from "./window.js"

/** A host Surface belonging only to one live Client representation. */
export type SurfaceSettings = Readonly<{
  /** Whole-Surface opacity from zero through one. Omission means one. */
  opacity?: number

  /** A Theme level, CSS pixels, or maximum proportional rounding. */
  radius?: ScaleLevel | number | "full"
}>

/** Local Surface commands for the current Client representation. */
export interface LocalWindowSurface {
  /** Creates or replaces the Surface, optionally as a visual transaction. */
  set(settings?: SurfaceSettings, transaction?: Transaction): Promise<void>

  /** Removes the Surface immediately. */
  remove(): Promise<void>
}

/**
 * The current desktop's physical representation of the current Client Window.
 * It has no events: its commands neither change authoritative state nor
 * broadcast anything.
 */
export interface LocalWindow {
  readonly surface: LocalWindowSurface

  title(): Promise<string>
  position(): Promise<Position>
  size(): Promise<Size>
  minimized(): Promise<boolean>
  front(): Promise<boolean>
  layer(): Promise<WindowLayer>
  location(): Promise<string>

  move(position: Position, transaction?: Transaction): Promise<void>
  resize(size: Size, transaction?: Transaction): Promise<void>
  setGeometry(geometry: WindowGeometry, transaction?: Transaction): Promise<void>
  minimize(minimized?: boolean): Promise<void>
  changeTitle(title: string): Promise<void>
  raise(): Promise<void>
}
