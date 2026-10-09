import type { WritableContent } from "./content.js"
import type { FileStat } from "./storage.js"
import { systemWallpapers } from "./appearance.js"

/** Description returned when one value enters the System-owned uploads collection. */
export type Upload = FileStat & Readonly<{
  /** Opaque generated key identifying this upload. */
  file: string
}>

/** Flat System-owned uploads capability shared by every System adapter. */
export interface SystemUploads {
  /** Returns the absolute directory containing the System's uploads. */
  path(): Promise<string>

  /** Writes one value and returns its generated upload record. */
  write(value: WritableContent): Promise<Upload>

  /** Opens one upload as bytes through its opaque key. */
  stream(file: string): Promise<ReadableStream<Uint8Array>>

  /** Reads one upload completely as bytes. */
  bytes(file: string): Promise<Uint8Array>

  /** Reads one upload completely as UTF-8 text. */
  text(file: string): Promise<string>

  /** Reads and parses one upload as JSON. */
  json<Value>(file: string): Promise<Value>

  /** Describes one upload, or returns `null` when it does not exist. */
  stat(file: string): Promise<FileStat | null>
}

const systemFiles: ReadonlySet<string> = new Set(Object.values(systemWallpapers).flatMap(wallpaper => Object.values(wallpaper)))

/** Returns whether a value is one complete upload key: a generated one, or one the System keeps. */
export function isUploadFile(value: unknown): value is string {
  return typeof value === "string"
    && (systemFiles.has(value) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/.test(value))
}

/** Returns whether an upload key is one the System keeps for its own files, rather than a generated one. */
export function isSystemUploadFile(file: string): boolean {
  return systemFiles.has(file)
}
