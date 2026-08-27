import type { Program } from "./program.js"
import type { Launch, LaunchClient } from "./launch.js"

/** The only Process settings configurable for a desktop Program wallpaper. */
export type WallpaperLaunch = Readonly<{
  /** Optional meaningful name unique among the Program's live Processes. */
  name?: string

  /** Whether to include the Program's declared Server. */
  server?: boolean

  /** Optional initial page beneath the Client's declared location scope. */
  client?: Pick<LaunchClient, "location">

  /** Immutable text values available to both endpoints of this Process. */
  options?: Launch["options"]
}>

/** File-backed wallpaper assigned to one system surface. */
export interface FileWallpaper {
  /** Selects one file previously created through `system.serve()`. */
  set(file: string): Promise<void>

  /** Removes the customization so the bundled wallpaper is used. */
  remove(): Promise<void>
}

/** Desktop wallpaper, backed by either a served file or a Program. */
export interface DesktopWallpaper extends FileWallpaper {
  /**
   * Selects a Program as the desktop wallpaper.
   *
   * The Program must declare a Client. Its Client is always started and its
   * Window becomes a protected wallpaper representation.
   */
  setProgram(program: Program, launch?: WallpaperLaunch): Promise<void>
}
