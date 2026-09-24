import type { Endpoint } from "../endpoint.js"
import type { Process } from "../process.js"
import type { Program } from "../program.js"
import type { System } from "../system.js"
import type { Window } from "../window.js"
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
    case "program": return executeProgram(system, request)
    case "process": return executeProcess(system, request)
    case "endpoint": return executeEndpoint(system, request)
    case "service": return executeService(system, request)
    case "window": return executeWindow(system, request)
  }
}

function executeSystem(system: ExecutionSystem, request: Request<"system", "logs">) {
  return system.logs.query(request.statement, request.values)
}

async function executeService(
  system: ExecutionSystem,
  request:
    | Request<"service", "list">
    | Request<"service", "search">
    | Request<"service", "inspect">
    | Request<"service", "waitReady">
    | Request<"service", "ask">
    | Request<"service", "publish">
    | Request<"service", "wait">
    | Request<"service", "waitLifecycle">
    | Request<"service", "waitDiscovery">
) {
  if (request.$operation === "list") return Promise.all((await system.service.list()).map(serviceView))
  if (request.$operation === "search") return Promise.all((await system.service.search(request.name)).map(serviceView))
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
    | Request<"program", "enableStartup">
    | Request<"program", "disableStartup">
    | Request<"program", "pinned">
    | Request<"program", "pin">
    | Request<"program", "unpin">
    | Request<"program", "getPermission">
    | Request<"program", "listPermissions">
    | Request<"program", "allowsPermission">
    | Request<"program", "allowPermission">
    | Request<"program", "denyPermission">
    | Request<"program", "logs">
    | Request<"program", "wait">
) {
  if (request.$operation === "list") {
    return Promise.all((await system.program.list(request.installedOnly)).map(programView))
  }

  if (request.$operation === "wait") return waitForProgram(system, request)

  const program = await system.program.find(request.identity)
  if (request.$operation === "find") return program ? programView(program) : null
  if (!program) throw new Error(`Unknown Program "${request.identity}"`)
  if (request.$operation === "agent") return { program: program.identity, content: await program.agent() }
  if (request.$operation === "definition") return program.definition()
  if (request.$operation === "logs") return program.logs.query(request.statement, request.values)
  if (request.$operation === "getStartup") return program.startup.get()
  if (request.$operation === "enableStartup") {
    await program.startup.enable(request.launch)
    return program.startup.get()
  }
  if (request.$operation === "disableStartup") {
    await program.startup.disable()
    return null
  }
  if (request.$operation === "pinned") return program.pinned()
  if (request.$operation === "pin") {
    await program.pin()
    return true
  }
  if (request.$operation === "unpin") {
    await program.unpin()
    return false
  }
  if (request.$operation === "getPermission") return program.permissions.get(request.permission)
  if (request.$operation === "listPermissions") return program.permissions.all()
  if (request.$operation === "allowsPermission") return program.permissions.allows(request.permission, request.value)
  if (request.$operation === "denyPermission") {
    await program.permissions.deny(request.permission)
    return false
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
) {
  const process = await requireProcess(system, request.process, request.program)
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
      case "pinned": {
        const value = await system.program.wait("pinned", request.timeout)
        return {
          scope: "system",
          event: request.event,
          payload: { program: await programView(value.program), pinned: value.pinned }
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
    case "pinned": return {
      scope: "program",
      program: program.identity,
      event: request.event,
      payload: await program.wait("pinned", request.timeout)
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
