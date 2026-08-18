/** Metadata returned for an entry in Program-owned filesystem storage. */
export type EntryStat = FileStat | DirectoryStat | OtherStat

/** Metadata for one file. */
export type FileStat = Readonly<{
  /** Discriminator for file metadata. */
  kind: "file"

  /** File size in bytes. */
  size: number

  /** Last modification time as Unix milliseconds. */
  modifiedAt: number
}>

/** Metadata for one directory. */
export type DirectoryStat = Readonly<{
  /** Discriminator for directory metadata. */
  kind: "directory"

  /** Last modification time as Unix milliseconds. */
  modifiedAt: number
}>

/** Metadata for a filesystem entry that is neither a file nor a directory. */
export type OtherStat = Readonly<{
  /** Discriminator for other filesystem metadata. */
  kind: "other"

  /** Last modification time as Unix milliseconds. */
  modifiedAt: number
}>

/** Filesystem-like storage owned by one Program. */
export interface ProgramArea {
  /** Reads one file as bytes. */
  bytes(...path: string[]): Promise<Uint8Array>

  /** Reads one UTF-8 text file. */
  text(...path: string[]): Promise<string>

  /** Reads and parses one JSON file. */
  json<Value = unknown>(...path: string[]): Promise<Value>

  /** Opens one file as a byte stream. */
  stream(...path: string[]): Promise<ReadableStream<Uint8Array>>

  /** Atomically writes one supported value, including a byte stream. */
  write(...arguments_: [...path: string[], value: unknown]): Promise<void>

  /** Returns entry metadata, or `null` when the entry does not exist. */
  stat(...path: string[]): Promise<EntryStat | null>

  /** Lists the sorted names immediately inside one directory. */
  list(...path: string[]): Promise<string[]>

  /** Recursively removes an entry. A missing entry is accepted. */
  delete(...path: string[]): Promise<void>

  /** Removes every entry while preserving the area itself. */
  clear(): Promise<void>
}

/** Persistent key-value storage owned by one Program. */
export interface ProgramStore {
  /** Returns a value, or `undefined` when its key is absent or expired. */
  get<Value = unknown>(key: string): Promise<Value | undefined>

  /** Stores a value and optionally expires it after `ttl` milliseconds. */
  set<Value>(key: string, value: Value, ttl?: number): Promise<boolean>

  /** Deletes one key or several keys and reports whether anything changed. */
  delete(key: string | string[]): Promise<boolean>

  /** Returns whether a non-expired value exists for one key. */
  has(key: string): Promise<boolean>

  /** Deletes every value in this Program's store. */
  clear(): Promise<void>
}
