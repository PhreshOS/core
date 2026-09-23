import type { Connection } from "./connection.js"
import type { Session, SessionEndReason } from "./session.js"
import type { Subscribable } from "./subscribable.js"

/** Public owner identity currently configured for one System. */
export type AuthenticationState = Readonly<{
  username: string | null
}>

/** Immutable input bounds enforced by one System's credential policy. */
export type AuthenticationRequirements = Readonly<{
  username: Readonly<{ minimumLength: number, maximumLength: number }>
  password: Readonly<{ minimumLength: number, maximumLength: number }>
}>

/** Complete sign-in credentials accepted when replacing the System owner's credentials. */
export type AuthenticationCredentials = Readonly<{
  username: string
  password: string
}>

/** One Session ending in the authoritative Authentication registry. */
export type AuthenticationSessionEnd = Readonly<{
  session: Session
  reason: SessionEndReason
}>

/** System-wide lifecycle changes belonging to the Authentication domain. */
export type SystemAuthenticationEvents = {
  connectionCreate: Connection
  connectionDisconnect: Connection
  sessionCreate: Session
  sessionEnd: AuthenticationSessionEnd
}

/** System-level owner authentication configuration and entity registries. */
export interface SystemAuthentication extends Subscribable<SystemAuthenticationEvents, never> {
  /** Returns the public owner identity without exposing password material. */
  state(): Promise<AuthenticationState>
  /** Returns the immutable credential input policy enforced by this System. */
  requirements(): Promise<AuthenticationRequirements>
  /** Returns every visible live browser Connection. */
  connections(): Promise<Connection[]>
  /** Finds one visible live browser Connection. */
  connection(identity: string): Promise<Connection | null>
  /** Returns every visible valid authentication Session. */
  sessions(): Promise<Session[]>
  /** Finds one visible valid authentication Session. */
  session(identity: string): Promise<Session | null>
  /** Replaces the owner's sign-in credentials without ending existing Sessions. */
  setCredentials(credentials: AuthenticationCredentials): Promise<void>
  /** Explicitly ends every valid authentication Session. */
  signOutAllSessions(): Promise<void>
}

/** Validates one Authentication state returned by a System boundary. */
export function parseAuthenticationState(value: unknown): AuthenticationState {
  const source = record(value, "Authentication state")
  if (source.username !== null && typeof source.username !== "string") {
    throw new Error("The System returned an invalid Authentication username")
  }
  return Object.freeze({ username: source.username })
}

/** Validates one Authentication requirements snapshot returned by a System boundary. */
export function parseAuthenticationRequirements(value: unknown): AuthenticationRequirements {
  const source = record(value, "Authentication requirements")
  return Object.freeze({
    username: bounds(source.username, "username"),
    password: bounds(source.password, "password")
  })
}

/** Validates complete credentials at the System mutation boundary. */
export function parseAuthenticationCredentials(value: unknown): AuthenticationCredentials {
  const source = record(value, "Authentication credentials")
  if (typeof source.username !== "string" || typeof source.password !== "string") {
    throw new Error("Authentication credentials require a username and password")
  }
  return Object.freeze({ username: source.username, password: source.password })
}

function bounds(value: unknown, name: string) {
  const source = record(value, `Authentication ${name} requirements`)
  const minimumLength = source.minimumLength
  const maximumLength = source.maximumLength
  if (!Number.isInteger(minimumLength) || !Number.isInteger(maximumLength)
    || Number(minimumLength) < 0 || Number(maximumLength) < Number(minimumLength)) {
    throw new Error(`The System returned invalid Authentication ${name} requirements`)
  }
  return Object.freeze({ minimumLength: Number(minimumLength), maximumLength: Number(maximumLength) })
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`)
  return value as Record<string, unknown>
}
