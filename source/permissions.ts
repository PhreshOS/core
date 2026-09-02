import type { Timeoutable } from "./timeout.js"

/** Canonical stored value of one permission. */
export type Permission = string[] | false | null

/** Values accepted where a permission is assigned. */
export type PermissionInput = true | string[] | false | null

/** Values a Program may ask the owner to grant. */
export type PermissionRequest = true | string[]

/** Canonical permission values indexed by their system-defined names. */
export type Permissions = Record<string, Permission>

/** Immutable initial permission assignments declared by one Client. */
export type ClientPermissionDeclarations = Readonly<Record<string, true | readonly string[]>>

/** Immutable resolved permission grants declared by one Client. */
export type ClientPermissions = Readonly<Record<string, readonly string[]>>

/** How one system-defined permission becomes effective in a Client document. */
export type PermissionActivation = "live" | "reload"

/** One permission known by a System implementation. */
export type PermissionDefinition = Readonly<{
  values: readonly string[]
  default: readonly string[]
  activation: PermissionActivation
  title: string
  description: string
}>

/** Result of assigning or requesting one permission. */
export type PermissionChange = Readonly<{
  permission: Permission
  needReload: boolean
}>

/** Permission request using one caller-selected deadline. */
export interface TimedContextPermissions {
  request(name: string, permission?: PermissionRequest): Promise<PermissionChange>
}

/** Stored permissions and owner requests belonging to the executing Client. */
export interface ContextPermissions extends TimedContextPermissions, Timeoutable<TimedContextPermissions> {
  /** Returns the stored user value, independently of current iframe activation. */
  get(name: string): Promise<Permission>
}

/** Authoritative stored user grants belonging to one Program. */
export interface ProgramPermissions {
  get(name: string): Promise<Permission>
  all(): Promise<Permissions>
  set(name: string, permission: Exclude<PermissionInput, null>): Promise<PermissionChange>
  delete(name: string): Promise<PermissionChange>
}

/** Reads one transport value against the general permission contract. */
export function parsePermission(value: unknown): Permission {
  if (value === false || value === null) return value
  if (Array.isArray(value) && value.every(entry => typeof entry === "string")) return [...value]

  throw new Error("The System returned an invalid permission")
}

/** Reads one transport result against the general permission-change contract. */
export function parsePermissionChange(value: unknown): PermissionChange {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The System returned an invalid permission change")
  }

  const change = value as { permission?: unknown, needReload?: unknown }

  if (typeof change.needReload !== "boolean") {
    throw new Error("The System returned an invalid permission reload state")
  }

  return Object.freeze({
    permission: parsePermission(change.permission),
    needReload: change.needReload
  })
}

/** Reads a transport snapshot against the general Program-permissions contract. */
export function parsePermissions(value: unknown): Permissions {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The System returned invalid Program permissions")
  }

  return Object.fromEntries(
    Object.entries(value).map(([name, permission]) => [name, parsePermission(permission)])
  )
}
