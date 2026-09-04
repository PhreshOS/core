import type { Timeoutable } from "./timeout.js"
import { parseNetworkScope, type NetworkScope } from "./network.js"
import { parseStorageScope, type StorageScope } from "./storage.js"

/** Every Client permission and the value domain accepted by it. */
export const clientPermissionCatalog = Object.freeze({
  all: "none",
  services: "program",
  programs: "program",
  network: "network",
  storage: "storage",
  uploads: "none",
  appearance: "none",
  desktopPreferences: "none"
} as const)

/** One permission name recognized by every PhreshOS environment. */
export type PermissionName = keyof typeof clientPermissionCatalog

/** The domain from which one permission accepts values. */
export type PermissionValueDomain<Name extends PermissionName = PermissionName> = (typeof clientPermissionCatalog)[Name]

/** One selectable value belonging to an exact permission. */
export type PermissionValue<Name extends PermissionName> = Name extends PermissionName
  ? PermissionValueDomain<Name> extends "program" ? string
    : PermissionValueDomain<Name> extends "network" ? NetworkScope
      : PermissionValueDomain<Name> extends "storage" ? StorageScope
      : never
  : never

/** Canonical stored value of one permission. Lists represent unordered sets. */
export type Permission<Name extends PermissionName = PermissionName> = PermissionValue<Name>[] | false | null

/** Values accepted where one exact permission is assigned. */
export type PermissionInput<Name extends PermissionName = PermissionName> =
  | true
  | readonly PermissionValue<Name>[]
  | false
  | null

/** Values a Program may ask the owner to grant. */
export type PermissionRequest<Name extends PermissionName = PermissionName> =
  | true
  | readonly PermissionValue<Name>[]

/** Canonical stored values indexed only by system-defined permission names. */
export type Permissions = Partial<{
  [Name in PermissionName]: Permission<Name>
}>

/** Immutable initial permission assignments declared by one Client. */
export type ClientPermissionDeclarations = Readonly<{
  [Name in PermissionName]?: true | readonly PermissionValue<Name>[]
}>

/** Immutable resolved permission grants declared by one Client. */
export type ClientPermissions = Readonly<{
  [Name in PermissionName]?: readonly PermissionValue<Name>[]
}>

/** Presentation and default assignment belonging to one exact permission. */
export type PermissionDefinition<Name extends PermissionName = PermissionName> = Readonly<{
  valueDomain: PermissionValueDomain<Name>
  default: readonly PermissionValue<Name>[]
  title: string
  description: string
}>

/** One definition for every permission recognized by the Core catalog. */
export type PermissionDefinitions = Readonly<{
  [Name in PermissionName]: PermissionDefinition<Name>
}>

/** Permission request using one caller-selected deadline. */
export interface TimedContextPermissions {
  /** Returns the requested canonical scope when granted, false when denied, or null when unresolved. */
  request<Name extends PermissionName>(name: Name, permission?: PermissionRequest<Name>): Promise<Permission<Name>>
}

/** Stored permissions and owner requests belonging to the executing Client. */
export interface ContextPermissions extends TimedContextPermissions, Timeoutable<TimedContextPermissions> {
  /** Returns the stored user value, independently of declared or implied grants. */
  get<Name extends PermissionName>(name: Name): Promise<Permission<Name>>

  /** Returns whether the current execution context effectively holds the requested permission. */
  allows<Name extends PermissionName>(name: Name, permission?: PermissionRequest<Name>): Promise<boolean>
}

/** Authoritative stored user grants belonging to one Program. */
export interface ProgramPermissions {
  get<Name extends PermissionName>(name: Name): Promise<Permission<Name>>
  all(): Promise<Permissions>
  allows<Name extends PermissionName>(name: Name, permission?: PermissionRequest<Name>): Promise<boolean>
  set<Name extends PermissionName>(name: Name, permission: Exclude<PermissionInput<Name>, null>): Promise<void>
  delete<Name extends PermissionName>(name: Name): Promise<void>
}

/** Whether one unknown value names a permission in the closed Core catalog. */
export function isPermissionName(value: unknown): value is PermissionName {
  return typeof value === "string" && Object.hasOwn(clientPermissionCatalog, value)
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
  const domain = clientPermissionCatalog[parsePermissionName(name)]

  if (domain === "none") return values.length === 0 ? [] : null
  if (domain === "program") {
    return values.every(value => typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) ? values : null
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

/** Reads immutable Program-declared grants against the closed permission contract. */
export function parseClientPermissions(value: unknown): ClientPermissions {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The System returned invalid Client permissions")
  }

  const permissions: Partial<Record<PermissionName, readonly string[]>> = {}

  for (const [unknownName, permission] of Object.entries(value)) {
    const name = parsePermissionName(unknownName)
    const parsed = parsePermission(name, permission)

    if (!Array.isArray(parsed)) throw new Error(`The System returned an invalid declared "${name}" permission`)

    permissions[name] = Object.freeze([...parsed])
  }

  return Object.freeze(permissions) as ClientPermissions
}

/** Reads a transport snapshot against the complete closed permission contract. */
export function parsePermissions(value: unknown): Permissions {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The System returned invalid Program permissions")
  }

  const permissions: Partial<Record<PermissionName, Permission>> = {}

  for (const [unknownName, permission] of Object.entries(value)) {
    const name = parsePermissionName(unknownName)
    permissions[name] = parsePermission(name, permission)
  }

  return permissions as Permissions
}
