import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ClientEndpoint,
  ClientService,
  type ClientContext,
  type Desktop,
  type Context,
  type Launch,
  type LocalWindow,
  type Permission,
  type PermissionChange,
  type Process,
  type Program,
  type Storage,
  type ShellEvent,
  type ShellOptions,
  type System,
  type Transaction,
  Endpoint,
  ServerEndpoint,
  ServerService,
  Service,
  defineConfig,
  isRelativeValue,
  isServiceKey,
  layers,
  parsePermission,
  parsePermissionChange,
  parsePermissions,
  parseRelativeValue,
  parseShellEvent
} from "../source/main.js"

describe("public runtime", function () {
  it("keeps local representation commands separate from subscriptions", function () {
    expectTypeOf<LocalWindow>().toHaveProperty("setGeometry")
    expectTypeOf<LocalWindow>().toHaveProperty("addSurface")
    expectTypeOf<LocalWindow>().toHaveProperty("removeSurface")
    expectTypeOf<LocalWindow>().toHaveProperty("transaction")
    expectTypeOf<LocalWindow>().not.toHaveProperty("subscribe")
    expectTypeOf<LocalWindow>().not.toHaveProperty("title")

    const duration: Transaction = { duration: 180 }
    const easing: Transaction = { easing: "ease-out", wait: true }
    void duration
    void easing

    type EmptyRejected = {} extends Transaction ? false : true
    type WaitOnlyRejected = { wait: true } extends Transaction ? false : true
    expectTypeOf<EmptyRejected>().toEqualTypeOf<true>()
    expectTypeOf<WaitOnlyRejected>().toEqualTypeOf<true>()
  })

  it("preserves the domain class hierarchy", function () {
    expect(ClientEndpoint.prototype).toBeInstanceOf(Endpoint)
    expect(ServerEndpoint.prototype).toBeInstanceOf(Endpoint)
    expect(ClientService.prototype).toBeInstanceOf(Service)
    expect(ServerService.prototype).toBeInstanceOf(Service)
  })

  it("keeps one complete Program and Process contract", function () {
    type Processes = Awaited<ReturnType<Program["process"]["list"]>>
    type Found = Awaited<ReturnType<Program["process"]["find"]>>

    expectTypeOf<Processes>().toEqualTypeOf<Process[]>()
    expectTypeOf<Found>().toEqualTypeOf<Process | null>()
    expectTypeOf<Program>().toHaveProperty("fork")
    expectTypeOf<Program>().toHaveProperty("assetId")
    expectTypeOf<Program["data"]>().toEqualTypeOf<Storage>()
  })

  it("defines shell execution once on the shared System contract", function () {
    type Shell = System["shell"]
    type Options = NonNullable<Parameters<Shell>[1]>
    type Event = Awaited<ReturnType<ReturnType<Shell>["next"]>>["value"]

    expectTypeOf<Options>().toEqualTypeOf<ShellOptions>()
    expectTypeOf<Event>().toEqualTypeOf<ShellEvent | void>()
    expect(parseShellEvent({ event: "output", stream: "stdout", text: "hello" })).toEqual({ event: "output", stream: "stdout", text: "hello" })
    expect(() => parseShellEvent({ event: "started", pid: 0 })).toThrow(/invalid shell event/)
  })

  it("exposes the System uploads directory through the shared contract", function () {
    expectTypeOf<System["uploads"]["path"]>().returns.toEqualTypeOf<Promise<string>>()
  })

  it("shares Endpoint launch contracts across Process creation and restart", function () {
    const launch: Launch = {
      server: { service: true },
      client: { service: true }
    }
    type ClientLaunchHasService = "service" extends keyof NonNullable<Parameters<ClientEndpoint["start"]>[0]> ? true : false
    type ServerLaunchHasService = "service" extends keyof NonNullable<Parameters<ServerEndpoint["start"]>[0]> ? true : false

    expect(launch.server).toEqual({ service: true })
    expectTypeOf<ClientLaunchHasService>().toEqualTypeOf<true>()
    expectTypeOf<ServerLaunchHasService>().toEqualTypeOf<true>()
    expectTypeOf<Context>().toHaveProperty("isService")
    expectTypeOf<Endpoint>().toHaveProperty("isService")
    expectTypeOf<Endpoint>().not.toHaveProperty("service")
    expectTypeOf<Endpoint>().toHaveProperty("lifecycle")
    expectTypeOf<Service>().toHaveProperty("lifecycle")
    expectTypeOf<Service>().toHaveProperty("exists")
    expectTypeOf<Endpoint>().toHaveProperty("waitReady")
    expectTypeOf<Service>().toHaveProperty("waitReady")
    expectTypeOf<Service>().toHaveProperty("publish")
    expectTypeOf<ClientService>().toHaveProperty("waitReady")
    expectTypeOf<ServerService>().toHaveProperty("waitReady")
    expectTypeOf<Service>().not.toHaveProperty("channel")

    const immutableProgramPermissions: Launch = {
      client: {
        // @ts-expect-error Process launches cannot override Program permissions.
        permissions: { files: true }
      }
    }
    void immutableProgramPermissions
  })

  it("keeps the finite public registries narrow", function () {
    expect(layers).toEqual(["window", "under", "over"])
  })

  it("separates the Client context, Desktop, and global System contracts", function () {
    expectTypeOf<ClientContext>().toHaveProperty("window")
    expectTypeOf<ClientContext>().toHaveProperty("localWindow")
    expectTypeOf<ClientContext>().toHaveProperty("server")
    expectTypeOf<ClientContext>().toHaveProperty("permissions")
    expectTypeOf<Desktop>().toHaveProperty("surface")
    expectTypeOf<Desktop>().toHaveProperty("preferences")
    expectTypeOf<Desktop>().not.toHaveProperty("pointer")
    expectTypeOf<System["fetch"]>().returns.toEqualTypeOf<Promise<Response>>()
  })

  it("keeps permission values canonical after input resolution", function () {
    expectTypeOf<Permission>().toEqualTypeOf<string[] | false | null>()
    expectTypeOf<PermissionChange>().toEqualTypeOf<Readonly<{
      permission: Permission
      needReload: boolean
    }>>()
    expectTypeOf<Program>().toHaveProperty("permissions")
    expect(parsePermission(["read"])).toEqual(["read"])
    expect(parsePermissionChange({ permission: false, needReload: true })).toEqual({ permission: false, needReload: true })
    expect(parsePermissions({ files: ["read"], environment: null })).toEqual({ files: ["read"], environment: null })
    expect(() => parsePermission(true)).toThrow(/invalid permission/)
  })

  it("returns the exact authored Program configuration", function () {
    const config = {
      identity: "public-contract",
      agent: "./agent-guide.md",
      client: {
        location: "./client",
        permissions: { files: true, environment: [] }
      }
    } as const

    expect(defineConfig(config)).toBe(config)
    expect(config.agent).toBe("./agent-guide.md")
    expect(config.client.permissions.files).toBe(true)
  })

  it("requires exactly one Server execution declaration", function () {
    const worker = defineConfig({
      identity: "worker-contract",
      server: { location: "./server", entryFile: "main.js" }
    })

    expect(worker.server?.entryFile).toBe("main.js")

    // @ts-expect-error A Server cannot declare two execution modes.
    const both = defineConfig({ identity: "both-contract", server: { location: "./server", startCommand: "node main.js", entryFile: "main.js" } })

    // @ts-expect-error A Server must declare one execution mode.
    const neither = defineConfig({ identity: "neither-contract", server: { location: "./server" } })

    void both
    void neither
  })

  it("recognizes only complete public service keys", function () {
    expect(isServiceKey({ program: "counter", process: "main", endpoint: "server" })).toBe(true)
    expect(isServiceKey({ process: "1f4b222c-25d7-4ba8-85e5-d5e59cfe0928", endpoint: "server" })).toBe(true)
    expect(isServiceKey({ process: "main", endpoint: "server" })).toBe(false)
    expect(isServiceKey({ program: "counter", process: "main", endpoint: "process" })).toBe(false)
    expect(isServiceKey({ program: "counter", process: "", endpoint: "client" })).toBe(false)
  })

  it("accepts only finite linear geometry", function () {
    expect(parseRelativeValue("50% + 20 * 2")).toEqual({ relative: 0.5, pixels: 40 })
    expect(parseRelativeValue("1/3 - 4")).toEqual({ relative: 1 / 3, pixels: -4 })
    expect(isRelativeValue(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isRelativeValue("calc(100% - 4px)")).toBe(false)
  })
})
