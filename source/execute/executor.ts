import type { Endpoint } from "../endpoint.js"
import type { Process } from "../process.js"
import type { Program } from "../program.js"
import { parseSystemProgramListOptions, type System } from "../system.js"
import type { Window } from "../window.js"
import type { Connection } from "../connection.js"
import type { Session } from "../session.js"
import type { OpenRequest } from "../opening.js"
import type { PermissionRequest } from "../permissions.js"
import { ServerEndpoint } from "../server-endpoint.js"
import type { AppearanceUpdate } from "../appearance.js"
import {
  describeExecuteOperation,
  executeOperationDefinition,
  listExecuteOperations,
  parseExecuteRequest,
  type ExecuteRequest,
  type ExecuteResult
} from "./contract.js"

/** Public System capabilities consumed by the shared Execute adapter. */
export type ExecutionSystem = Omit<System, "execute">

type Request<Domain extends ExecuteRequest["$domain"], Operation extends string> = Extract<
  ExecuteRequest,
  { $domain: Domain, $operation: Operation }
>

/** Execute one validated JSON operation entirely through public System handles. */
export async function execute<RequestValue extends ExecuteRequest>(
  system: ExecutionSystem,
  value: RequestValue
): Promise<ExecuteResult<RequestValue>> {
  const request = parseExecuteRequest(value)
  const definition = executeOperationDefinition(request)
  const result = await dispatch(system, request)
  return definition.result.parse(result) as ExecuteResult<RequestValue>
}

async function dispatch(system: ExecutionSystem, request: ExecuteRequest): Promise<unknown> {
  switch (request.$domain) {
    case "operation": return executeOperation(request)
    case "system": return executeSystem(system, request)
    case "appearance": return executeAppearance(system, request)
    case "opening": return executeOpening(system, request)
    case "permission": return executePermission(system, request)
    case "authentication": return executeAuthentication(system, request)
    case "connection": return executeConnection(system, request)
    case "session": return executeSession(system, request)
    case "program": return executeProgram(system, request)
    case "process": return executeProcess(system, request)
    case "endpoint": return executeEndpoint(system, request)
    case "service": return executeService(system, request)
    case "window": return executeWindow(system, request)
  }
}

async function executeSystem(system: ExecutionSystem, request: Request<"system", "about"> | Request<"system", "open"> | Request<"system", "logs">) {
  if (request.$operation === "about") return system.about()
  if (request.$operation === "open") {
    await system.open({ type: request.type, uri: request.uri })
    return null
  }
  return system.logs.query(request.statement, request.values)
}

async function executeAppearance(
  system: ExecutionSystem,
  request: Request<"appearance", "get"> | Request<"appearance", "update"> | Request<"appearance", "wait">
) {
  if (request.$operation === "get") return system.appearance.snapshot()
  if (request.$operation === "update") {
    // The System validates and merges it, as for every other caller.
    await system.appearance.update(request.value as AppearanceUpdate)
    return system.appearance.snapshot()
  }
  return { scope: "appearance", event: request.event, payload: await system.appearance.wait("change", request.timeout) }
}

async function executeOpening(
  system: ExecutionSystem,
  request:
    | Request<"opening", "defaults">
    | Request<"opening", "setDefault">
    | Request<"opening", "clearDefault">
    | Request<"opening", "requests">
    | Request<"opening", "choose">
    | Request<"opening", "cancel">
    | Request<"opening", "wait">
) {
  if (request.$operation === "defaults") {
    return Object.fromEntries(Object.entries(await system.opening.defaults()).map(([type, program]) => [type, program.identity]))
  }
  if (request.$operation === "setDefault") {
    await system.opening.setDefault(request.type, await requireProgram(system, request.program))
    return null
  }
  if (request.$operation === "clearDefault") {
    await system.opening.clearDefault(request.type)
    return null
  }
  if (request.$operation === "requests") return Promise.all((await system.opening.requests()).map(openRequestView))
  if (request.$operation === "wait") {
    if (request.event === "openRequest") {
      return { scope: "opening", event: request.event, payload: await openRequestView(await system.opening.wait("openRequest", request.timeout)) }
    }
    if (request.event === "openResolve") {
      const { request: resolved, program } = await system.opening.wait("openResolve", request.timeout)
      return { scope: "opening", event: request.event, payload: { request: resolved.identity, program: program?.identity ?? null } }
    }
    const { type, program } = await system.opening.wait("changeDefault", request.timeout)
    return { scope: "opening", event: request.event, payload: { type, program: program?.identity ?? null } }
  }

  const pending = (await system.opening.requests()).find(candidate => candidate.identity === request.request)
  if (!pending) throw new Error(`Unknown open request "${request.request}"`)
  if (request.$operation === "cancel") {
    await pending.cancel()
    return null
  }
  const program = pending.programs.find(candidate => candidate.identity === request.program)
  if (!program) throw new Error(`"${request.program}" does not open this request`)
  await pending.choose(program, request.always === undefined ? undefined : { always: request.always })
  return null
}

