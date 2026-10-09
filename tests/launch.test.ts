import { describe, expect, it } from "vitest"
import { launchOptionLimits, parseLaunch } from "../source/main.js"

describe("Launch", () => {
  it("replaces only a named Process", () => {
    expect(parseLaunch({ name: "main", replace: true })).toEqual({ name: "main", replace: true })
    expect(parseLaunch({ name: "main", replace: false })).toEqual({ name: "main", replace: false })
    expect(() => parseLaunch({ replace: true })).toThrow("requires a name")
    expect(() => parseLaunch({ name: "main", replace: "yes" })).toThrow()
  })
  it("keeps options small: a bounded count and text", () => {
    const many = Object.fromEntries(Array.from({ length: launchOptionLimits.count }, (_, index) => [`o${index}`, "x"]))
    expect(Object.keys(parseLaunch({ options: many }).options!)).toHaveLength(launchOptionLimits.count)
    expect(() => parseLaunch({ options: { ...many, extra: "x" } })).toThrow(`at most ${launchOptionLimits.count} options`)
    expect(parseLaunch({ options: { document: "x".repeat(launchOptionLimits.text - "document".length) } }).options).toBeDefined()
    expect(() => parseLaunch({ options: { document: "x".repeat(launchOptionLimits.text) } })).toThrow("characters in all")
  })
  it("snapshots options and Endpoint overrides without resolving defaults", () => {
    const input = { options: { language: "en" }, client: { header: false, position: { x: "1/2", y: 10 } } }
    const launch = parseLaunch(input)
    input.options.language = "fr"
    input.client.position.y = 20
    expect(launch).toEqual({ options: { language: "en" }, client: { header: false, position: { x: "1/2", y: 10 } } })
    expect(parseLaunch({})).toEqual({})
    expect(parseLaunch({ server: false, client: true })).toEqual({ server: false, client: true })
  })

  it("validates consumed values and ignores additional properties", () => {
    expect(parseLaunch({ extension: true, client: { extension: true } })).toEqual({ client: {} })
    for (const value of [null, [], true, { name: "" }, { options: null }, { options: ["x"] }, { server: { service: "yes" } }, { client: { layer: "top" } }, { client: { maximize: 1 } }, { client: { header: "hidden" } }]) {
      expect(() => parseLaunch(value)).toThrow()
    }
  })
})
