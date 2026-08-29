import { describe, expect, expectTypeOf, it } from "vitest"
import {
  Client,
  ClientService,
  type Channel,
  type LocalWindow,
  type Transaction,
  Endpoint,
  Server,
  ServerService,
  Service,
  defineConfig,
  isPermissionName,
  isRelativeValue,
  isServiceKey,
  layers,
  parseRelativeValue
} from "../source/main.js"

describe("public runtime", function () {
  it("keeps local representation commands separate from subscriptions", function () {
    expectTypeOf<LocalWindow>().toHaveProperty("setGeometry")
    expectTypeOf<LocalWindow>().toHaveProperty("surface")
    expectTypeOf<LocalWindow>().not.toHaveProperty("subscribe")

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
    expect(Client.prototype).toBeInstanceOf(Endpoint)
    expect(Server.prototype).toBeInstanceOf(Endpoint)
    expect(ClientService.prototype).toBeInstanceOf(Service)
    expect(ServerService.prototype).toBeInstanceOf(Service)
  })

  it("places service exposure on Channel and service identity on Endpoint", function () {
    expectTypeOf<Channel>().toHaveProperty("enableService")
    expectTypeOf<Channel>().toHaveProperty("disableService")
    expectTypeOf<Endpoint>().toHaveProperty("service")
    expectTypeOf<Endpoint>().not.toHaveProperty("enableService")
    expectTypeOf<Endpoint>().not.toHaveProperty("disableService")
  })

  it("keeps the finite public registries narrow", function () {
    expect(layers).toEqual(["window", "under", "over"])
    expect(isPermissionName("pointer")).toBe(true)
    expect(isPermissionName("pointerMove")).toBe(false)
  })

  it("returns the exact authored Program configuration", function () {
    const config = {
      identity: "public-contract",
      agent: "./agent-guide.md",
      client: { location: "./client" }
    } as const

    expect(defineConfig(config)).toBe(config)
    expect(config.agent).toBe("./agent-guide.md")
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
    expect(isServiceKey({ program: "counter", endpoint: "server", name: "state" })).toBe(true)
    expect(isServiceKey({ program: "counter", endpoint: "process", name: "state" })).toBe(false)
    expect(isServiceKey({ program: "counter", endpoint: "client", name: "" })).toBe(false)
  })

  it("accepts only finite linear geometry", function () {
    expect(parseRelativeValue("50% + 20 * 2")).toEqual({ relative: 0.5, pixels: 40 })
    expect(parseRelativeValue("1/3 - 4")).toEqual({ relative: 1 / 3, pixels: -4 })
    expect(isRelativeValue(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isRelativeValue("calc(100% - 4px)")).toBe(false)
  })
})