async function executePermission(
  system: ExecutionSystem,
  request:
    | Request<"permission", "requests">
    | Request<"permission", "allow">
    | Request<"permission", "deny">
    | Request<"permission", "cancel">
    | Request<"permission", "wait">
) {
  if (request.$operation === "requests") return Promise.all((await system.permissions.requests()).map(permissionRequestView))
  if (request.$operation === "wait") {
    if (request.event === "permissionRequest") {
      return { scope: "permission", event: request.event, payload: await permissionRequestView(await system.permissions.wait("permissionRequest", request.timeout)) }
    }
    const { request: resolved, permission } = await system.permissions.wait("permissionResolve", request.timeout)
    return { scope: "permission", event: request.event, payload: { request: resolved.identity, permission } }
  }

  const pending = (await system.permissions.requests()).find(candidate => candidate.identity === request.request)
  if (!pending) throw new Error(`Unknown permission request "${request.request}"`)
  if (request.$operation === "allow") await pending.allow()
  else if (request.$operation === "deny") await pending.deny()
  else await pending.cancel()
  return null
}

async function executeAuthentication(
  system: ExecutionSystem,
  request:
    | Request<"authentication", "state">
    | Request<"authentication", "requirements">
    | Request<"authentication", "setCredentials">
    | Request<"authentication", "signOutAll">
) {
  if (request.$operation === "state") return system.authentication.state()
  if (request.$operation === "requirements") return system.authentication.requirements()
  if (request.$operation === "setCredentials") await system.authentication.setCredentials({ username: request.username, password: request.password })
  else await system.authentication.signOutAllSessions()
  return null
}

async function endpointReferenceView(target: Endpoint) {
  const process = await target.process()
  return { program: process.program().identity, process: process.identity, endpoint: target instanceof ServerEndpoint ? "server" : "client" }
}

async function openRequestView(request: OpenRequest) {
  return {
    identity: request.identity,
    from: request.from ? await endpointReferenceView(request.from) : null,
    createdAt: request.createdAt.toISOString(),
    type: request.target.type,
    uri: request.target.uri,
    programs: request.programs.map(program => program.identity)
  }
}

async function permissionRequestView(request: PermissionRequest) {
  return {
    identity: request.identity,
    from: await endpointReferenceView(request.from),
    createdAt: request.createdAt.toISOString(),
    expiresAt: request.expiresAt.toISOString(),
    name: request.name,
    scope: [...request.scope]
  }
}

async function executeConnection(
  system: ExecutionSystem,
  request:
    | Request<"connection", "list">
    | Request<"connection", "find">
    | Request<"connection", "session">
    | Request<"connection", "signIn">
    | Request<"connection", "wait">
) {
  if (request.$operation === "list") return Promise.all((await system.authentication.connections()).map(connectionView))
  if (request.$operation === "wait") return waitForConnection(system, request)

  const connection = await system.authentication.connection(request.identity)
  if (request.$operation === "find") return connection ? connectionView(connection) : null
  if (!connection) throw new Error(`Unknown Connection "${request.identity}"`)
  if (request.$operation === "session") {
    const session = await connection.session()
    return session ? sessionView(session) : null
  }
  return sessionView(await connection.signIn())
}

