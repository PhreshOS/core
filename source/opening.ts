import type { Endpoint } from "./endpoint.js"
import type { EndpointReference, ProgramSnapshot } from "./domain-snapshot.js"
import { parseEndpointReference, parseProgramSnapshot } from "./domain-snapshot.js"
import type { Program } from "./program.js"
import type { Subscribable } from "./subscribable.js"

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
const typePattern = new RegExp(`^${token}/(?:${token}|\\*)$`, "i")

/** Reads one target to open: an exact media type and a URI. */
export function parseOpenTarget(value: unknown): OpenTarget {
  const source = value as { type?: unknown, uri?: unknown } | null
  if (!source || typeof source !== "object" || typeof source.type !== "string" || !exactType.test(source.type)) {
    throw new Error("What to open needs an exact media type, such as image/png")
  }
  if (typeof source.uri !== "string" || !URL.canParse(source.uri)) throw new Error("What to open needs a URI")
  return Object.freeze({ type: source.type.toLowerCase(), uri: source.uri })
}

/** Reads what a Program declares it opens: media types, where `image/*` stands for every image. */
export function parseOpens(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > 100 || value.some(entry => typeof entry !== "string" || !typePattern.test(entry))) {
    throw new Error("A Program's opens must list at most 100 media types, such as image/png or image/*")
  }
  return Object.freeze([...new Set(value.map(entry => (entry as string).toLowerCase()))])
}

/** Whether a Program that opens these patterns opens this exact media type. */
export function opensType(patterns: readonly string[], type: string): boolean {
  const wanted = type.toLowerCase()
  const family = `${wanted.slice(0, wanted.indexOf("/"))}/*`
  return patterns.some(pattern => pattern === wanted || pattern === family)
}

/** Immutable boundary value from which every OpenRequest handle is reconstructed. */
export type OpenRequestSnapshot = Readonly<{
  identity: string
  /** The Endpoint that asked, or `null` when the owner asked from outside, such as a Node script. */
  from: EndpointReference | null
  createdAt: Date
  target: OpenTarget
  /** The installed Programs that open the target's type. */
  programs: readonly ProgramSnapshot[]
}>

/** Events emitted by one OpenRequest handle: the Program it was opened with, or `null`. */
export type OpenRequestEvents = {
  resolve: Program | null
}

/** One request to open something that has no default Program, waiting for the owner to choose. */
export abstract class OpenRequest implements Subscribable<OpenRequestEvents, never> {
  protected constructor() {}

  public abstract readonly subscribe: Subscribable<OpenRequestEvents, never>["subscribe"]
  public abstract readonly wait: Subscribable<OpenRequestEvents, never>["wait"]
  public abstract readonly events: Subscribable<OpenRequestEvents, never>["events"]

  public abstract readonly identity: string
  public abstract readonly from: Endpoint | null
  public abstract readonly createdAt: Date
  public abstract readonly target: OpenTarget
  public abstract readonly programs: readonly Program[]

  /** Returns whether this request still waits for a choice. */
  public abstract pending(): Promise<boolean>

  /** Opens the target with one of the request's Programs; `always` makes it the default for this type. */
  public abstract choose(program: Program, options?: Readonly<{ always?: boolean }>): Promise<void>

  /** Ends this request without opening anything. */
  public abstract cancel(): Promise<void>
}

/** One request and the Program it was opened with, or `null` when it was cancelled. */
export type SystemOpenResolve = Readonly<{
  request: OpenRequest
  program: Program | null
}>

/** System-wide OpenRequest lifecycle events. */
export type SystemOpeningEvents = {
  openRequest: OpenRequest
  openResolve: SystemOpenResolve
}

/**
 * How opening is decided: the requests waiting for the owner's choice, and the default Program for
 * each media type. It belongs to the Shell and requires `all`: deciding means knowing every Program.
 */
export interface SystemOpening extends Subscribable<SystemOpeningEvents, never> {
  requests(): Promise<OpenRequest[]>

  /** The default Program for each media type. */
  defaults(): Promise<Readonly<Record<string, Program>>>

  /** Makes one installed Program that opens this exact type its default. */
  setDefault(type: string, program: Program): Promise<void>

  clearDefault(type: string): Promise<void>
}

/** Validates and canonicalizes one OpenRequest boundary snapshot. */
export function parseOpenRequestSnapshot(value: unknown): OpenRequestSnapshot {
  const source = value as Record<string, unknown> | null
  if (!source || typeof source !== "object" || typeof source.identity !== "string" || !source.identity || !Array.isArray(source.programs)) {
    throw new Error("The System returned an invalid open request")
  }
  const createdAt = source.createdAt instanceof Date ? new Date(source.createdAt) : new Date(String(source.createdAt))
  if (Number.isNaN(createdAt.getTime())) throw new Error("The System returned an invalid open request")
  return Object.freeze({
    identity: source.identity,
    from: source.from === null ? null : parseEndpointReference(source.from),
    createdAt,
    target: parseOpenTarget(source.target),
    programs: Object.freeze(source.programs.map(parseProgramSnapshot))
  })
}

/** Validates the default Program recorded for each media type. */
export function parseOpeningDefaults(value: unknown): Readonly<Record<string, ProgramSnapshot>> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(type => !exactType.test(type))) {
    throw new Error("The System returned invalid opening defaults")
  }
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([type, program]) => [type, parseProgramSnapshot(program)])))
}
