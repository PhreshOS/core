import type { Timeoutable } from "./timeout.js"

/** Every Client permission and the complete value domain accepted by it. */
export const clientPermissionCatalog = Object.freeze({
  all: Object.freeze([])
})

/** One permission name recognized by every PhreshOS environment. */
export type PermissionName = keyof typeof clientPermissionCatalog

/** One selectable value belonging to an exact permission. */
export type PermissionValue<Name extends PermissionName> = (typeof clientPermissionCatalog)[Name][number]

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
  values: readonly PermissionValue<Name>[]
  default: readonly PermissionValue<Name>[]
  title: string
  description: string
}>

/** One definition for every permission recognized by the Core catalog. */
export type PermissionDefinitions = Readonly<{
  [Name in PermissionName]: PermissionDefinition<Name>
}>

/** Result of assigning or requesting one exact permission. */
export type PermissionChange<Name extends PermissionName = PermissionName> = Readonly<{
  permission: Permission<Name>
  needReload: boolean
}>

/** Permission request using one caller-selected deadline. */
export interface TimedContextPermissions {
  request<Name extends PermissionName>(name: Name, permission?: PermissionRequest<Name>): Promise<PermissionChange<Name>>
}

/** Stored permissions and owner requests belonging to the executing Client. */
export interface ContextPermissions extends TimedContextPermissions, Timeoutable<TimedContextPermissions> {
  /** Returns the stored user value, independently of current iframe activation. */
  get<Name extends PermissionName>(name: Name): Promise<Permission<Name>>
}

/** Authoritative stored user grants belonging to one Program. */
export interface ProgramPermissions {
  get<Name extends PermissionName>(name: Name): Promise<Permission<Name>>
  all(): Promise<Permissions>
  set<Name extends PermissionName>(name: Name, permission: Exclude<PermissionInput<Name>, null>): Promise<PermissionChange<Name>>
  delete<Name extends PermissionName>(name: Name): Promise<PermissionChange<Name>>
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

  const allowed = clientPermissionCatalog[name] as readonly string[]

  if (
    Array.isArray(value)
    && value.every(entry => typeof entry === "string" && allowed.includes(entry))
  ) return [...new Set(value)] as PermissionValue<Name>[]

  throw new Error(`The System returned an invalid "${name}" permission`)
}

/** Reads one transport result against one exact permission-change contract. */
export function parsePermissionChange<Name extends PermissionName>(name: Name, value: unknown): PermissionChange<Name> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The System returned an invalid permission change")
  }

  const change = value as { permission?: unknown, needReload?: unknown }

  if (typeof change.needReload !== "boolean") {
    throw new Error("The System returned an invalid permission reload state")
  }

  return Object.freeze({
    permission: parsePermission(name, change.permission),
    needReload: change.needReload
  })
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