async function executeSession(
  system: ExecutionSystem,
  request:
    | Request<"session", "list">
    | Request<"session", "find">
    | Request<"session", "connections">
    | Request<"session", "signOut">
    | Request<"session", "wait">
) {
  if (request.$operation === "list") return Promise.all((await system.authentication.sessions()).map(sessionView))
  if (request.$operation === "wait") return waitForSession(system, request)

  const session = await system.authentication.session(request.identity)
  if (request.$operation === "find") return session ? sessionView(session) : null
  if (!session) throw new Error(`Unknown Session "${request.identity}"`)
  if (request.$operation === "connections") return Promise.all((await session.connections()).map(connectionView))
  await session.signOut()
  return null
}

async function waitForConnection(system: ExecutionSystem, request: Request<"connection", "wait">) {
  if (!request.identity) {
    if (request.event === "connectionCreate") return {
      scope: "system", event: request.event,
      payload: await connectionView(await system.authentication.wait("connectionCreate", request.timeout))
    }
    if (request.event === "connectionDisconnect") return {
      scope: "system", event: request.event,
      // Terminal events carry identity; reading an ended handle would violate its lifetime.
      payload: { identity: (await system.authentication.wait("connectionDisconnect", request.timeout)).identity }
    }
    throw new Error(`${request.event} belongs to an individual Connection`)
  }

  const connection = await requireConnection(system, request.identity)
  if (request.event === "sessionChange") {
    const session = await connection.wait("sessionChange", request.timeout)
    return { scope: "connection", connection: connection.identity, event: request.event, payload: session?.identity ?? null }
  }
  if (request.event !== "disconnect") throw new Error(`${request.event} belongs to the Connection registry`)
  await connection.wait("disconnect", request.timeout)
  return { scope: "connection", connection: connection.identity, event: request.event, payload: null }
}

async function waitForSession(system: ExecutionSystem, request: Request<"session", "wait">) {
  if (!request.identity) {
    if (request.event === "sessionCreate") return {
      scope: "system", event: request.event,
      payload: await sessionView(await system.authentication.wait("sessionCreate", request.timeout))
    }
    if (request.event === "sessionEnd") {
      const ended = await system.authentication.wait("sessionEnd", request.timeout)
      return { scope: "system", event: request.event, payload: { identity: ended.session.identity, reason: ended.reason } }
    }
    throw new Error(`${request.event} belongs to an individual Session`)
  }

  const session = await requireSession(system, request.identity)
  if (request.event === "connectionAttach" || request.event === "connectionDetach") {
    const connection = await session.wait(request.event, request.timeout)
    return { scope: "session", session: session.identity, event: request.event, payload: { identity: connection.identity } }
  }
  if (request.event !== "end") throw new Error(`${request.event} belongs to the Session registry`)
  const ended = await session.wait("end", request.timeout)
  return { scope: "session", session: session.identity, event: request.event, payload: ended }
}

async function requireConnection(system: ExecutionSystem, identity: string) {
  const connection = await system.authentication.connection(identity)
  if (!connection) throw new Error(`Unknown Connection "${identity}"`)
  return connection
}

async function requireSession(system: ExecutionSystem, identity: string) {
  const session = await system.authentication.session(identity)
  if (!session) throw new Error(`Unknown Session "${identity}"`)
  return session
}

async function connectionView(connection: Connection) {
  const [connected, session] = await Promise.all([connection.connected(), connection.session()])
  return { identity: connection.identity, connected, session: session?.identity ?? null, connectedAt: connection.connectedAt.toISOString(), device: connection.device }
}

async function sessionView(session: Session) {
  const [valid, lastActiveAt] = await Promise.all([session.valid(), session.lastActiveAt()])
  return { identity: session.identity, valid, createdAt: session.createdAt.toISOString(), device: session.device, lastActiveAt: lastActiveAt?.toISOString() ?? null }
}

