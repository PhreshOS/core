import type { Layer, Position, Size } from "./launch.js"

/** One explicit way to execute a Program's Server. */
export type ServerExecution =
  | Readonly<{
    /** Shell command that starts an isolated operating-system process. */
    startCommand: string
    entryFile?: never
  }>
  | Readonly<{
    startCommand?: never
    /** JavaScript module loaded as a worker owned by the System. */
    entryFile: string
  }>

/** Development settings for a Program's Server. */
export type ServerDevelopment = ServerExecution

/** Development settings for a Program's Client. */
export type ClientDevelopment = Readonly<{
  /** HTTP(S) URL served by the Client's development server. */
  url: string

  /** Optional command that starts the Client's development server. */
  startCommand?: string
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

  /** Settings used only by the development command. */
  development?: ServerDevelopment
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

  /** Initial Window size. */
  size?: Size

  /** Initial Window position. */
  position?: Position

  /** Structurally isolated desktop layer containing the Window. */
  layer?: Layer

  /** Whether the Window initially opens minimized. */
  minimize?: boolean

  /** Settings used only by the development command. */
  development?: ClientDevelopment
}>

type Description = Readonly<{
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
 * The CLI validates and derives it for development, production, or packaging.
 */
export function defineConfig(config: ServerProgramConfig): Config

/** Defines a Program authoring description with contextual typing. */
export function defineConfig(config: ClientProgramConfig): Config

export function defineConfig(config: Config): Config {
  return config
}
