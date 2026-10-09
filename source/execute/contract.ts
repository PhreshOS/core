import { z } from "zod"
import { layers } from "../launch.js"
import type { JsonValue } from "../content.js"
import type { EndpointLifecycleEvents } from "../endpoint.js"
import type { ProcessEvents } from "../process.js"
import type { ProgramEvents } from "../program.js"
import type { SystemProcessEvents, SystemProgramEvents } from "../system.js"
import type { ServiceLifecycleEvents } from "../service.js"
import type { SystemServiceEvents } from "../system.js"
import type { WindowEvents } from "../window.js"
import type { ConnectionEvents } from "../connection.js"
import type { SessionEvents } from "../session.js"
import type { SystemAuthenticationEvents } from "../authentication.js"
import { isProgramIdentity } from "../program-identity.js"
import { programPermissionCatalog, type SystemPermissionEvents } from "../permissions.js"
import type { AppearanceEvents } from "../appearance.js"
import type { SystemOpeningEvents } from "../opening.js"

const jsonValue: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.null(),
  z.boolean(),
  z.number(),
  z.string(),
  z.array(jsonValue),
  z.record(z.string(), jsonValue)
]))

const metric = z.union([
  z.number().describe("Pixels"),
  z.string().describe("Workspace-relative expression")
])

const position = z.looseObject({
  x: metric.describe("Horizontal position"),
  y: metric.describe("Vertical position")
}).describe("Window position")

const size = z.looseObject({
  width: metric.describe("Window width"),
  height: metric.describe("Window height")
}).describe("Window size")

const serverLaunch = z.looseObject({
  service: z.boolean().optional().describe("Whether the Server Endpoint is addressable as a Service")
}).describe("Server Endpoint launch settings")

const clientLaunch = z.looseObject({
  service: z.boolean().optional().describe("Whether the Client Endpoint is addressable as a Service"),
  title: z.string().optional().describe("Initial Window title"),
  header: z.boolean().optional().describe("Whether the standard Window header is shown"),
  size: size.optional().describe("Initial Window size"),
  position: position.optional().describe("Initial Window position"),
  layer: z.enum(layers).optional().describe("Desktop Window layer"),
  minimize: z.boolean().optional().describe("Whether the Window starts minimized"),
  maximize: z.boolean().optional().describe("Whether the Window starts maximized")
}).describe("Client Endpoint launch settings")

const launch = z.looseObject({
  name: z.string().optional().describe("Program-local Process name"),
  replace: z.boolean().optional().describe("Whether an existing named Process is replaced"),
  server: z.union([z.boolean(), serverLaunch]).optional().describe("Server Endpoint selection and settings"),
  client: z.union([z.boolean(), clientLaunch]).optional().describe("Client Endpoint selection and settings"),
  options: z.record(z.string(), z.string()).optional().describe("Immutable Process options")
}).describe("Process launch")

const namedLaunch = launch.extend({
  name: z.string().min(1).describe("Program-local Process name")
})

const endpointIdentity = {
  program: z.string().optional().describe("Owning Program identity when resolving a Process name"),
  process: z.string().describe("Process identity or Program-local name"),
  endpoint: z.enum(["server", "client"]).describe("Endpoint kind")
} as const

const serviceAddress = {
  program: z.string().refine(isProgramIdentity, "A Service Program must be a canonical identity").describe("Owning Program identity"),
  process: z.string().min(1).describe("Program-local Process and Service name"),
  endpoint: z.enum(["server", "client"]).describe("Endpoint kind")
} as const

const windowIdentity = {
  program: endpointIdentity.program,
  process: endpointIdentity.process
} as const

const endpointState = z.looseObject({
  declared: z.boolean().describe("Whether the Program declares this Endpoint"),
  running: z.boolean().describe("Whether the Endpoint currently has a running execution context"),
  service: z.boolean().describe("Whether the Endpoint execution context is a Service")
})

const programResult = z.looseObject({
  identity: z.string().describe("Stable Program identity"),
  assetId: z.string().describe("Public Program asset identity"),
  name: z.string().describe("Human-readable Program name"),
  version: z.string().describe("Resolved Program version"),
  description: z.string().nullable().describe("Declared Program description"),
  installed: z.boolean().describe("Whether production files are installed"),
  categories: z.array(z.string()).describe("Declared catalog categories"),
  keywords: z.array(z.string()).describe("Declared search keywords"),
  opens: z.array(z.string()).describe("Declared media types it opens"),
  declaredPermissions: z.record(z.string(), z.union([z.literal(true), z.array(z.string())])).describe("Declared permissions"),
  hasAgent: z.boolean().describe("Whether the Program provides agent documentation"),
  server: z.looseObject({
    start: z.boolean(),
    service: z.boolean()
  }).nullable().describe("Resolved Server Endpoint declaration"),
  client: z.looseObject({
    start: z.boolean(),
    service: z.boolean(),
    title: z.string().nullable(),
    header: z.boolean().nullable(),
    size: size.nullable(),
    position: position.nullable(),
    layer: z.enum(layers).nullable(),
    minimize: z.boolean().nullable(),
    maximize: z.boolean().nullable()
  }).nullable().describe("Resolved Client Endpoint declaration")
}).describe("Program state")