async function executeService(
  system: ExecutionSystem,
  request:
    | Request<"service", "list">
    | Request<"service", "inspect">
    | Request<"service", "waitReady">
    | Request<"service", "ask">
    | Request<"service", "publish">
    | Request<"service", "wait">
    | Request<"service", "waitLifecycle">
    | Request<"service", "waitDiscovery">
) {
  if (request.$operation === "list") return Promise.all((await system.service.list({ name: request.name })).map(serviceView))
  if (request.$operation === "waitDiscovery") {
    const service = await system.service.wait(request.event, request.timeout)
    return {
      scope: "system",
      event: request.event,
      payload: await serviceView(service)
    }
  }

  const target = system.service.prepare({
    program: request.program,
    process: request.process,
    endpoint: request.endpoint
  })

  switch (request.$operation) {
    case "inspect": break
    case "waitReady": await target.waitReady(request.timeout); break
    case "ask": {
      const server = system.service.prepare({
        program: request.program,
        process: request.process,
        endpoint: "server"
      })
      const asker = request.timeout === undefined ? server : server.timeout(request.timeout)
      const answer = await (Object.hasOwn(request, "input")
        ? asker.ask(request.event, request.input)
        : asker.ask(request.event))
      return answer === undefined ? null : answer
    }
    case "publish":
      if (Object.hasOwn(request, "input")) target.publish(request.event, request.input)
      else target.publish(request.event)
      break
    case "wait": return {
      scope: "service",
      program: request.program,
      process: request.process,
      endpoint: request.endpoint,
      event: request.event,
      payload: jsonMessage(await target.wait(request.event, request.timeout))
    }
    case "waitLifecycle": return {
      scope: "service",
      program: request.program,
      process: request.process,
      endpoint: request.endpoint,
      event: request.event,
      payload: jsonMessage(await target.lifecycle.wait(request.event, request.timeout))
    }
  }

  return serviceView(target)
}

function executeOperation(request: Request<"operation", "list"> | Request<"operation", "describe">) {
  if (request.$operation === "list") return listExecuteOperations(request.domain)
  return describeExecuteOperation(request.domain, request.operation)
}

async function executeProgram(
  system: ExecutionSystem,
  request:
    | Request<"program", "list">
    | Request<"program", "find">
    | Request<"program", "agent">
    | Request<"program", "definition">
    | Request<"program", "getStartup">
    | Request<"program", "setStartup">
    | Request<"program", "removeStartup">
    | Request<"program", "pinned">
    | Request<"program", "pin">
    | Request<"program", "getPermission">
    | Request<"program", "listPermissions">
    | Request<"program", "allowsPermission">
    | Request<"program", "allowPermission">
    | Request<"program", "denyPermission">
    | Request<"program", "resetPermission">
    | Request<"program", "storeGet">
    | Request<"program", "storeSet">
    | Request<"program", "storeDelete">
    | Request<"program", "query">
    | Request<"program", "exitProcesses">
    | Request<"program", "forget">
    | Request<"program", "logs">
    | Request<"program", "wait">
) {
  if (request.$operation === "list") {
    return Promise.all((await system.program.list(parseSystemProgramListOptions({ installed: request.installed, opens: request.opens, startup: request.startup }))).map(programView))
  }

  if (request.$operation === "wait") return waitForProgram(system, request)

  const program = await system.program.find(request.identity)
  if (request.$operation === "find") return program ? programView(program) : null
  if (!program) throw new Error(`Unknown Program "${request.identity}"`)
  if (request.$operation === "agent") return { program: program.identity, content: await program.agent() }
  if (request.$operation === "definition") return program.definition()
  if (request.$operation === "logs") return program.logs.query(request.statement, request.values)
  if (request.$operation === "getStartup") return program.startup.get()
  if (request.$operation === "setStartup") {
    await program.startup.set(request.launch)
    return program.startup.get()
  }
  if (request.$operation === "removeStartup") {
    await program.startup.remove()
    return null
  }
  if (request.$operation === "pinned") return program.pinned()
  if (request.$operation === "pin") {
    await program.pin(request.pinned)
    return program.pinned()
  }
  if (request.$operation === "getPermission") return program.permissions.get(request.permission)
  if (request.$operation === "listPermissions") return program.permissions.all()
  if (request.$operation === "allowsPermission") return program.permissions.allows(request.permission, request.value)
  if (request.$operation === "denyPermission") {
    await program.permissions.deny(request.permission)
    return false
  }
  if (request.$operation === "storeGet") return (await program.store.get(request.key)) ?? null
  if (request.$operation === "storeSet") return program.store.set(request.key, request.value, request.ttl)
  if (request.$operation === "storeDelete") return program.store.delete(request.key)
  if (request.$operation === "query") return program.database.query(request.statement, request.values)
  if (request.$operation === "exitProcesses") return program.exitProcesses()
  if (request.$operation === "forget") {
    await program.forget()
    return null
  }
  if (request.$operation === "resetPermission") {
    await program.permissions.reset(request.permission)
    return program.permissions.get(request.permission)
  }

  await program.permissions.allow(request.permission, request.value)
  return program.permissions.get(request.permission)
}

