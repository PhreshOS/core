import { describe, expect, it } from "vitest"
import { defaultDesktopScale, desktopPreferencesLimits, parseDesktopPreferencesUpdate } from "../source/main.js"

describe("Desktop preferences", () => {
  it("defines one bounded default scale", () => {
    expect(defaultDesktopScale).toBe(1)
    expect(defaultDesktopScale).toBeGreaterThanOrEqual(desktopPreferencesLimits.scale.minimum)
    expect(defaultDesktopScale).toBeLessThanOrEqual(desktopPreferencesLimits.scale.maximum)
  })

  it("accepts direct and default scale updates", () => {
    expect(parseDesktopPreferencesUpdate({ scale: 1.25 })).toEqual({ scale: 1.25 })
    expect(parseDesktopPreferencesUpdate({ scale: "default" })).toEqual({ scale: "default" })
  })

  it("preserves sibling updates and ignores unrelated additional data", () => {
    expect(parseDesktopPreferencesUpdate({ theme: "dark", animations: false, scale: 0.75, extension: true }))
      .toEqual({ theme: "dark", animations: false, scale: 0.75 })
  })

  it.each([0.49, 2.01, Number.NaN, Number.POSITIVE_INFINITY, "1"])("rejects invalid scale %s", scale => {
    expect(() => parseDesktopPreferencesUpdate({ scale })).toThrow(/scale preference/)
  })
})