const logRow = z.record(z.string(), jsonValue).describe("One row returned by the logs query")

const sqlRow = z.record(z.string(), jsonValue).describe("One row returned by the statement")

const processResult = z.looseObject({
  identity: z.string().describe("Unique Process identity"),
  name: z.string().nullable().describe("Program-local Process name"),
  program: z.string().describe("Owning Program identity"),
  startedAt: z.string().describe("ISO start time"),
  server: endpointState.describe("Server Endpoint state"),
  client: endpointState.describe("Client Endpoint state")
}).describe("Process state")

const endpointResult = z.looseObject({
  process: z.string().describe("Owning Process identity"),
  program: z.string().describe("Owning Program identity"),
  endpoint: z.enum(["server", "client"]).describe("Endpoint kind"),
  declared: z.boolean().describe("Whether the Program declares this Endpoint"),
  running: z.boolean().describe("Whether the Endpoint currently has a running execution context"),
  service: z.boolean().describe("Whether the Endpoint execution context is a Service")
}).describe("Endpoint state")

const serviceResult = z.looseObject({
  ...serviceAddress,
  available: z.boolean().describe("Whether a ready Endpoint is currently available at this Service address")
}).describe("Service state")

const windowResult = z.looseObject({
  process: z.string().describe("Owning Process identity"),
  title: z.string().describe("Window title"),
  header: z.boolean().describe("Whether the Desktop-owned Window header is shown"),
  position,
  size,
  minimized: z.boolean().describe("Whether the Window is minimized"),
  maximized: z.boolean().describe("Whether the Window is maximized"),
  front: z.boolean().describe("Whether the Window is frontmost in its layer"),
  layer: z.enum(layers).describe("Window layer")
}).describe("Window state")

const connectionResult = z.looseObject({
  identity: z.string().describe("Stable Connection identity"),
  connected: z.boolean().describe("Whether the browser connection is live"),
  session: z.string().nullable().describe("Attached Session identity"),
  connectedAt: z.string().describe("ISO time the browser connected"),
  device: z.string().nullable().describe("Browser and system, such as Chrome on macOS")
}).describe("Connection state")

const sessionResult = z.looseObject({
  identity: z.string().describe("Stable Session identity"),
  valid: z.boolean().describe("Whether the Session can authorize Connections"),
  createdAt: z.string().describe("ISO time the owner signed in"),
  device: z.string().nullable().describe("Browser and system it signed in from"),
  lastActiveAt: z.string().nullable().describe("ISO time it was last used; now while a Connection uses it")
}).describe("Session state")

const programRegistryEvents = {
  create: "create", forget: "forget", install: "install", uninstall: "uninstall", pin: "pin", changePermissions: "changePermissions", changeStartup: "changeStartup"
} as const satisfies { [Event in keyof SystemProgramEvents]: Event }
const individualProgramEvents = {
  processCreate: "processCreate", processExit: "processExit", forget: "forget", uninstall: "uninstall", pin: "pin"
} as const satisfies { [Event in keyof ProgramEvents]: Event }
const systemProcessEvents = {
  create: "create", exit: "exit"
} as const satisfies { [Event in keyof SystemProcessEvents]: Event }
const individualProcessEvents = {
  exit: "exit"
} as const satisfies { [Event in keyof ProcessEvents]: Event }
const endpointLifecycleEvents = {
  start: "start", stop: "stop"
} as const satisfies { [Event in keyof EndpointLifecycleEvents]: Event }
const serviceLifecycleEvents = {
  available: "available", unavailable: "unavailable"
} as const satisfies { [Event in keyof ServiceLifecycleEvents]: Event }
const systemServiceEvents = {
  available: "available", unavailable: "unavailable"
} as const satisfies { [Event in keyof SystemServiceEvents]: Event }
const windowEvents = {
  move: "move", resize: "resize", minimize: "minimize",
  maximize: "maximize", changeTitle: "changeTitle", changeHeader: "changeHeader", front: "front"
} as const satisfies { [Event in keyof WindowEvents]: Event }
const authenticationEvents = {
  connectionCreate: "connectionCreate", connectionDisconnect: "connectionDisconnect",
  sessionCreate: "sessionCreate", sessionEnd: "sessionEnd"
} as const satisfies { [Event in keyof SystemAuthenticationEvents]: Event }
const connectionEvents = {
  sessionChange: "sessionChange", disconnect: "disconnect"
} as const satisfies { [Event in keyof ConnectionEvents]: Event }
const sessionEvents = {
  connectionAttach: "connectionAttach", connectionDetach: "connectionDetach", end: "end"
} as const satisfies { [Event in keyof SessionEvents]: Event }