async function executeProcess(
  system: ExecutionSystem,
  request:
    | Request<"process", "list">
    | Request<"process", "find">
    | Request<"process", "create">
    | Request<"process", "findOrCreate">
    | Request<"process", "exit">
    | Request<"process", "wait">
) {
  if (request.$operation === "list") {
    const processes = request.program
      ? await (await requireProgram(system, request.program)).processes()
      : await system.process.list()
    return Promise.all(processes.map(processView))
  }

  if (request.$operation === "find") {
    const process = await findProcess(system, request.process, request.program)
    return process ? processView(process) : null
  }

  if (request.$operation === "wait") return waitForProcess(system, request)

  if (request.$operation === "create") {
    const process = await (await requireProgram(system, request.program)).createProcess(request.launch)
    return processView(process)
  }

  if (request.$operation === "findOrCreate") {
    const process = await (await requireProgram(system, request.program)).findOrCreateProcess(request.launch)
    return processView(process)
  }

  const process = await requireProcess(system, request.process, request.program)
  const snapshot = await processView(process)
  await process.exit()
  return snapshot
}

async function executeEndpoint(
  system: ExecutionSystem,
  request:
    | Request<"endpoint", "inspect">
    | Request<"endpoint", "start">
    | Request<"endpoint", "stop">
    | Request<"endpoint", "waitReady">
    | Request<"endpoint", "ask">
    | Request<"endpoint", "publish">
    | Request<"endpoint", "wait">
    | Request<"endpoint", "waitLifecycle">
    | Request<"endpoint", "memoryGet">
    | Request<"endpoint", "memorySet">
    | Request<"endpoint", "memoryDelete">
    | Request<"endpoint", "memoryEntries">
) {
  const process = await requireProcess(system, request.process, request.program)
  if (request.$operation === "memoryGet") return (await process.client.memory.get(request.key)) ?? null
  if (request.$operation === "memorySet") { await process.client.memory.set(request.key, request.value); return request.value }
  if (request.$operation === "memoryDelete") return process.client.memory.delete(request.key)
  if (request.$operation === "memoryEntries") return process.client.memory.entries()
  const target = endpoint(process, request.endpoint)

  switch (request.$operation) {
    case "inspect": return endpointView(process, request.endpoint)
    case "start":
      if (request.endpoint === "server") await process.server.start(request.launch)
      else await process.client.start(request.launch)
      return endpointView(process, request.endpoint)
    case "stop":
      await target.stop()
      return endpointView(process, request.endpoint)
    case "waitReady":
      await target.waitReady(request.timeout)
      return endpointView(process, request.endpoint)
    case "ask": {
      if (request.endpoint !== "server") throw new Error("endpoint.ask requires the Server Endpoint")
      const asker = request.timeout === undefined ? process.server : process.server.timeout(request.timeout)
      const answer = await (Object.hasOwn(request, "input")
        ? asker.ask(request.event, request.input)
        : asker.ask(request.event))
      return answer === undefined ? null : answer
    }
    case "publish":
      if (Object.hasOwn(request, "input")) target.publish(request.event, request.input)
      else target.publish(request.event)
      return endpointView(process, request.endpoint)
    case "wait":
      return {
        scope: "endpoint",
        process: process.identity,
        endpoint: request.endpoint,
        event: request.event,
        payload: jsonMessage(await target.wait(request.event, request.timeout))
      }
    case "waitLifecycle":
      return {
        scope: "endpoint",
        process: process.identity,
        endpoint: request.endpoint,
        event: request.event,
        payload: jsonMessage(await target.lifecycle.wait(request.event, request.timeout))
      }
  }
}

