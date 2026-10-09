import type { Endpoint } from "./endpoint.js"
import type { EndpointReference, ProgramSnapshot } from "./domain-snapshot.js"
import { parseEndpointReference, parseProgramSnapshot } from "./domain-snapshot.js"
import type { Program } from "./program.js"
import type { Subscribable } from "./subscribable.js"
import { parseOpenTarget, typePattern, type OpenTarget } from "./open-target.js"

export { parseOpenTarget, type OpenTarget }

/** Reads what a Program declares it opens: media types, where `image/*` stands for every image. */
export function parseOpens(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > 100 || value.some(entry => typeof entry !== "string" || !typePattern.test(entry))) {
    throw new Error("A Program's opens must list at most 100 media types, such as image/png or image/*")
  }
  return Object.freeze([...new Set(value.map(entry => (entry as string).toLowerCase()))])
}

/** Reads a type a default is kept for: an exact media type, or a family such as `image/*`. */
export function parseOpenType(value: unknown): string {
  if (typeof value !== "string" || !typePattern.test(value)) {
    throw new Error("A default is kept for a media type, such as image/png, or a family, such as image/*")
  }
  return value.toLowerCase()
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

/** A type's or family's default Program after it was set, or `null` after it was cleared. */
export type SystemOpeningDefault = Readonly<{
  type: string
  program: Program | null
}>

/** One request and the Program it was opened with, or `null` when it was cancelled. */
export type SystemOpenResolve = Readonly<{
  request: OpenRequest
  program: Program | null
}>

/** System-wide OpenRequest lifecycle events. */
export type SystemOpeningEvents = {
  openRequest: OpenRequest
  openResolve: SystemOpenResolve
  changeDefault: SystemOpeningDefault
}

/**
 * How opening is decided: the requests waiting for the owner's choice, and the default Program for
 * each media type. It belongs to the Shell and requires `all`: deciding means knowing every Program.
 */
export interface SystemOpening extends Subscribable<SystemOpeningEvents, never> {
  requests(): Promise<OpenRequest[]>

  /** The default Program for each media type and family. */
  defaults(): Promise<Readonly<Record<string, Program>>>

  /**
   * Makes one installed Program the default for a media type, or for a family such as `image/*`;
   * the Program must open all of it. Opening uses the exact type's default first, then its family's.
   */
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
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(type => !typePattern.test(type))) {
    throw new Error("The System returned invalid opening defaults")
  }
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([type, program]) => [type, parseProgramSnapshot(program)])))
}
