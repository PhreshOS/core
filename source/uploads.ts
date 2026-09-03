/** Description of one complete value in the System-owned uploads collection. */
export type Upload = Readonly<{
  /** Opaque generated key identifying this upload. */
  file: string

  /** Detected media type, or `null` when no type is known. */
  type: string | null

  /** Stored size in bytes. */
  size: number

  /** Storage time as Unix milliseconds. */
  time: number
}>

/** Flat System-owned uploads capability shared by every System adapter. */
export interface SystemUploads {
  /** Returns the absolute directory containing the System's uploads. */
  path(): Promise<string>

  /** Writes one value and returns its generated upload record. */
  write(value: unknown): Promise<Upload>

  /** Opens one upload as bytes through its opaque key. */
  stream(file: string): Promise<ReadableStream<Uint8Array>>

  /** Reads one upload completely as bytes. */
  bytes(file: string): Promise<Uint8Array>

  /** Reads one upload completely as UTF-8 text. */
  text(file: string): Promise<string>

  /** Reads and parses one upload as JSON. */
  json<Value>(file: string): Promise<Value>

  /** Describes one upload, or returns `null` when it does not exist. */
  stat(file: string): Promise<Upload | null>
}

/** Returns whether a value is one complete opaque upload key. */
export function isUploadFile(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/.test(value)
}