async function executeWindow(
  system: ExecutionSystem,
  request:
    | Request<"window", "inspect">
    | Request<"window", "move">
    | Request<"window", "resize">
    | Request<"window", "setGeometry">
    | Request<"window", "minimize">
    | Request<"window", "maximize">
    | Request<"window", "setTitle">
    | Request<"window", "setHeader">
    | Request<"window", "raise">
    | Request<"window", "wait">
) {
  const process = await requireProcess(system, request.process, request.program)
  const window = process.client.window

  switch (request.$operation) {
    case "inspect": break
    case "wait": return {
      scope: "window",
      process: process.identity,
      event: request.event,
      payload: jsonMessage(await window.wait(request.event, request.timeout))
    }
    case "move": await window.move(request.position); break
    case "resize": await window.resize(request.size); break
    case "setGeometry": await window.setGeometry({ x: request.x, y: request.y, width: request.width, height: request.height }); break
    case "minimize": await window.minimize(request.minimized); break
    case "maximize": await window.maximize(request.maximized); break
    case "setTitle": await window.setTitle(request.title); break
    case "setHeader": await window.setHeader(request.header); break
    case "raise": await window.raise(); break
  }

  return windowView(process.identity, window)
}

async function waitForProgram(system: ExecutionSystem, request: Request<"program", "wait">) {
  if (!request.program) {
    switch (request.event) {
      case "create":
      case "forget":
      case "install": return {
        scope: "system",
        event: request.event,
        payload: await programView(await system.program.wait(request.event, request.timeout))
      }
      case "uninstall": {
        const value = await system.program.wait("uninstall", request.timeout)
        return {
          scope: "system",
          event: request.event,
          payload: { program: await programView(value.program), purge: value.purge }
        }
      }
      case "pin": {
        const value = await system.program.wait("pin", request.timeout)
        return {
          scope: "system",
          event: request.event,
          payload: { program: await programView(value.program), pinned: value.pinned }
        }
      }
      case "changePermissions": {
        const value = await system.program.wait("changePermissions", request.timeout)
        return {
          scope: "system",
          event: request.event,
          payload: { program: await programView(value.program), permissions: value.permissions }
        }
      }
      case "changeStartup": {
        const value = await system.program.wait("changeStartup", request.timeout)
        return {
          scope: "system",
          event: request.event,
          payload: { program: await programView(value.program), launch: value.launch }
        }
      }
      default: throw new Error(`${request.event} belongs to an individual Program`)
    }
  }

  const program = await requireProgram(system, request.program)
  switch (request.event) {
    case "processCreate": return {
      scope: "program",
      program: program.identity,
      event: request.event,
      payload: await processView(await program.wait("processCreate", request.timeout))
    }
    case "processExit": {
      const value = await program.wait("processExit", request.timeout)
      return {
        scope: "program",
        program: program.identity,
        event: request.event,
        payload: { process: await processView(value.process), ...exitView(value) }
      }
    }
    case "forget":
      await program.wait("forget", request.timeout)
      return { scope: "program", program: program.identity, event: request.event, payload: null }
    case "uninstall": return {
      scope: "program",
      program: program.identity,
      event: request.event,
      payload: await program.wait("uninstall", request.timeout)
    }
    case "pin": return {
      scope: "program",
      program: program.identity,
      event: request.event,
      payload: await program.wait("pin", request.timeout)
    }
    default: throw new Error(`${request.event} belongs to the Program registry`)
  }
}

