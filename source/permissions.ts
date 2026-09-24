import type { Timeoutable } from "./timeout.js"
import type { Endpoint } from "./endpoint.js"
import { parseEndpointReference, type EndpointReference } from "./domain-snapshot.js"
import type { Subscribable } from "./subscribable.js"
import { parseNetworkScope, type NetworkScope } from "./network.js"
import { parseStorageScope, type StorageScope } from "./storage.js"
import type { Layer } from "./launch.js"
import { isProgramIdentity } from "./program-identity.js"

/** Every Program permission and the value domain accepted by it. */
export const programPermissionCatalog = Object.freeze({
  all: "none",
  services: "service",
  programs: "program",
  layers: "layer",
  network: "network",
  storage: "storage",
  uploads: "none",
  logs: "none",
  appearance: "none",
  desktopPreferences: "none",
  desktopConnection: "none",
  authentication: "none"
} as const)

/** One permission name recognized by every PhreshOS environment. */
export type PermissionName = keyof typeof programPermissionCatalog

/** The domain from which one permission accepts values. */
export type PermissionValueDomain<Name extends PermissionName = PermissionName> = (typeof programPermissionCatalog)[Name]

/** One selectable value belonging to an exact permission. */
export type PermissionValue<Name extends PermissionName> = Name extends PermissionName
  ? PermissionValueDomain<Name> extends "program" ? string
    : PermissionValueDomain<Name> extends "service" ? string
    : PermissionValueDomain<Name> extends "network" ? NetworkScope
      : PermissionValueDomain<Name> extends "storage" ? StorageScope
        : PermissionValueDomain<Name> extends "layer" ? Exclude<Layer, "window">
          : never
  : never

/** Canonical requested or granted scope. Lists represent unordered sets. */
export type PermissionScope<Name extends PermissionName = PermissionName> = readonly PermissionValue<Name>[]

/** Canonical effective value of one permission. Lists represent unordered sets. */
export type Permission<Name extends PermissionName = PermissionName> = PermissionScope<Name> | false | null

/** Values accepted where one exact permission is assigned. */
export type PermissionInput<Name extends PermissionName = PermissionName> =
  | true
  | readonly PermissionValue<Name>[]
  | false
  | null

/** Values an Endpoint may ask the owner to grant to its Program. */
export type PermissionRequestInput<Name extends PermissionName = PermissionName> =
  | true
  | PermissionScope<Name>

/** Canonical permission values indexed only by system-defined permission names. */
export type Permissions = Partial<{
  [Name in PermissionName]: Permission<Name>
}>

/** Permission defaults explicitly requested by a Program definition. */
export type ProgramPermissionDeclarations = Readonly<{
  [Name in PermissionName]?: true | readonly PermissionValue<Name>[]
}>

/** Validates and canonicalizes the permissions declared by one Program. */
export function parseProgramPermissionDeclarations(value: unknown): ProgramPermissionDeclarations {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A Program's permissions must be a permission declaration")
  }

  const declarations: Partial<Record<PermissionName, true | readonly unknown[]>> = {}

  for (const [unknownName, declaration] of Object.entries(value)) {
    if (!isPermissionName(unknownName)) continue
    const name = unknownName

    if (declaration === true) declarations[name] = true
    else if (Array.isArray(declaration)) {
      const permission = parsePermission(name, declaration)
      if (permission === false || permission === null) throw new Error(`A Program's "${name}" permission is invalid`)
      declarations[name] = permission
    }
    else throw new Error(`A Program's "${name}" permission must be true or a valid list`)
  }

  return Object.freeze(declarations) as ProgramPermissionDeclarations
}

/** Permission request using one caller-selected deadline. */
export interface TimedContextPermissions {
  /** Returns an equal effective assignment immediately; otherwise requests owner approval and replaces stored state. */
  request<Name extends PermissionName>(name: Name, permission?: PermissionRequestInput<Name>): Promise<Permission<Name>>
}

/** Effective permission state and owner decisions belonging to one Program. */
export interface ProgramPermissions {
  get<Name extends PermissionName>(name: Name): Promise<Permission<Name>>
  all(): Promise<Permissions>
  allows<Name extends PermissionName>(name: Name, permission?: PermissionRequestInput<Name>): Promise<boolean>
  /** Replaces the complete stored assignment with one allowed value. */
  allow<Name extends PermissionName>(name: Name, permission?: PermissionRequestInput<Name>): Promise<void>
  /** Replaces the complete stored assignment with an explicit denial. */
  deny<Name extends PermissionName>(name: Name): Promise<void>
}

/** Permission state and owner approval requests belonging to the currently executing Endpoint. */
export interface ContextPermissions extends TimedContextPermissions, Timeoutable<TimedContextPermissions> {
  get<Name extends PermissionName>(name: Name): Promise<Permission<Name>>
  all(): Promise<Permissions>
  allows<Name extends PermissionName>(name: Name, permission?: PermissionRequestInput<Name>): Promise<boolean>
}

/** Immutable boundary value from which every PermissionRequest handle is reconstructed. */
export type PermissionRequestSnapshot<Name extends PermissionName = PermissionName> = Readonly<{
  identity: string
  from: EndpointReference
  createdAt: Date
  expiresAt: Date
  name: Name
  scope: PermissionScope<Name>
}>