const programWaitRequest = request("program", "wait", {
  program: z.string().optional().describe("Program identity; omission observes the System Program registry"),
  event: z.enum([...new Set([
    ...Object.values(programRegistryEvents), ...Object.values(individualProgramEvents)
  ])]).describe("Lifecycle event"),
  timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
}).superRefine((value, context) => {
  if (value.program && (value.event === "create" || value.event === "install")) {
    context.addIssue({ code: "custom", message: `An individual Program does not emit ${value.event}` })
  }
  if (!value.program && (value.event === "processCreate" || value.event === "processExit")) {
    context.addIssue({ code: "custom", message: `${value.event} belongs to an individual Program` })
  }
})

const processWaitRequest = request("process", "wait", {
  program: z.string().optional().describe("Program identity; omission observes the System Process registry"),
  process: z.string().optional().describe("Process identity or Program-local name"),
  event: z.enum([...new Set([
    ...Object.values(systemProcessEvents), ...Object.values(individualProcessEvents)
  ])]).describe("Lifecycle event"),
  timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
}).superRefine((value, context) => {
  if (value.process && value.event === "create") {
    context.addIssue({ code: "custom", message: "An individual Process does not emit create" })
  }
})

const connectionWaitRequest = request("connection", "wait", {
  identity: z.string().optional().describe("Connection identity; omission observes the Authentication registry"),
  event: z.enum([
    authenticationEvents.connectionCreate, authenticationEvents.connectionDisconnect,
    ...Object.values(connectionEvents)
  ]).describe("Connection lifecycle event"),
  timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
}).superRefine((value, context) => {
  const individual = value.event === "sessionChange" || value.event === "disconnect"
  const registry = value.event === "connectionCreate" || value.event === "connectionDisconnect"
  if (value.identity && !individual || !value.identity && !registry) {
    context.addIssue({ code: "custom", message: `${value.event} does not belong to the selected Connection scope` })
  }
})

const sessionWaitRequest = request("session", "wait", {
  identity: z.string().optional().describe("Session identity; omission observes the Authentication registry"),
  event: z.enum([
    authenticationEvents.sessionCreate, authenticationEvents.sessionEnd,
    ...Object.values(sessionEvents)
  ]).describe("Session lifecycle event"),
  timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
}).superRefine((value, context) => {
  const individual = value.event === "connectionAttach" || value.event === "connectionDetach" || value.event === "end"
  const registry = value.event === "sessionCreate" || value.event === "sessionEnd"
  if (value.identity && !individual || !value.identity && !registry) {
    context.addIssue({ code: "custom", message: `${value.event} does not belong to the selected Session scope` })
  }
})

const lifecycleResult = z.looseObject({
  scope: z.enum(["system", "program", "process", "endpoint", "service", "window", "connection", "session", "appearance", "opening", "permission"]),
  program: z.string().optional(),
  process: z.string().optional(),
  endpoint: z.enum(["server", "client"]).optional(),
  connection: z.string().optional(),
  session: z.string().optional(),
  event: z.string(),
  payload: jsonValue
}).describe("One observed lifecycle event")

const permissionName = z.enum(Object.keys(programPermissionCatalog) as [keyof typeof programPermissionCatalog, ...(keyof typeof programPermissionCatalog)[]]).describe("Permission name")

const endpointReference = z.looseObject({
  program: z.string().describe("Program identity"),
  process: z.string().describe("Process identity"),
  endpoint: z.enum(["server", "client"]).describe("Endpoint kind")
}).describe("Endpoint")

const openRequestResult = z.looseObject({
  identity: z.string().describe("Open request identity"),
  from: endpointReference.nullable().describe("The Endpoint that asked, or null when the owner asked from outside"),
  createdAt: z.string().describe("ISO creation time"),
  type: z.string().describe("Exact media type"),
  uri: z.string().describe("Where it is"),
  programs: z.array(z.string()).describe("Identities of the Programs that open it")
}).describe("Open request")

const permissionRequestResult = z.looseObject({
  identity: z.string().describe("Permission request identity"),
  from: endpointReference.describe("The Endpoint that asked"),
  createdAt: z.string().describe("ISO creation time"),
  expiresAt: z.string().describe("ISO expiry time"),
  name: permissionName,
  scope: z.array(z.string()).describe("Requested values; an empty list is the whole permission")
}).describe("Permission request")

const appearanceEvents = { change: "change" } as const satisfies { [Event in keyof AppearanceEvents]: Event }
const openingEvents = {
  openRequest: "openRequest", openResolve: "openResolve", changeDefault: "changeDefault"
} as const satisfies { [Event in keyof SystemOpeningEvents]: Event }
const permissionEvents = {
  permissionRequest: "permissionRequest", permissionResolve: "permissionResolve"
} as const satisfies { [Event in keyof SystemPermissionEvents]: Event }

const operationSummary = z.looseObject({
  domain: z.string().describe("Operation domain"),
  operation: z.string().describe("Operation name"),
  description: z.string().describe("Operation meaning")
})

const operationDescription = operationSummary.extend({
  request: jsonValue.describe("JSON Schema for the request"),
  result: jsonValue.describe("JSON Schema for the successful result")
})

