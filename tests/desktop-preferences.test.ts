import { describe, expect, it } from "vitest"
import { defaultDesktopScale, desktopPreferencesLimits, parseDesktopPreferencesUpdate } from "../source/main.js"

describe("Desktop preferences", () => {
  it("defines one bounded default scale", () => {
    expect(defaultDesktopScale).toBe(1)
    expect(defaultDesktopScale).toBeGreaterThanOrEqual(desktopPreferencesLimits.scale.minimum)
    expect(defaultDesktopScale).toBeLessThanOrEqual(desktopPreferencesLimits.scale.maximum)
  })

  it("accepts a scale only as a number", () => {
    expect(parseDesktopPreferencesUpdate({ scale: 1.25 })).toEqual({ scale: 1.25 })
    expect(() => parseDesktopPreferencesUpdate({ scale: "desktop" })).toThrow(/scale preference/)
  })

  it("lets the Desktop decide the theme and animations", () => {
    expect(parseDesktopPreferencesUpdate({ theme: "desktop", animations: "desktop" })).toEqual({ theme: "desktop", animations: "desktop" })
    expect(() => parseDesktopPreferencesUpdate({ theme: "default" })).toThrow(/theme preference/)
    expect(() => parseDesktopPreferencesUpdate({ animations: "default" })).toThrow(/animations preference/)
  })

  it("preserves sibling updates and ignores unrelated additional data", () => {
    expect(parseDesktopPreferencesUpdate({ theme: "dark", animations: false, scale: 0.75, extension: true }))
      .toEqual({ theme: "dark", animations: false, scale: 0.75 })
  })

  it.each([0.49, 2.01, Number.NaN, Number.POSITIVE_INFINITY, "1"])("rejects invalid scale %s", scale => {
    expect(() => parseDesktopPreferencesUpdate({ scale })).toThrow(/scale preference/)
  })
})
