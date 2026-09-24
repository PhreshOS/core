import { describe, expect, expectTypeOf, it } from "vitest"
import {
  describeExecuteOperation,
  execute,
  listExecuteOperations,
  parseExecuteRequest,
  type ExecutionSystem
} from "../source/main.js"

describe("Execute", () => {
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

  it("covers System launch and lifecycle capabilities", () => {
    const operations = new Set(listExecuteOperations().map(value => `${value.domain}.${value.operation}`))

    for (const operation of [
      "system.logs",
      "program.definition",
      "program.getStartup",
      "program.enableStartup",
      "program.disableStartup",
      "program.pinned",
      "program.pin",
      "program.unpin",
      "program.getPermission",
      "program.listPermissions",
      "program.allowsPermission",
      "program.allowPermission",
      "program.denyPermission",
      "program.logs",
      "program.wait",
      "process.wait",
      "endpoint.wait",
      "endpoint.waitLifecycle",
      "service.list",
      "service.search",
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
        list: () => Promise.resolve([service]),
        search: (name: string) => Promise.resolve(name === "main" ? [service] : []),
        prepare: () => service
      }
    } as unknown as ExecutionSystem

    await expect(execute(system, {
      $domain: "service",
      $operation: "search",
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
    const permissions: { network: string[] | false } = { network: ["https://api.example.com"] }
    const program = {
      identity: "example",
      definition: () => Promise.resolve(programDefinition),
      startup: {
        get: () => Promise.resolve(startup),
        async enable(value: unknown = {}) { startup = value },
        async disable() { startup = null }
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
      $operation: "enableStartup",
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
