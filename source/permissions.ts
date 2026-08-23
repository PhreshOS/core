import type { Timeoutable } from "./timeout.js"

/** Every permission recognized by this system release. */
export const permissionNames = ["pointer"] as const

/** The finite system-wide name of one permission. */
export type PermissionName = typeof permissionNames[number]

/** Persistent decisions may exist for any subset of system permissions. */
export type PermissionDecisions = Partial<Record<PermissionName, boolean>>

/** Validates an unknown value against the authoritative permission registry. */
export function isPermissionName(value: unknown): value is PermissionName {
  return permissionNames.some(name => name === value)
}

/** The effective decision for one permission, or `null` when none is known. */
export type PermissionDecision = boolean | null

/** Permission requests using one caller-selected deadline. */
export interface TimedPermission {
  /** Requests one permission, resolving `null` if the deadline expires. */
  request(name: PermissionName): Promise<PermissionDecision>
}

/** Client access to one Program's effective permission decisions. */
export interface Permission extends Timeoutable<TimedPermission> {
  /** Reads the effective decision without prompting the user. */
  granted(name: PermissionName): Promise<PermissionDecision>

  /** Requests a decision from the user. The default deadline is 30 seconds. */
  request(name: PermissionName): Promise<PermissionDecision>
}

/** Server-side management of one Program's persistent permission decisions. */
export interface ProgramPermission {
  /** Reads one persistent decision, or `undefined` when none is stored. */
  get(name: PermissionName): Promise<boolean | undefined>

  /** Returns an independent snapshot of every persistent decision. */
  getAll(): Promise<PermissionDecisions>

  /** Stores one persistent decision. */
  set(name: PermissionName, value: boolean): Promise<void>

  /** Removes one persistent decision. */
  delete(name: PermissionName): Promise<void>
}
