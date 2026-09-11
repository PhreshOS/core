import type { JsonValue, WritableContent } from "./content.js"

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
  /** File size in bytes. */
  size: number

  /** Last modification time as Unix milliseconds. */
  modifiedAt: number
}>

/** Metadata for one Storage location. */
export type StorageStat = Readonly<{
  /** Last modification time as Unix milliseconds. */
  modifiedAt: number
}>

/** A byte range within one file. */
export type StorageReadOptions = Readonly<{
  /** Zero-based byte offset. Defaults to `0`. */
  offset?: number

  /** Maximum number of bytes to read. Defaults to the rest of the file. */
  length?: number
}>

/** Options for replacing one file. */
export type StorageWriteOptions = Readonly<{
  /** Whether an existing file may be replaced. Defaults to `true`. */
  overwrite?: boolean
}>

/** Options for copying or moving an entry. */
export type StorageTransferOptions = Readonly<{
  /** Whether an existing destination may be replaced. Defaults to `false`. */
  overwrite?: boolean
}>

/** Options for listing a Storage location. */
export type StorageListOptions = Readonly<{
  /** Whether descendants should be included. Defaults to `false`. */
  recursive?: boolean

  /** Maximum descendant depth when recursive. */
  depth?: number
}>

/** Capacity information for the filesystem containing one Storage location. */
export type StorageSpace = Readonly<{
  capacity: number
  available: number
  used: number
}>

/** One observable change beneath a Storage location. */
export type StorageChange = Readonly<{
  event: "change" | "rename"
  path: string | null
}>

/** Options for observing changes beneath one Storage location. */
export type StorageWatchOptions = Readonly<{
  recursive?: boolean
  signal?: AbortSignal
}>

/** A directory location within one immutable filesystem boundary. */
export abstract class Storage {
  /** Returns this location's final path component. */
  public abstract name(): Promise<string>

  /** Returns this location's absolute path. */
  public abstract path(): Promise<string>

  /** Selects another directory location without performing filesystem I/O. */
  public abstract navigate(...path: string[]): Storage

  /** Selects a file location without performing filesystem I/O. */
  public abstract file(...path: [string, ...string[]]): StorageFile

  /** Creates this directory and any missing ancestors. */
  public abstract create(): Promise<void>

  /** Returns directory metadata, or `null` when this location does not exist. */
  public abstract stat(): Promise<StorageStat | null>

  /** Lists entries in stable path order. */
  public abstract list(options?: StorageListOptions): Promise<Array<Storage | StorageFile>>

  /** Copies this directory to an exact destination. */
  public abstract copy(destination: Storage, options?: StorageTransferOptions): Promise<void>

  /** Moves this directory to an exact destination. */
  public abstract move(destination: Storage, options?: StorageTransferOptions): Promise<void>

  /** Recursively removes this directory. A missing directory is accepted. */
  public abstract delete(): Promise<void>

  /** Removes every entry below this directory while preserving the directory. */
  public abstract clear(): Promise<void>

  /** Returns capacity information for this directory's filesystem. */
  public abstract space(): Promise<StorageSpace>

  /** Observes filesystem changes beneath this directory. */
  public abstract watch(options?: StorageWatchOptions): AsyncGenerator<StorageChange, void, void>
}

/** A file location within one immutable filesystem boundary. */
export abstract class StorageFile {
  /** Returns this file's final path component. */
  public abstract name(): Promise<string>

  /** Returns this file's absolute path. */
  public abstract path(): Promise<string>

  /** Returns file metadata, or `null` when this location does not exist. */
  public abstract stat(): Promise<FileStat | null>

  /** Reads this file or a byte range as bytes. */
  public abstract bytes(options?: StorageReadOptions): Promise<Uint8Array>

  /** Reads this file or a byte range as UTF-8 text. */
  public abstract text(options?: StorageReadOptions): Promise<string>

  /** Reads and parses the complete file as JSON. */
  public abstract json<Value = JsonValue>(): Promise<Value>

  /** Opens this file or a byte range as a byte stream. */
  public abstract stream(options?: StorageReadOptions): Promise<ReadableStream<Uint8Array>>

  /** Atomically replaces this file. */
  public abstract write(content: WritableContent, options?: StorageWriteOptions): Promise<void>

  /** Appends content to this file. */
  public abstract append(content: WritableContent): Promise<void>

  /** Copies this file to an exact destination. */
  public abstract copy(destination: StorageFile, options?: StorageTransferOptions): Promise<void>

  /** Moves this file to an exact destination. */
  public abstract move(destination: StorageFile, options?: StorageTransferOptions): Promise<void>

  /** Removes this file. A missing file is accepted. */
  public abstract delete(): Promise<void>
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
