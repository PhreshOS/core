import { describe, expect, expectTypeOf, it } from "vitest"
import { parseProgramDefinition, type Config, type Launch, type ProgramDefinition } from "../source/main.js"

describe("Program definition", function () {
  it("shares the install launch contract with authoring configuration", () => {
    expectTypeOf<Config["installLaunch"]>().toEqualTypeOf<true | Launch | undefined>()
    expectTypeOf<Config["installLaunch"]>().toEqualTypeOf<ProgramDefinition["installLaunch"]>()

    const config: Config = {
      identity: "window-contract",
      client: {
        location: "./client",
        frame: { radius: "full", material: { opacity: 0.8 } },
        transaction: { duration: 180, easing: "ease-out" }
      }
    }
    void config
  })
  it("canonicalizes the shared runtime definition", function () {
    const definition = parseProgramDefinition({
      identity: "example-program",
      storage: "/var/example",
      permissions: {
        network: ["https://api.example.com/**"],
        uploads: true
      },
      client: { location: "/opt/example/client", header: false }
    })

    expect(definition.permissions?.network).toEqual(["https://api.example.com"])
    expect(definition.client?.header).toBe(false)
    expect(definition.version).toBe("0.0.0")
    expect(Object.isFrozen(definition)).toBe(true)
  })

  it("preserves post-install launch intent", () => {
    const base = { identity: "example", storage: "/tmp/example", client: { location: "/client" } }
    for (const launch of [undefined, true, {}, { options: { document: "welcome.txt" } }]) {
      const parsed = parseProgramDefinition({ ...base, installLaunch: launch })
      expect(parsed.installLaunch).toEqual(launch)
    }
    for (const launch of [false, null, "true", [], { options: { count: 1 } }]) {
      expect(() => parseProgramDefinition({ ...base, installLaunch: launch })).toThrow()
    }
  })

  it("validates consumed values and ignores additional properties", function () {
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example" })).toThrow("Server, a Client, or both")
    expect(parseProgramDefinition({ identity: "example", storage: "/tmp/example", permissions: { files: true }, client: { location: "/client" } }).permissions).toEqual({})
    expect(parseProgramDefinition({ identity: "example", storage: "/tmp/example", extension: true, client: { location: "/client", extension: true } })).toEqual({
      identity: "example",
      version: "0.0.0",
      storage: "/tmp/example",
      client: { location: "/client" }
    })
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", client: { location: "/client", header: "hidden" } })).toThrow("header default")
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", server: { location: "/server", command: "node main.js", worker: "main.js" } })).toThrow("exactly one")
  })
})
