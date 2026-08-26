import type { Position, Size } from "./launch.js"
import type { Transaction } from "./transaction.js"
import type { WindowGeometry, WindowLayer } from "./window.js"

/** Timing applied while a local representation becomes visible or disappears. */
export type VisibilityTransition = Transaction

/** Local Surface commands for one Client Window representation. */
export interface LocalWindowSurface {
  /** Makes the host Surface visible using the requested transition. */
  set(transition: VisibilityTransition): Promise<void>

  /** Removes the host Surface using the requested transition. */
  remove(transition: VisibilityTransition): Promise<void>
}

/**
 * One Client Window's physical representation on the current desktop. It has
 * no events: its commands neither change authoritative state nor broadcast
 * anything.
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