async function waitForProcess(system: ExecutionSystem, request: Request<"process", "wait">) {
  if (request.process) {
    if (request.event === "create") throw new Error("An individual Process does not emit create")
    const process = await requireProcess(system, request.process, request.program)
    return {
      scope: "process",
      program: (process.program()).identity,
      process: process.identity,
      event: request.event,
      payload: exitView(await process.wait("exit", request.timeout))
    }
  }

  if (request.program) {
    const program = await requireProgram(system, request.program)
    if (request.event === "create") return {
      scope: "program",
      program: program.identity,
      event: request.event,
      payload: await processView(await program.wait("processCreate", request.timeout))
    }

    const value = await program.wait("processExit", request.timeout)
    return {
      scope: "program",
      program: program.identity,
      event: request.event,
      payload: { process: await processView(value.process), ...exitView(value) }
    }
  }

  if (request.event === "create") return {
    scope: "system",
    event: request.event,
    payload: await processView(await system.process.wait("create", request.timeout))
  }

  const value = await system.process.wait("exit", request.timeout)
  return {
    scope: "system",
    event: request.event,
    payload: { process: await processView(value.process), ...exitView(value) }
  }
}

async function requireProgram(system: ExecutionSystem, identity: string) {
  const program = await system.program.find(identity)
  if (!program) throw new Error(`Unknown Program "${identity}"`)
  return program
}

async function findProcess(system: ExecutionSystem, identity: string, programIdentity?: string) {
  return programIdentity
    ? (await requireProgram(system, programIdentity)).findProcess(identity)
    : system.process.find(identity)
}

async function requireProcess(system: ExecutionSystem, identity: string, programIdentity?: string) {
  const process = await findProcess(system, identity, programIdentity)
  if (!process) throw new Error(`Unknown Process "${identity}"`)
  return process
}

function endpoint(process: Process, name: "server" | "client"): Endpoint {
  return name === "server" ? process.server : process.client
}

async function programView(program: Program) {
  return {
    identity: program.identity,
    assetId: program.assetId,
    name: program.name,
    version: program.version,
    description: program.description,
    installed: await program.installed(),
    categories: program.categories,
    keywords: program.keywords,
    opens: program.opens,
    declaredPermissions: program.declaredPermissions,
    hasAgent: program.hasAgent,
    server: program.server,
    client: program.client
  }
}

async function processView(process: Process) {
  const program = process.program()
  const [server, client] = await Promise.all([
    program.server === null
      ? Promise.resolve({ running: false, service: false })
      : Promise.all([process.server.running(), process.server.isService()]).then(([running, service]) => ({ running, service })),
    program.client === null
      ? Promise.resolve({ running: false, service: false })
      : Promise.all([process.client.running(), process.client.isService()]).then(([running, service]) => ({ running, service }))
  ])

  return {
    identity: process.identity,
    name: process.name,
    program: program.identity,
    startedAt: process.startedAt.toISOString(),
    server: { declared: program.server !== null, ...server },
    client: { declared: program.client !== null, ...client }
  }
}

async function endpointView(process: Process, name: "server" | "client") {
  const program = process.program()
  const target = endpoint(process, name)

  return {
    process: process.identity,
    program: program.identity,
    endpoint: name,
    declared: name === "server" ? program.server !== null : program.client !== null,
    running: await target.running(),
    service: await target.isService()
  }
}

async function serviceView(service: import("../service.js").Service) {
  return { ...service.address(), available: await service.available() }
}

async function windowView(process: string, window: Window) {
  const [title, header, position, size, minimized, maximized, front, layer] = await Promise.all([
    window.title(),
    window.header(),
    window.position(),
    window.size(),
    window.minimized(),
    window.maximized(),
    window.front(),
    window.layer()
  ])

  return { process, title, header, position, size, minimized, maximized, front, layer }
}

function exitView(value: Readonly<{ status: "exited" | "signaled", code: number | null, signal: string | null }>) {
  return { status: value.status, code: value.code, signal: value.signal }
}

function jsonMessage(value: unknown) {
  return value === undefined ? null : value
}
