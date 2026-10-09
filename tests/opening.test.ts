import { describe, expect, it } from "vitest"
import { opensType, parseOpenTarget, parseOpenType, parseOpeningDefaults, parseOpens, parseProgramDefinition, parseSystemProgramListOptions } from "../source/main.js"

describe("Opening", () => {
  it("reads a target as an exact type and a URI, whatever it points at", () => {
    expect(parseOpenTarget({ type: "Image/PNG", uri: "file:///home/me/a.png" })).toEqual({ type: "image/png", uri: "file:///home/me/a.png" })
    expect(parseOpenTarget({ type: "x-scheme-handler/mailto", uri: "mailto:someone@example.com" }).uri).toBe("mailto:someone@example.com")
    expect(() => parseOpenTarget({ type: "image/*", uri: "file:///a.png" })).toThrow(/exact media type/)
    expect(() => parseOpenTarget({ type: "image/png", uri: "a.png" })).toThrow(/URI/)
  })

  it("matches a type against exact patterns and whole families", () => {
    expect(opensType(["image/*"], "image/png")).toBe(true)
    expect(opensType(["image/png"], "IMAGE/PNG")).toBe(true)
    expect(opensType(["image/png"], "image/jpeg")).toBe(false)
    expect(opensType(["inode/directory"], "image/png")).toBe(false)
  })

  it("keeps defaults for exact types and whole families, and a family only for a Program that opens all of it", () => {
    expect(parseOpenType("Image/*")).toBe("image/*")
    expect(parseOpenType("image/png")).toBe("image/png")
    expect(() => parseOpenType("*/*")).toThrow(/family/)
    expect(opensType(["image/*"], "image/*")).toBe(true)
    expect(opensType(["image/png"], "image/*")).toBe(false)

    const program = { reference: "r", identity: "paint", assetId: "a", installed: true, name: "Paint", version: "0.0.0", description: null, hasAgent: false, server: null, client: null }
    expect(Object.keys(parseOpeningDefaults({ "image/*": program, "image/png": program }))).toEqual(["image/*", "image/png"])
  })

  it("keeps what a Program opens in its definition, and filters Programs by it", () => {
    expect(parseOpens(["image/*", "IMAGE/*", "inode/directory"])).toEqual(["image/*", "inode/directory"])
    expect(() => parseOpens(["png"])).toThrow(/media types/)

    const definition = parseProgramDefinition({ identity: "preview", storage: "/tmp/preview", client: { location: "/tmp/preview" }, opens: ["image/*"] })
    expect(definition.opens).toEqual(["image/*"])
    expect(parseSystemProgramListOptions({ opens: "Image/PNG" })).toEqual({ opens: "image/png" })
    expect(() => parseSystemProgramListOptions({ opens: "png" })).toThrow(/media type/)
  })
})
