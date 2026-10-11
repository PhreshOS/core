import type { Position } from "./launch.js"
import { isRelativeValue } from "./value.js"

/**
 * Something to open: what it is, as a media type, and where it is, as a URI. A link is
 * `x-scheme-handler/https` at `https://…`, a file is its own type at `file:///…`, a folder is
 * `inode/directory`, and content a Program hands over is an upload's address. One shape for all of
 * them, so something new to open is a new address, never a new field.
 */
export type OpenTarget = Readonly<{
  /** The media type, such as `image/png`, `inode/directory`, or `x-scheme-handler/https`. */
  type: string

  /** Where it is. */
  uri: string
}>

const token = "[a-z0-9][a-z0-9!#$&^_.+-]*"
const exactType = new RegExp(`^${token}/${token}$`, "i")

/** A media type, exact, such as `image/png`, or a family, such as `image/*`. */
export const typePattern = new RegExp(`^${token}/(?:${token}|\\*)$`, "i")

/** Reads one target to open: an exact media type and a URI. */
export function parseOpenTarget(value: unknown): OpenTarget {
  const source = value as { type?: unknown, uri?: unknown } | null
  if (!source || typeof source !== "object" || typeof source.type !== "string" || !exactType.test(source.type)) {
    throw new Error("What to open needs an exact media type, such as image/png")
  }
  if (typeof source.uri !== "string" || !URL.canParse(source.uri)) throw new Error("What to open needs a URI")
  return Object.freeze({ type: source.type.toLowerCase(), uri: source.uri })
}

/** How something opens, beyond what it is. */
export type OpenOptions = Readonly<{
  /**
   * Where its window opens, such as beside the window that asks, unless the Program that opens it
   * declares where its windows open. Left out, it opens centered on the plane's zero.
   */
  position?: Position
}>

/** Reads the options an open request comes with; none is no options. */
export function parseOpenOptions(value: unknown): OpenOptions {
  if (value === undefined || value === null) return Object.freeze({})
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("Open options must be an object")
  const { position } = value as { position?: unknown }
  if (position === undefined) return Object.freeze({})
  const place = position as { x?: unknown, y?: unknown } | null
  if (!place || typeof place !== "object" || !isRelativeValue(place.x) || !isRelativeValue(place.y)) {
    throw new Error("An open position is x and y, each a finite pixel number or a relative expression such as \"50% + 10\"")
  }
  return Object.freeze({ position: Object.freeze({ x: place.x, y: place.y }) })
}
