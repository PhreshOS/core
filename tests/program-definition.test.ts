import { describe, expect, expectTypeOf, it } from "vitest"
import { parseProgramDefinition, type Config, type Launch, type ProgramDefinition } from "../source/main.js"

describe("Program definition", function () {
  it("shares launch and startup contracts with authoring configuration", () => {
    expectTypeOf<Config["launch"]>().toEqualTypeOf<true | Launch | undefined>()
    expectTypeOf<Config["launch"]>().toEqualTypeOf<ProgramDefinition["launch"]>()
    expectTypeOf<Config["startup"]>().toEqualTypeOf<ProgramDefinition["startup"]>()
    expectTypeOf<ProgramDefinition["startup"]>().toEqualTypeOf<true | Launch | undefined>()
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
    expect(Object.isFrozen(definition)).toBe(true)
  })

  it("preserves icon launch intent", () => {
    const base = { identity: "example", storage: "/tmp/example", client: { location: "/client" } }
    for (const launch of [undefined, true, {}, { options: { document: "welcome.txt" } }]) {
      const parsed = parseProgramDefinition({ ...base, launch })
      expect(parsed.launch).toEqual(launch)
    }
    for (const launch of [false, null, "true", [], { options: { count: 1 } }]) {
      expect(() => parseProgramDefinition({ ...base, launch })).toThrow()
    }
  })

  it("preserves startup selection and its launch options", function () {
    const base = { identity: "example", storage: "/tmp/example", client: { location: "/client" } }
    for (const startup of [undefined, true, {}, { options: { document: "welcome.txt" }, client: { minimize: true } }]) {
      const parsed = parseProgramDefinition({ ...base, startup })
      expect(parsed.startup).toEqual(startup)
    }
    expect(parseProgramDefinition({ ...base, startup: { client: { extension: true } } }).startup).toEqual({ client: {} })
    for (const startup of [false, null, "true", [], { options: { count: 1 } }, { client: { size: { width: Infinity, height: 10 } } }]) {
      expect(() => parseProgramDefinition({ ...base, startup })).toThrow()
    }
  })

  it("validates consumed values and ignores additional properties", function () {
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example" })).toThrow("Server, a Client, or both")
    expect(parseProgramDefinition({ identity: "example", storage: "/tmp/example", permissions: { files: true }, client: { location: "/client" } }).permissions).toEqual({})
    expect(parseProgramDefinition({ identity: "example", storage: "/tmp/example", extension: true, client: { location: "/client", extension: true } })).toEqual({
      identity: "example",
      storage: "/tmp/example",
      client: { location: "/client" }
    })
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", client: { location: "/client", header: "hidden" } })).toThrow("header default")
    expect(() => parseProgramDefinition({ identity: "example", storage: "/tmp/example", server: { location: "/server", command: "node main.js", worker: "main.js" } })).toThrow("exactly one")
  })
})