/** Events emitted by one PermissionRequest handle. */
export type PermissionRequestEvents<Name extends PermissionName = PermissionName> = {
  resolve: Permission<Name>
}

/** One live request for the owner to decide an Endpoint's Program permission. */
export abstract class PermissionRequest<Name extends PermissionName = PermissionName>
  implements Subscribable<PermissionRequestEvents<Name>, never> {
  protected constructor() {}

  public abstract readonly subscribe: Subscribable<PermissionRequestEvents<Name>, never>["subscribe"]
  public abstract readonly wait: Subscribable<PermissionRequestEvents<Name>, never>["wait"]
  public abstract readonly events: Subscribable<PermissionRequestEvents<Name>, never>["events"]

  public abstract readonly identity: string
  public abstract readonly from: Endpoint
  public abstract readonly createdAt: Date
  public abstract readonly expiresAt: Date
  public abstract readonly name: Name
  public abstract readonly scope: PermissionScope<Name>

  /** Returns whether this request still exists in the authoritative pending registry. */
  public abstract pending(): Promise<boolean>

  /** Permanently grants the requested scope to the requesting Endpoint's Program. */
  public abstract allow(): Promise<void>

  /** Permanently denies this permission for the requesting Endpoint's Program. */
  public abstract deny(): Promise<void>

  /** Ends this request without changing the Program's stored permission. */
  public abstract cancel(): Promise<void>
}

/** One request and the permission value that ended it. */
export type SystemPermissionResolve<Name extends PermissionName = PermissionName> = Readonly<{
  request: PermissionRequest<Name>
  permission: Permission<Name>
}>

/** System-wide PermissionRequest lifecycle events. */
export type SystemPermissionEvents = {
  permissionRequest: PermissionRequest
  permissionResolve: SystemPermissionResolve
}

/** Pending permission requests visible to callers with complete System authority. */
export interface SystemPermissions extends Subscribable<SystemPermissionEvents, never> {
  requests(): Promise<PermissionRequest[]>
}

/** Validates and canonicalizes one PermissionRequest boundary snapshot. */
export function parsePermissionRequestSnapshot(value: unknown): PermissionRequestSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The System returned an invalid permission request")

  const source = value as Record<string, unknown>
  const identity = source.identity
  const name = parsePermissionName(source.name)
  const scope = parsePermission(name, source.scope)
  const createdAt = source.createdAt instanceof Date ? new Date(source.createdAt) : new Date(String(source.createdAt))
  const expiresAt = source.expiresAt instanceof Date ? new Date(source.expiresAt) : new Date(String(source.expiresAt))

  if (typeof identity !== "string" || !identity || !Array.isArray(scope)
    || Number.isNaN(createdAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
    throw new Error("The System returned an invalid permission request")
  }

  return Object.freeze({
    identity,
    from: parseEndpointReference(source.from),
    createdAt,
    expiresAt,
    name,
    scope
  })
}

/** Whether one unknown value names a permission in the closed Core catalog. */
export function isPermissionName(value: unknown): value is PermissionName {
  return typeof value === "string" && Object.hasOwn(programPermissionCatalog, value)
}

/** Reads one unknown permission name against the closed Core catalog. */
export function parsePermissionName(value: unknown): PermissionName {
  if (isPermissionName(value)) return value

  throw new Error(`The System does not know the permission "${String(value)}"`)
}

/** Reads one transport value against one exact permission contract. */
export function parsePermission<Name extends PermissionName>(name: Name, value: unknown): Permission<Name> {
  if (value === false || value === null) return value

  if (Array.isArray(value)) {
    const values = parsePermissionValues(name, value)

    if (values) return [...new Set(values)] as PermissionValue<Name>[]
  }

  throw new Error(`The System returned an invalid "${name}" permission`)
}

function parsePermissionValues<Name extends PermissionName>(name: Name, values: readonly unknown[]) {
  const domain = programPermissionCatalog[parsePermissionName(name)]

  if (domain === "none") return values.length === 0 ? [] : null
  if (domain === "program") {
    return values.every(isProgramIdentity) ? values : null
  }
  if (domain === "service") {
    return values.every(value => typeof value === "string" && value.trim().length > 0) ? values : null
  }
  if (domain === "layer") {
    return values.every(value => value === "under" || value === "over" || value === "wallpaper" || value === "shell") ? values : null
  }
  if (domain === "network") {
    try { return values.map(parseNetworkScope) }
    catch { return null }
  }
  if (domain === "storage") {
    try { return values.map(parseStorageScope) }
    catch { return null }
  }

  domain satisfies never

  return null
}

/** Reads a transport snapshot against the complete closed permission contract. */
export function parsePermissions(value: unknown): Permissions {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The System returned invalid Program permissions")
  }

  const permissions: Partial<Record<PermissionName, Permission>> = {}

  for (const [unknownName, permission] of Object.entries(value)) {
    if (!isPermissionName(unknownName)) continue
    const name = unknownName
    permissions[name] = parsePermission(name, permission)
  }

  return permissions as Permissions
}
