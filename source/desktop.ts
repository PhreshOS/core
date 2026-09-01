import type { Subscribable } from "./subscribable.js"

/** Measured dimensions of one Desktop surface in CSS pixels. */
export type DesktopSize = Readonly<{
  width: number
  height: number
}>

/** Complete current state of one Desktop surface. */
export type DesktopSurfaceSnapshot = Readonly<{
  size: DesktopSize
}>

/** Changes published by a Desktop surface. */
export type DesktopSurfaceEvents = {
  resize: DesktopSurfaceSnapshot
}

/** Read-only access to one Desktop surface and its future resizes. */
export interface DesktopSurfaceSource extends Subscribable<DesktopSurfaceEvents, never> {
  snapshot(): Promise<DesktopSurfaceSnapshot>
}

/** Coordinates relative to one Desktop surface in CSS pixels. */
export type DesktopPointerPosition = Readonly<{
  x: number
  y: number
}>

/** Complete current pointer state of one Desktop. */
export type DesktopPointerSnapshot = Readonly<{
  position: DesktopPointerPosition | null
}>

/** Changes published by a Desktop pointer. */
export type DesktopPointerEvents = {
  move: DesktopPointerSnapshot
}

/** Permission-guarded access to one Desktop pointer and its future movement. */
export interface DesktopPointerSource extends Subscribable<DesktopPointerEvents, never> {
  snapshot(): Promise<DesktopPointerSnapshot>
}
