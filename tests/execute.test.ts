import { describe, expect, expectTypeOf, it } from "vitest"
import {
  describeExecuteOperation,
  execute,
  listExecuteOperations,
  parseExecuteRequest,
  parseSystemAbout,
  parseSystemProgramListOptions,
  parseSystemServiceListOptions,
  type ExecutionSystem
} from "../source/main.js"

describe("Execute", () => {
  it("reads what the System is through about", async () => {
    const about = { name: "PhreshOS", version: "0.1.108", release: { name: "Sprout", program: "sprout" }, startedAt: new Date("2026-09-30T08:00:00.000Z") }
    const system = { about: async () => about } as unknown as ExecutionSystem

    await expect(execute(system, { $domain: "system", $operation: "about" })).resolves.toEqual(about)
    expect(parseSystemAbout(about)).toEqual(about)
    expect(Object.isFrozen(parseSystemAbout(about).release)).toBe(true)
    expect(() => parseSystemAbout({ ...about, release: { name: "Sprout" } })).toThrow(/malformed/)
    expect(() => parseSystemAbout({ ...about, version: "" })).toThrow(/malformed/)
    // A start time crosses JSON as text and arrives as a Date again.
    expect(parseSystemAbout(JSON.parse(JSON.stringify(about)))).toEqual(about)
    expect(() => parseSystemAbout({ ...about, startedAt: "yesterday" })).toThrow(/malformed/)
  })

  it("uses object filters for Program and Service discovery", async () => {
    expect(parseSystemProgramListOptions({ installed: true, extra: "caller-owned" })).toEqual({ installed: true })
    expect(parseSystemServiceListOptions({ name: "editor", extra: "caller-owned" })).toEqual({ name: "editor" })
    expect(() => parseSystemProgramListOptions(true)).toThrow(/object/)
    expect(() => parseSystemServiceListOptions("editor")).toThrow(/object/)
    expect(() => parseSystemServiceListOptions({ name: " " })).toThrow(/non-empty/)

    const calls: unknown[] = []
    const system = {
      program: { list: async (options: unknown) => { calls.push(["program", options]); return [] } },
      service: { list: async (options: unknown) => { calls.push(["service", options]); return [] } }
    } as unknown as ExecutionSystem

    await expect(execute(system, { $domain: "program", $operation: "list", installed: true })).resolves.toEqual([])
    await expect(execute(system, { $domain: "service", $operation: "list", name: "editor" })).resolves.toEqual([])
    expect(calls).toEqual([["program", { installed: true }], ["service", { name: "editor" }]])
    expect(() => parseExecuteRequest({ $domain: "service", $operation: "search", name: "editor" })).toThrow(/Unknown Execute operation/)
  })

  it("validates requests without rejecting unrelated values", () => {
    expect(parseExecuteRequest({
      $domain: "endpoint",
      $operation: "ask",
      program: "tilo",
      process: "main",
      endpoint: "server",
      event: "board.list",
      input: null,
      trace: "caller-owned"
    })).toMatchObject({ trace: "caller-owned" })

    expect(() => parseExecuteRequest({ $domain: "endpoint", $operation: "ask" })).toThrow()
    expect(() => parseExecuteRequest({ $domain: "unknown", $operation: "ask" })).toThrow(/Unknown Execute operation/)
  })

  it("uses one catalog for discovery, descriptions, and execution", async () => {
    const descriptions = listExecuteOperations("endpoint")
    expect(descriptions.some(value => value.operation === "ask")).toBe(true)

    const description = describeExecuteOperation("endpoint", "ask")
    expect(description?.request).toMatchObject({ type: "object" })
    expect(description?.result).toBeTruthy()

    const result = await execute({} as ExecutionSystem, {
      $domain: "operation",
      $operation: "list",
      domain: "window"
    })

    expect(result.every(value => value.domain === "window")).toBe(true)
    expectTypeOf(result[0]!.domain).toEqualTypeOf<string>()
    expectTypeOf(result[0]!.operation).toEqualTypeOf<string>()
  })

  it("uses public Authentication handles for Connection and Session operations", async () => {
    const calls: string[] = []
    const session = {
      identity: "session-one",
      valid: async () => true,
      connections: async () => [connection],
      signOut: async () => { calls.push("signOut") }
    }
    const connection = {
      identity: "connection-one",
      connected: async () => true,
      session: async () => session,
      signIn: async () => { calls.push("signIn"); return session }
    }
    const system = { authentication: {
      connections: async () => [connection],
      connection: async (identity: string) => identity === connection.identity ? connection : null,
      sessions: async () => [session],
      session: async (identity: string) => identity === session.identity ? session : null
    } } as unknown as ExecutionSystem

    const connectionState = { identity: "connection-one", connected: true, session: "session-one" }
    const sessionState = { identity: "session-one", valid: true }
    await expect(execute(system, { $domain: "connection", $operation: "list" })).resolves.toEqual([connectionState])
    await expect(execute(system, { $domain: "connection", $operation: "find", identity: "connection-one" })).resolves.toEqual(connectionState)
    await expect(execute(system, { $domain: "connection", $operation: "find", identity: "missing" })).resolves.toBeNull()
    await expect(execute(system, { $domain: "connection", $operation: "session", identity: "connection-one" })).resolves.toEqual(sessionState)
    await expect(execute(system, { $domain: "connection", $operation: "signIn", identity: "connection-one" })).resolves.toEqual(sessionState)
    await expect(execute(system, { $domain: "session", $operation: "list" })).resolves.toEqual([sessionState])
    await expect(execute(system, { $domain: "session", $operation: "find", identity: "session-one" })).resolves.toEqual(sessionState)
    await expect(execute(system, { $domain: "session", $operation: "find", identity: "missing" })).resolves.toBeNull()
    await expect(execute(system, { $domain: "session", $operation: "connections", identity: "session-one" })).resolves.toEqual([connectionState])
    await expect(execute(system, { $domain: "session", $operation: "signOut", identity: "session-one" })).resolves.toBeNull()
    await expect(execute(system, { $domain: "session", $operation: "signOut", identity: "missing" })).rejects.toThrow(/Unknown Session/)
    await expect(execute(system, { $domain: "connection", $operation: "signIn", identity: "missing" })).rejects.toThrow(/Unknown Connection/)
    expect(calls).toEqual(["signIn", "signOut"])
  })

  it("waits for Authentication lifecycle events without reading ended handles", async () => {
    const connection = {
      identity: "connection-one",
      connected: async () => { throw new Error("ended handle") },
      session: async () => { throw new Error("ended handle") },
      wait: async (event: string) => event === "sessionChange" ? { identity: "session-one" } : undefined
    }
    const session = {
      identity: "session-one",
      valid: async () => { throw new Error("ended handle") },
      wait: async (event: string) => event === "end" ? { reason: "signedOut" } : connection
    }
    const system = { authentication: {
      connection: async () => connection,
      session: async () => session,
      wait: async (event: string) => event === "connectionDisconnect" ? connection : { session, reason: "expired" }
    } } as unknown as ExecutionSystem

    await expect(execute(system, { $domain: "connection", $operation: "wait", event: "connectionDisconnect" }))
      .resolves.toEqual({ scope: "system", event: "connectionDisconnect", payload: { identity: "connection-one" } })
    await expect(execute(system, { $domain: "connection", $operation: "wait", identity: "connection-one", event: "sessionChange" }))
      .resolves.toEqual({ scope: "connection", connection: "connection-one", event: "sessionChange", payload: "session-one" })
    await expect(execute(system, { $domain: "session", $operation: "wait", event: "sessionEnd" }))
      .resolves.toEqual({ scope: "system", event: "sessionEnd", payload: { identity: "session-one", reason: "expired" } })
    await expect(execute(system, { $domain: "session", $operation: "wait", identity: "session-one", event: "end" }))
      .resolves.toEqual({ scope: "session", session: "session-one", event: "end", payload: { reason: "signedOut" } })

    expect(() => parseExecuteRequest({ $domain: "connection", $operation: "wait", identity: "connection-one", event: "connectionCreate" })).toThrow(/scope/)
    expect(() => parseExecuteRequest({ $domain: "session", $operation: "wait", event: "connectionAttach" })).toThrow(/scope/)
    expect(() => parseExecuteRequest({ $domain: "connection", $operation: "disconnect", identity: "connection-one" })).toThrow(/Unknown Execute operation/)
  })

  it("dispatches through public handles and preserves their errors", async () => {
    const calls: unknown[] = []
    const failure = new Error("endpoint failure")
    const server = {
      ask(event: string, input?: unknown) {
        calls.push([event, input])
        if (event === "fail") throw failure
        return Promise.resolve({ accepted: true })
      }
    }
    const process = { server }
    const system = {
      process: {
        find(identity: string) {
          calls.push(["find", identity])
          return Promise.resolve(process)
        }
      }
    } as unknown as ExecutionSystem

    await expect(execute(system, {
      $domain: "endpoint",
      $operation: "ask",
      process: "main",
      endpoint: "server",
      event: "read",
      input: { value: 1 }
    })).resolves.toEqual({ accepted: true })

    await expect(execute(system, {
      $domain: "endpoint",
      $operation: "ask",
      process: "main",
      endpoint: "server",
      event: "fail"
    })).rejects.toBe(failure)

    expect(calls).toEqual([
      ["find", "main"],
      ["read", { value: 1 }],
      ["find", "main"],
      ["fail", undefined]
    ])
  })

  it("uses the Client Endpoint memory handle for Execute operations", async () => {
    const values = new Map<string, unknown>()
    const system = { process: { find: async () => ({ client: { memory: {
      get: async (key: string) => values.get(key),
      set: async (key: string, value: unknown) => { values.set(key, value) },
      delete: async (key: string) => values.delete(key),
      entries: async () => [...values.entries()]
    } } }) } } as unknown as ExecutionSystem
    const base = { $domain: "endpoint" as const, process: "main" }
    await expect(execute(system, { ...base, $operation: "memoryGet", key: "tab" })).resolves.toBeNull()
    await expect(execute(system, { ...base, $operation: "memorySet", key: "tab", value: "colors" })).resolves.toBe("colors")
    await expect(execute(system, { ...base, $operation: "memoryEntries" })).resolves.toEqual([["tab", "colors"]])
    await expect(execute(system, { ...base, $operation: "memoryDelete", key: "tab" })).resolves.toBe(true)
  })

  it("covers System launch and lifecycle capabilities", () => {
    const operations = new Set(listExecuteOperations().map(value => `${value.domain}.${value.operation}`))

    for (const operation of [
      "system.logs",
      "connection.list",
      "connection.find",
      "connection.session",
      "connection.signIn",
      "connection.wait",
      "session.list",
      "session.find",
      "session.connections",
      "session.signOut",
      "session.wait",
      "program.definition",
      "program.getStartup",
      "program.setStartup",
      "program.removeStartup",
      "program.pinned",
      "program.pin",
      "program.getPermission",
      "program.listPermissions",
      "program.allowsPermission",
      "program.allowPermission",
      "program.denyPermission",
      "program.resetPermission",
      "program.logs",
      "program.wait",
      "process.wait",
      "endpoint.wait",
      "endpoint.waitLifecycle",
      "endpoint.memoryGet",
      "endpoint.memorySet",
      "endpoint.memoryDelete",
      "endpoint.memoryEntries",
      "service.list",
      "service.inspect",
      "service.waitReady",
      "service.ask",
      "service.publish",
      "service.wait",
      "service.waitLifecycle",
      "service.waitDiscovery",
      "window.wait"
    ]) expect(operations.has(operation)).toBe(true)

    expect(() => parseExecuteRequest({
      $domain: "program",
      $operation: "wait",
      program: "example",
      event: "install"
    })).toThrow(/individual Program/)
  })

  it("queries System logs through the System log handle", async () => {
    const calls: unknown[] = []
    const system = {
      logs: {
        query(statement: string, values?: unknown[]) {
          calls.push([statement, values])
          return Promise.resolve([{ level: "error" }])
        }
      }
    } as unknown as ExecutionSystem

    await expect(execute(system, {
      $domain: "system",
      $operation: "logs",
      statement: "select * from logs where level = ?",
      values: ["error"]
    })).resolves.toEqual([{ level: "error" }])

    expect(calls).toEqual([["select * from logs where level = ?", ["error"]]])
  })

  it("discovers and inspects Services through the public Service registry", async () => {
    const address = { program: "notes", process: "main", endpoint: "server" as const }
    const service = {
      address: () => address,
      available: () => Promise.resolve(true)
    }
    const system = {
      service: {
        list: (options: { name?: string }) => Promise.resolve(options.name === "main" ? [service] : []),
        prepare: () => service
      }
    } as unknown as ExecutionSystem

    await expect(execute(system, {
      $domain: "service",
      $operation: "list",
      name: "main"
    })).resolves.toEqual([{ ...address, available: true }])

    await expect(execute(system, {
      $domain: "service",
      $operation: "inspect",
      ...address
    })).resolves.toEqual({ ...address, available: true })
  })

  it("executes Program state and lifecycle waits through public handles", async () => {
    const programDefinition = {
      identity: "example",
      version: "0.0.0",
      storage: "./storage",
      client: { location: "./client" }
    }
    const window = {
      wait(event: string, timeout?: number) {
        expect([event, timeout]).toEqual(["resize", 250])
        return Promise.resolve({ width: 640, height: 480 })
      }
    }
    const process = { identity: "process", client: { window } }
    let startup: unknown = null
    let pinned = false
    const permissions: { network?: string[] | false } = { network: ["https://api.example.com"] }
    const program = {
      identity: "example",
      definition: () => Promise.resolve(programDefinition),
      startup: {
        get: () => Promise.resolve(startup),
        async set(value: unknown = {}) { startup = value },
        async remove() { startup = null }
      },
      pinned: () => Promise.resolve(pinned),
      async pin() { pinned = true },
      async unpin() { pinned = false },
      permissions: {
        get: (name: "network") => Promise.resolve(permissions[name] ?? null),
        all: () => Promise.resolve(permissions),
        allows: () => Promise.resolve(true),
        async allow(name: "network", value: true | string[] = true) { permissions[name] = value === true ? [] : value },
        async deny(name: "network") { permissions[name] = false },
        async reset(name: "network") { delete permissions[name] },
        request: (_name: "network", value: true | string[] = true) => Promise.resolve(value === true ? [] : value),
        timeout: () => ({ request: (_name: "network", value: true | string[] = true) => Promise.resolve(value === true ? [] : value) })
      }
    }
    const system = {
      program: { find: () => Promise.resolve(program) },
      process: { find: () => Promise.resolve(process) }
    } as unknown as ExecutionSystem

    await expect(execute(system, {
      $domain: "program",
      $operation: "definition",
      identity: "example"
    })).resolves.toEqual(programDefinition)

    await expect(execute(system, {
      $domain: "program",
      $operation: "setStartup",
      identity: "example",
      launch: { client: { maximize: true } }
    })).resolves.toEqual({ client: { maximize: true } })

    await expect(execute(system, {
      $domain: "program",
      $operation: "getStartup",
      identity: "example"
    })).resolves.toEqual({ client: { maximize: true } })

    await expect(execute(system, {
      $domain: "program",
      $operation: "pin",
      identity: "example"
    })).resolves.toBe(true)

    await expect(execute(system, {
      $domain: "program",
      $operation: "getPermission",
      identity: "example",
      permission: "network"
    })).resolves.toEqual(["https://api.example.com"])

    await expect(execute(system, {
      $domain: "program",
      $operation: "allowPermission",
      identity: "example",
      permission: "network",
      value: ["https://other.example.com"]
    })).resolves.toEqual(["https://other.example.com"])

    await expect(execute(system, {
      $domain: "program",
      $operation: "denyPermission",
      identity: "example",
      permission: "network"
    })).resolves.toBe(false)

    await expect(execute(system, {
      $domain: "program",
      $operation: "resetPermission",
      identity: "example",
      permission: "network"
    })).resolves.toBeNull()

    await expect(execute(system, {
      $domain: "window",
      $operation: "wait",
      process: "process",
      event: "resize",
      timeout: 250
    })).resolves.toEqual({
      scope: "window",
      process: "process",
      event: "resize",
      payload: { width: 640, height: 480 }
    })
  })

  it("queries Program logs through the public read-only SQL handle", async () => {
    const queries: unknown[] = []
    const program = {
      identity: "terminal",
      logs: {
        query(statement: string, values?: unknown[]) {
          queries.push([statement, values])
          return Promise.resolve([{ createdAt: 1, process: "main", content: "ready" }])
        }
      }
    }
    const system = {
      program: { find: () => Promise.resolve(program) }
    } as unknown as ExecutionSystem

    await expect(execute(system, {
      $domain: "program",
      $operation: "logs",
      identity: "terminal",
      statement: "select createdAt, process, content from logs where process = ?",
      values: ["main"]
    })).resolves.toEqual([{ createdAt: 1, process: "main", content: "ready" }])

    expect(queries).toEqual([[
      "select createdAt, process, content from logs where process = ?",
      ["main"]
    ]])

    const description = describeExecuteOperation("program", "logs")
    expect(description?.request).toMatchObject({
      properties: {
        statement: {
          description: "Table: logs. Columns: createdAt, process, source, kind, content."
        }
      }
    })
  })
})
