import type { Layer, Position, Size } from "./launch.js"
import type { ProgramPermissionDeclarations } from "./permissions.js"
import type { ProgramDefinition } from "./system.js"

/** One explicit way to execute a Program's Server. */
export type ServerExecution =
  | Readonly<{
    /** Shell command that starts an operating-system child process. */
    command: string
    worker?: never
    sandbox?: never
  }>
  | Readonly<{
    command?: never
    /** JavaScript module loaded as a worker owned by the System. */
    worker: string
    sandbox?: never
  }>
  | Readonly<{
    command?: never
    worker?: never
    /** JavaScript module loaded inside a capability-contained runtime owned by the System. */
    sandbox: string
  }>

/** Authoring declaration for a Program's Server. */
export type ServerConfig = Readonly<{
  /** Production directory containing the Server. */
  location: string

  /** Whether a default Process starts its Server. Defaults to `true`. */
  start?: boolean

  /** Default service role for new Server incarnations. Defaults to `false`. */
  service?: boolean

  /** Optional preparation command run from {@link location} while installing. */
  installCommand?: string

  /** Optional cleanup command run from {@link location} while uninstalling. */
  uninstallCommand?: string

  /** Attached host command used to run this Server during development. */
  devCommand?: string
}> & ServerExecution

/** Authoring declaration for a Program's Client and initial Window. */
export type ClientConfig = Readonly<{
  /** Production directory containing the Client and its `index.html`. */
  location: string

  /** Whether a default Process starts its Client. Defaults to `true`. */
  start?: boolean

  /** Default service role for new Client incarnations. Defaults to `false`. */
  service?: boolean

  /** Initial Window title. Defaults to the Program name. */
  title?: string

  /** Whether a standard Window initially shows its Desktop-owned header. */
  header?: boolean

  /** Initial Window size. */
  size?: Size

  /** Initial Window position. */
  position?: Position

  /** Structurally isolated desktop layer containing the Window. */
  layer?: Layer

  /** Whether the Window initially opens minimized. */
  minimize?: boolean
  /** Whether the Window initially fills its Desktop workspace. */
  maximize?: boolean

  /** HTTP(S) URL serving this Client during development. */
  devUrl?: string

  /** Optional command that starts this Client's development server. */
  devCommand?: string
}>

type Description = Pick<ProgramDefinition, "startup" | "launch"> & Readonly<{
  /** Stable public identity written in kebab-case. */
  identity: string

  /** Human-readable Program name. Defaults to {@link identity}. */
  name?: string

  /** Program version shown to people and included in packages. */
  version?: string

  /** Short human-readable explanation of what the Program does. */
  description?: string

  /** PNG source between 128 and 2,048 pixels per side and no larger than 5 MiB. */
  icon?: string

  /** Program-relative Markdown file describing Program-specific operation to agents. */
  agent?: string

  /** Optional catalog categories used when publishing this Program. */
  categories?: readonly string[]

  /** Optional catalog search terms used when publishing this Program. */
  keywords?: readonly string[]

  /** Optional public website for this Program. */
  website?: string

  /** Command run before production start, installation, and packaging. */
  buildCommand?: string

  /** Permissions written into authoritative Program storage at creation. */
  permissions?: ProgramPermissionDeclarations
}>

type ServerProgramConfig = Description & Readonly<{
  /** Server declaration for this Program. */
  server: ServerConfig

  /** Optional Client declaration for this Program. */
  client?: ClientConfig
}>

type ClientProgramConfig = Description & Readonly<{
  /** Optional Server declaration for this Program. */
  server?: ServerConfig

  /** Client declaration for this Program. */
  client: ClientConfig
}>

/**
 * The authoring description read from `phresh.config.ts`.
 *
 * A Program must declare a Server, a Client, or both.
 */
export type Config = ServerProgramConfig | ClientProgramConfig

/**
 * Defines a Program authoring description with contextual typing.
 *
 * This helper performs no work and returns the supplied description unchanged.
 * Project validates and derives it for development, production, or packaging.
 */
export function defineConfig(config: ServerProgramConfig): Config

/** Defines a Program authoring description with contextual typing. */
export function defineConfig(config: ClientProgramConfig): Config

export function defineConfig(config: Config): Config {
  return config
}