function request<Domain extends string, Operation extends string, Shape extends z.ZodRawShape>(
  domain: Domain,
  operation: Operation,
  shape: Shape = {} as Shape
) {
  return z.looseObject({
    $domain: z.literal(domain),
    $operation: z.literal(operation),
    ...shape
  })
}

function defineOperation<
  Domain extends string,
  Operation extends string,
  Request extends z.ZodType,
  Result extends z.ZodType
>(domain: Domain, operation: Operation, description: string, input: Request, result: Result) {
  return Object.freeze({ domain, operation, description, request: input.describe(description), result })
}

const executeOperations = Object.freeze([
  defineOperation("operation", "list", "List the operations available through Execute.", request("operation", "list", {
    domain: z.string().optional().describe("Optional domain filter")
  }), z.array(operationSummary)),
  defineOperation("operation", "describe", "Describe one Execute operation and its JSON contracts.", request("operation", "describe", {
    domain: z.string().describe("Operation domain"),
    operation: z.string().describe("Operation name")
  }), operationDescription.nullable()),

  defineOperation("system", "about", "Read the System's name, version, and release.", request("system", "about", {}), z.looseObject({
    name: z.string().describe("The System's name"),
    version: z.string().describe("The installed version"),
    release: z.looseObject({
      name: z.string().describe("The major version's name"),
      program: z.string().describe("The Program that looks after this release")
    }).describe("The release this version belongs to")
  })),
  defineOperation("system", "open", "Open something with its type's default Program, or the one the owner chooses.", request("system", "open", {
    type: z.string().describe("Exact media type, such as image/png or x-scheme-handler/https"),
    uri: z.string().describe("Where it is, as a URI")
  }), z.null()),
  defineOperation("system", "logs", "Query records produced by the PhreshOS System.", request("system", "logs", {
    statement: z.string().min(1).describe("Table: logs. Columns: createdAt, level, source, kind, content, data."),
    values: z.array(jsonValue).optional().describe("Bound statement values")
  }), z.array(logRow)),

  defineOperation("appearance", "get", "Read the complete System Appearance.", request("appearance", "get", {}), jsonValue),
  defineOperation("appearance", "update", "Change part of the System Appearance; everything left out stays as it is.", request("appearance", "update", {
    value: z.record(z.string(), jsonValue).describe("Partial Appearance; omitted parts stay as they are")
  }), jsonValue),
  defineOperation("appearance", "wait", "Wait for the System Appearance to change.", request("appearance", "wait", {
    event: z.enum(Object.values(appearanceEvents)).describe("Appearance event"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), lifecycleResult),

  defineOperation("opening", "defaults", "Read the default Program of each media type and family.", request("opening", "defaults", {}), z.record(z.string(), z.string())),
  defineOperation("opening", "setDefault", "Make one Program the default for a media type, or for a family such as image/*.", request("opening", "setDefault", {
    type: z.string().describe("Exact media type, or a family such as image/*"),
    program: z.string().describe("Program identity")
  }), z.null()),
  defineOperation("opening", "clearDefault", "Remove the default of a media type or family.", request("opening", "clearDefault", {
    type: z.string().describe("Exact media type, or a family such as image/*")
  }), z.null()),
  defineOperation("opening", "requests", "List open requests waiting for the owner's choice.", request("opening", "requests", {}), z.array(openRequestResult)),
  defineOperation("opening", "choose", "Open a waiting request with one of its Programs.", request("opening", "choose", {
    request: z.string().describe("Open request identity"),
    program: z.string().describe("Program identity"),
    always: z.boolean().optional().describe("Also make it the default for this type")
  }), z.null()),
  defineOperation("opening", "cancel", "End a waiting open request without opening anything.", request("opening", "cancel", {
    request: z.string().describe("Open request identity")
  }), z.null()),
  defineOperation("opening", "wait", "Wait for an open request, its resolution, or a default change.", request("opening", "wait", {
    event: z.enum(Object.values(openingEvents)).describe("Opening event"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), lifecycleResult),

  defineOperation("permission", "requests", "List permission requests waiting for the owner's decision.", request("permission", "requests", {}), z.array(permissionRequestResult)),
  defineOperation("permission", "allow", "Grant a waiting permission request.", request("permission", "allow", {
    request: z.string().describe("Permission request identity")
  }), z.null()),
  defineOperation("permission", "deny", "Deny a waiting permission request.", request("permission", "deny", {
    request: z.string().describe("Permission request identity")
  }), z.null()),
  defineOperation("permission", "cancel", "End a waiting permission request without deciding it.", request("permission", "cancel", {
    request: z.string().describe("Permission request identity")
  }), z.null()),
  defineOperation("permission", "wait", "Wait for a permission request or its resolution.", request("permission", "wait", {
    event: z.enum(Object.values(permissionEvents)).describe("Permission event"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), lifecycleResult),

  defineOperation("authentication", "state", "Read the owner's username.", request("authentication", "state", {}), z.looseObject({
    username: z.string().nullable().describe("The owner's username, or null before one is set")
  })),
  defineOperation("authentication", "requirements", "Read the credential lengths this System accepts.", request("authentication", "requirements", {}), z.looseObject({
    username: z.looseObject({ minimumLength: z.number(), maximumLength: z.number() }),
    password: z.looseObject({ minimumLength: z.number(), maximumLength: z.number() })
  })),
  defineOperation("authentication", "setCredentials", "Replace the owner's sign-in credentials; existing Sessions stay.", request("authentication", "setCredentials", {
    username: z.string().describe("New username"),
    password: z.string().describe("New password")
  }), z.null()),
  defineOperation("authentication", "signOutAll", "End every Session.", request("authentication", "signOutAll", {}), z.null()),

  defineOperation("connection", "list", "List the browsers connected now, signed in or not.", request("connection", "list", {}), z.array(connectionResult)),
  defineOperation("connection", "find", "Find one connected browser by its identity.", request("connection", "find", {
    identity: z.string().describe("Connection identity")
  }), connectionResult.nullable()),
  defineOperation("connection", "session", "Read the sign-in (Session) one connected browser uses, or null.", request("connection", "session", {
    identity: z.string().describe("Connection identity")
  }), sessionResult.nullable()),
  defineOperation("connection", "signIn", "Sign a connected browser in without a password, creating a Session for it.", request("connection", "signIn", {
    identity: z.string().describe("Connection identity")
  }), sessionResult),
  defineOperation("connection", "wait", "Wait for a browser to connect or disconnect, or to sign in or out.", connectionWaitRequest, lifecycleResult),

  defineOperation("session", "list", "List the sign-ins (Sessions) still valid.", request("session", "list", {}), z.array(sessionResult)),
  defineOperation("session", "find", "Find one valid Session by its identity.", request("session", "find", {
    identity: z.string().describe("Session identity")
  }), sessionResult.nullable()),
  defineOperation("session", "connections", "List the browsers using one Session.", request("session", "connections", {
    identity: z.string().describe("Session identity")
  }), z.array(connectionResult)),
  defineOperation("session", "signOut", "End one Session: every browser using it is signed out and stays connected.", request("session", "signOut", {
    identity: z.string().describe("Session identity")
  }), z.null()),
  defineOperation("session", "wait", "Wait for a Session to start or end.", sessionWaitRequest, lifecycleResult),

  defineOperation("program", "list", "List the Programs you can see, installed or running from a project.", request("program", "list", {
    installed: z.boolean().optional().describe("Filter by Program installation state"),
    opens: z.string().optional().describe("Only Programs that open this exact media type"),
    startup: z.boolean().optional().describe("Only Programs that start with the System, or only those that do not")
  }), z.array(programResult)),
  defineOperation("program", "find", "Find one Program by its identity.", request("program", "find", {
    identity: z.string().describe("Program identity")
  }), programResult.nullable()),
  defineOperation("program", "agent", "Read one Program's agent documentation.", request("program", "agent", {
    identity: z.string().describe("Program identity")
  }), z.looseObject({ program: z.string(), content: z.string().nullable() })),
  defineOperation("program", "definition", "Read everything one Program's author declared.", request("program", "definition", {
    identity: z.string().describe("Program identity")
  }), jsonValue),
  defineOperation("program", "getStartup", "Read the launch one Program starts when the System starts.", request("program", "getStartup", {
    identity: z.string().describe("Program identity")
  }), launch.nullable()),
  defineOperation("program", "setStartup", "Set the launch one Program starts when the System starts.", request("program", "setStartup", {
    identity: z.string().describe("Program identity"),
    launch: launch.optional().describe("Startup Process launch; omission uses the Program's default launch")
  }), launch),
  defineOperation("program", "removeStartup", "Remove the launch one Program starts when the System starts.", request("program", "removeStartup", {
    identity: z.string().describe("Program identity")
  }), z.null()),
  defineOperation("program", "pinned", "Read whether one Program is pinned.", request("program", "pinned", {
    identity: z.string().describe("Program identity")
  }), z.boolean()),
  defineOperation("program", "pin", "Pin one Program, or unpin it.", request("program", "pin", {
    identity: z.string().describe("Program identity"),
    pinned: z.boolean().optional().describe("False unpins; omission pins")
  }), z.boolean()),
  defineOperation("program", "getPermission", "Read what one permission allows a Program now: the owner's decision, or else its declaration.", request("program", "getPermission", {
    identity: z.string().describe("Program identity"),
    permission: z.enum(Object.keys(programPermissionCatalog) as [keyof typeof programPermissionCatalog, ...(keyof typeof programPermissionCatalog)[]]).describe("Permission name")
  }), z.union([z.array(z.string()), z.literal(false), z.null()])),
  defineOperation("program", "listPermissions", "Read every permission a Program has now.", request("program", "listPermissions", {
    identity: z.string().describe("Program identity")
  }), z.record(z.string(), z.union([z.array(z.string()), z.literal(false), z.null()]))),
  defineOperation("program", "allowsPermission", "Check whether a Program may do something, such as reach one address.", request("program", "allowsPermission", {
    identity: z.string().describe("Program identity"),
    permission: z.enum(Object.keys(programPermissionCatalog) as [keyof typeof programPermissionCatalog, ...(keyof typeof programPermissionCatalog)[]]).describe("Permission name"),
    value: z.union([z.literal(true), z.array(z.string())]).optional().describe("Requested permission value")
  }), z.boolean()),
  defineOperation("program", "allowPermission", "Grant a Program a permission, replacing what it had for that permission.", request("program", "allowPermission", {
    identity: z.string().describe("Program identity"),
    permission: z.enum(Object.keys(programPermissionCatalog) as [keyof typeof programPermissionCatalog, ...(keyof typeof programPermissionCatalog)[]]).describe("Permission name"),
    value: z.union([z.literal(true), z.array(z.string())]).optional().describe("Complete allowed permission value")
  }), z.array(z.string())),
  defineOperation("program", "denyPermission", "Refuse a Program a permission.", request("program", "denyPermission", {
    identity: z.string().describe("Program identity"),
    permission: z.enum(Object.keys(programPermissionCatalog) as [keyof typeof programPermissionCatalog, ...(keyof typeof programPermissionCatalog)[]]).describe("Permission name")
  }), z.literal(false)),
  defineOperation("program", "resetPermission", "Remove the owner's decision on one permission, so what the Program declares applies again.", request("program", "resetPermission", {
    identity: z.string().describe("Program identity"),
    permission: z.enum(Object.keys(programPermissionCatalog) as [keyof typeof programPermissionCatalog, ...(keyof typeof programPermissionCatalog)[]]).describe("Permission name")
  }), z.union([z.array(z.string()), z.literal(false), z.null()])),
  defineOperation("program", "logs", "Query what one Program's Server and Client printed.", request("program", "logs", {
    identity: z.string().describe("Program identity"),
    statement: z.string().min(1).describe("Table: logs. Columns: createdAt, process, source, kind, content."),
    values: z.array(jsonValue).optional().describe("Bound statement values")
  }), z.array(logRow)),
  defineOperation("program", "storeGet", "Read one key from a Program's store.", request("program", "storeGet", {
    identity: z.string().describe("Program identity"),
    key: z.string().describe("Store key")
  }), jsonValue.nullable()),
  defineOperation("program", "storeSet", "Set one key in a Program's store.", request("program", "storeSet", {
    identity: z.string().describe("Program identity"),
    key: z.string().describe("Store key"),
    value: jsonValue.describe("JSON value"),
    ttl: z.number().positive().optional().describe("Milliseconds until the key expires")
  }), z.boolean()),
  defineOperation("program", "storeDelete", "Delete one key from a Program's store.", request("program", "storeDelete", {
    identity: z.string().describe("Program identity"),
    key: z.string().describe("Store key")
  }), z.boolean()),
  defineOperation("program", "query", "Run one SQL statement on a Program's own database.", request("program", "query", {
    identity: z.string().describe("Program identity"),
    statement: z.string().min(1).describe("SQL statement"),
    values: z.array(jsonValue).optional().describe("Bound statement values")
  }), z.array(sqlRow)),
  defineOperation("program", "exitProcesses", "End every run of one Program.", request("program", "exitProcesses", {
    identity: z.string().describe("Program identity")
  }), z.array(z.string())),
  defineOperation("program", "forget", "End a Program's runs and remove it from the System; its installed files stay.", request("program", "forget", {
    identity: z.string().describe("Program identity")
  }), z.null()),
  defineOperation("program", "wait", "Wait for a Program to be created, installed, removed, pinned, or changed.", programWaitRequest, lifecycleResult),

  defineOperation("process", "list", "List the runs (Processes) of the Programs you can see.", request("process", "list", {
    program: z.string().optional().describe("Restrict the list to one Program")
  }), z.array(processResult)),
  defineOperation("process", "find", "Find one run by its identity, or by its name within its Program.", request("process", "find", {
    program: z.string().optional().describe("Owning Program identity when resolving a Process name"),
    process: z.string().describe("Process identity or Program-local name")
  }), processResult.nullable()),
  defineOperation("process", "create", "Start a run of a Program; what is left out starts as the Program declares. With only the Program, this opens it as the owner would.", request("process", "create", {
    program: z.string().describe("Owning Program identity"),
    launch: launch.optional().describe("Process launch")
  }), processResult),
  defineOperation("process", "findOrCreate", "Find the run with this name, or start it if none runs, in one step.", request("process", "findOrCreate", {
    program: z.string().describe("Owning Program identity"),
    launch: namedLaunch.describe("Named Process launch")
  }), processResult),
  defineOperation("process", "exit", "End one run: its Server stops and its Window closes.", request("process", "exit", windowIdentity), processResult),
  defineOperation("process", "wait", "Wait for a run to start or end.", processWaitRequest, lifecycleResult),

  defineOperation("endpoint", "inspect", "Read whether one side of a run, its Server or its Client, runs and is ready.", request("endpoint", "inspect", endpointIdentity), endpointResult),
  defineOperation("endpoint", "start", "Start one side of a run if it is not running, such as a Window that was closed.", z.union([
    request("endpoint", "start", {
      program: endpointIdentity.program,
      process: endpointIdentity.process,
      endpoint: z.literal("server"),
      launch: serverLaunch.optional().describe("Server Endpoint launch settings")
    }),
    request("endpoint", "start", {
      program: endpointIdentity.program,
      process: endpointIdentity.process,
      endpoint: z.literal("client"),
      launch: clientLaunch.optional().describe("Client Endpoint launch settings")
    })
  ]), endpointResult),
  defineOperation("endpoint", "stop", "Stop one side of a run if it runs; the run goes on with its other side.", request("endpoint", "stop", endpointIdentity), endpointResult),
  defineOperation("endpoint", "waitReady", "Wait until one side of a run can be used, such as a Server that answers.", request("endpoint", "waitReady", {
    ...endpointIdentity,
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), endpointResult),
  defineOperation("endpoint", "ask", "Ask a run's Server a question and return its answer.", request("endpoint", "ask", {
    ...endpointIdentity,
    event: z.string().min(1).describe("Event name"),
    input: jsonValue.optional().describe("Event input"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), jsonValue),
  defineOperation("endpoint", "publish", "Send a run's Server or Client a message, with no answer.", request("endpoint", "publish", {
    ...endpointIdentity,
    event: z.string().min(1).describe("Event name"),
    input: jsonValue.optional().describe("Event input")
  }), endpointResult),
  defineOperation("endpoint", "wait", "Wait for one message a run's Server or Client sends out.", request("endpoint", "wait", {
    ...endpointIdentity,
    event: z.string().min(1).describe("Event name"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), lifecycleResult),
  defineOperation("endpoint", "waitLifecycle", "Wait for one side of a run to start or stop.", request("endpoint", "waitLifecycle", {
    ...endpointIdentity,
    event: z.enum(Object.values(endpointLifecycleEvents)).describe("Lifecycle event"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), lifecycleResult),

  defineOperation("endpoint", "memoryGet", "Read one key from a running Client's memory.", request("endpoint", "memoryGet", {
    ...windowIdentity,
    key: z.string().describe("Memory key")
  }), jsonValue.nullable()),
  defineOperation("endpoint", "memorySet", "Set one key in a running Client's memory.", request("endpoint", "memorySet", {
    ...windowIdentity,
    key: z.string().describe("Memory key"),
    value: jsonValue.describe("JSON value")
  }), jsonValue),
  defineOperation("endpoint", "memoryDelete", "Delete one key from a running Client's memory.", request("endpoint", "memoryDelete", {
    ...windowIdentity,
    key: z.string().describe("Memory key")
  }), z.boolean()),
  defineOperation("endpoint", "memoryEntries", "List all keys and values in a running Client's memory.", request("endpoint", "memoryEntries", windowIdentity), z.array(z.tuple([z.string(), jsonValue]))),

  defineOperation("service", "list", "List the Services ready now.", request("service", "list", {
    name: z.string().min(1).optional().describe("Optional Process and Service name filter")
  }), z.array(serviceResult)),
  defineOperation("service", "inspect", "Read whether one Service is available now.", request("service", "inspect", serviceAddress), serviceResult),
  defineOperation("service", "waitReady", "Wait until one Service is available.", request("service", "waitReady", {
    ...serviceAddress,
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), serviceResult),
  defineOperation("service", "ask", "Ask a Service a question and return its answer.", request("service", "ask", {
    ...serviceAddress,
    endpoint: z.literal("server"),
    event: z.string().min(1).describe("Event name"),
    input: jsonValue.optional().describe("Event input"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), jsonValue),
  defineOperation("service", "publish", "Publish one event to a Service without waiting for an answer.", request("service", "publish", {
    ...serviceAddress,
    event: z.string().min(1).describe("Event name"),
    input: jsonValue.optional().describe("Event input")
  }), serviceResult),
  defineOperation("service", "wait", "Wait for one message a Service sends out.", request("service", "wait", {
    ...serviceAddress,
    event: z.string().min(1).describe("Event name"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), lifecycleResult),
  defineOperation("service", "waitLifecycle", "Wait for one Service to become available or unavailable.", request("service", "waitLifecycle", {
    ...serviceAddress,
    event: z.enum(Object.values(serviceLifecycleEvents)).describe("Availability event"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), lifecycleResult),
  defineOperation("service", "waitDiscovery", "Wait for any Service to become available or unavailable.", request("service", "waitDiscovery", {
    event: z.enum(Object.values(systemServiceEvents)).describe("Discovery event"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), lifecycleResult),

  defineOperation("window", "inspect", "Read one Window: title, position, size, and whether it is minimized or maximized.", request("window", "inspect", windowIdentity), windowResult),
  defineOperation("window", "move", "Move one Window. Its position is its top-left corner, counted from the middle of the view: 0, 0 is the middle, not the screen's edge.", request("window", "move", {
    ...windowIdentity,
    position
  }), windowResult),
  defineOperation("window", "resize", "Resize one Window; its top-left corner stays.", request("window", "resize", {
    ...windowIdentity,
    size
  }), windowResult),
  defineOperation("window", "setGeometry", "Move and resize one Window in one step, as move and resize.", request("window", "setGeometry", {
    ...windowIdentity,
    x: metric.describe("Horizontal position"),
    y: metric.describe("Vertical position"),
    width: metric.describe("Window width"),
    height: metric.describe("Window height")
  }), windowResult),
  defineOperation("window", "minimize", "Minimize one Window, or restore it.", request("window", "minimize", {
    ...windowIdentity,
    minimized: z.boolean().optional().describe("Whether the Window is minimized; defaults to true")
  }), windowResult),
  defineOperation("window", "maximize", "Maximize one Window to fill the view, or restore it.", request("window", "maximize", {
    ...windowIdentity,
    maximized: z.boolean().optional().describe("Whether the Window is maximized; defaults to true")
  }), windowResult),
  defineOperation("window", "setTitle", "Set one Window's title.", request("window", "setTitle", {
    ...windowIdentity,
    title: z.string().describe("New Window title")
  }), windowResult),
  defineOperation("window", "setHeader", "Show or hide the title bar the Desktop draws on one Window.", request("window", "setHeader", {
    ...windowIdentity,
    header: z.boolean().describe("Whether the Window header is shown")
  }), windowResult),
  defineOperation("window", "raise", "Bring one Window in front of the others in its layer.", request("window", "raise", windowIdentity), windowResult),
  defineOperation("window", "wait", "Wait for one Window to move, resize, or otherwise change.", request("window", "wait", {
    ...windowIdentity,
    event: z.enum(Object.values(windowEvents)).describe("Window event"),
    timeout: z.number().positive().optional().describe("Maximum wait in milliseconds")
  }), lifecycleResult)
] as const)

type ExecuteOperation = (typeof executeOperations)[number]

export type ExecuteRequest = z.output<ExecuteOperation["request"]>

type OperationKey<Request extends ExecuteRequest> = Request extends ExecuteRequest
  ? `${Request["$domain"]}.${Request["$operation"]}`
  : never

/** Every operation identity in the authoritative Execute catalog. */
export type ExecuteOperationKey = OperationKey<ExecuteRequest>

/** Authoritative runtime schema for every Execute request. */
export const executeRequestSchema: z.ZodType<ExecuteRequest> = z.union(
  executeOperations.map(operation => operation.request) as unknown as readonly [z.ZodType<ExecuteRequest>, z.ZodType<ExecuteRequest>, ...z.ZodType<ExecuteRequest>[]]
)

type OperationFor<Request extends ExecuteRequest> = Extract<ExecuteOperation, {
  domain: Request["$domain"]
  operation: Request["$operation"]
}>

export type ExecuteResult<Request extends ExecuteRequest> = z.output<OperationFor<Request>["result"]>

export type ExecuteOperationSummary = z.output<typeof operationSummary>
export type ExecuteOperationDescription = z.output<typeof operationDescription>

/** Validate an untrusted JSON value against the authoritative Execute request catalog. */
export function parseExecuteRequest(value: unknown): ExecuteRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("An Execute request must be an object")

  const candidate = value as Record<string, unknown>
  const operation = findExecuteOperation(candidate.$domain, candidate.$operation)

  if (!operation) throw new Error(`Unknown Execute operation ${JSON.stringify([candidate.$domain, candidate.$operation])}`)

  return operation.request.parse(value) as ExecuteRequest
}

/** Return the local description of one Execute operation. */
export function describeExecuteOperation(domain: unknown, operation: unknown): ExecuteOperationDescription | null {
  const definition = findExecuteOperation(domain, operation)
  if (!definition) return null

  return Object.freeze({
    domain: definition.domain,
    operation: definition.operation,
    description: definition.description,
    request: z.toJSONSchema(definition.request) as JsonValue,
    result: z.toJSONSchema(definition.result) as JsonValue
  })
}

/** Return the local Execute operation catalog without contacting a System. */
export function listExecuteOperations(domain?: string): ExecuteOperationSummary[] {
  return executeOperations
    .filter(operation => domain === undefined || operation.domain === domain)
    .map(operation => Object.freeze({
      domain: operation.domain,
      operation: operation.operation,
      description: operation.description
    }))
}

export function executeOperationDefinition(request: ExecuteRequest) {
  const operation = findExecuteOperation(request.$domain, request.$operation)
  if (!operation) throw new Error(`Unknown Execute operation ${JSON.stringify([request.$domain, request.$operation])}`)
  return operation
}

function findExecuteOperation(domain: unknown, operation: unknown): ExecuteOperation | undefined {
  return executeOperations.find(candidate => candidate.domain === domain && candidate.operation === operation)
}
