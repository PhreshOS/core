import { describe, expect, it } from "vitest"
import { parseProcessDefaults, parseProgramDefinition, withProcessDefaults } from "../source/main.js"

describe("Process defaults", () => {
  it("are read from a Program definition: a name, replacement with it, and text options", () => {
    const definition = parseProgramDefinition({ identity: "bmo", storage: "./storage", server: { location: "./server", worker: "main.js" }, process: { name: "session", replace: true, options: { mode: "watch" } } })
    expect(definition.process).toEqual({ name: "session", replace: true, options: { mode: "watch" } })
  })

  it("refuse replacement without a name, anything else unknown, and non-text options", () => {
    expect(() => parseProcessDefaults({ replace: true })).toThrow("requires a name")
    expect(() => parseProcessDefaults({ name: "session", server: true })).toThrow("no `server`")
    expect(() => parseProcessDefaults({ options: { count: 3 } })).toThrow("text values")
  })

  it("fill a launch: its own name and replacement win, its options lie over the defaults", () => {
    const defaults = { name: "session", replace: true, options: { mode: "watch", theme: "night" } }
    expect(withProcessDefaults({}, defaults)).toEqual(defaults)
    expect(withProcessDefaults({ name: "other", replace: false, options: { theme: "day" } }, defaults)).toEqual({ name: "other", replace: false, options: { mode: "watch", theme: "day" } })
    expect(withProcessDefaults({ server: true }, undefined)).toEqual({ server: true })
  })

  it("replace nothing when no name results", () => {
    expect(withProcessDefaults({}, { options: { mode: "watch" } })).toEqual({ options: { mode: "watch" } })
  })
})
