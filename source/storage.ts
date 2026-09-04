/** Metadata returned for an entry in Program-owned filesystem storage. */
export type EntryStat = FileStat | DirectoryStat | OtherStat

/** One operation that may be granted over a native Storage path. */
export type StoragePermissionOperation = "read" | "write" | "delete"

/** One canonical operation-and-path value belonging to the Storage permission. */
export type StorageScope = string

/** Structural meaning of one validated Storage permission value. */
export type StorageScopeDescription = Readonly<{
  operations: readonly StoragePermissionOperation[]
  path: string
  recursive: boolean
}>

const storagePermissionOperations = ["read", "write", "delete"] as const

/** Validate and canonicalize one Storage permission scope. */
export function parseStorageScope(value: unknown): StorageScope {
  const scope = describeStorageScope(value)
  const path = `${scope.path}${scope.recursive ? "/**" : ""}`

  return scope.operations.length === storagePermissionOperations.length
    ? path
    : `${scope.operations.join(",")}:${path}`
}

/** Read the operation set and path region represented by one Storage scope. */
export function describeStorageScope(value: unknown): StorageScopeDescription {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    throw new Error("A storage scope must be a non-empty string without surrounding whitespace")
  }

  const separator = value.indexOf(":")
  const prefix = separator < 0 ? null : value.slice(0, separator)
  const names = prefix?.split(",")
  const explicit = names !== undefined && names.every(isStoragePermissionOperation)
  const pathValue = explicit ? value.slice(separator + 1) : value

  if (!pathValue) throw new Error("A storage scope needs a path")

  let operations: readonly StoragePermissionOperation[] = storagePermissionOperations

  if (explicit) {
    operations = storagePermissionOperations.filter(operation => names.includes(operation))

    if (!operations.length) throw new Error("A storage scope needs an operation")
  }

  else if (prefix === "all" || names?.includes("all")) {
    throw new Error("A bare storage path is the only all-operation scope")
  }

  const recursive = pathValue.endsWith("/**")
  const path = recursive ? pathValue.slice(0, -3) : pathValue

  if (!path) throw new Error("A storage scope needs a path before /**")
  if (path.includes("/**")) throw new Error("A storage path wildcard must be the final /** segment")

  return Object.freeze({
    operations: Object.freeze([...operations]),
    path,
    recursive
  })
}

function isStoragePermissionOperation(value: string): value is StoragePermissionOperation {
  return (storagePermissionOperations as readonly string[]).includes(value)
}

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

/** Filesystem operations rooted at one configured entry point. */
export interface Storage {
  /** Returns the absolute configured entry point. */
  path(): Promise<string>

  /** Resolves filesystem paths according to this Storage's boundary policy. */
  resolve(...path: string[]): Promise<string>

  /** Reads one file as bytes. */
  bytes(...path: [string, ...string[]]): Promise<Uint8Array>

  /** Reads one UTF-8 text file. */
  text(...path: [string, ...string[]]): Promise<string>

  /** Reads and parses one JSON file. */
  json<Value = unknown>(...path: [string, ...string[]]): Promise<Value>

  /** Opens one file as a byte stream. */
  stream(...path: [string, ...string[]]): Promise<ReadableStream<Uint8Array>>

  /** Atomically writes one supported value, including a byte stream. */
  write(...arguments_: [...path: [string, ...string[]], value: unknown]): Promise<void>

  /** Returns entry metadata, or `null` when the entry does not exist. */
  stat(...path: string[]): Promise<EntryStat | null>

  /** Lists the sorted names immediately inside one directory. */
  list(...path: string[]): Promise<string[]>

  /** Recursively removes an entry. A missing entry is accepted. */
  delete(...path: [string, ...string[]]): Promise<void>

  /** Removes every entry below one directory while preserving that directory. */
  clear(...path: string[]): Promise<void>
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
