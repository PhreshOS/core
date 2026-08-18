/** Description of a value stored as a publicly reachable file. */
export type ServedFile = Readonly<{
  /** Generated filename beneath the public served-files route. */
  file: string

  /** Detected media type, or `null` when no type is known. */
  type: string | null

  /** Stored size in bytes. */
  size: number

  /** Storage time as Unix milliseconds. */
  time: number
}>
