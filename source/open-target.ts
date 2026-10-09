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
