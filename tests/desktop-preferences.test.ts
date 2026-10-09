import { describe, expect, it } from "vitest"
import { defaultDesktopScale, desktopPreferencesLimits, parseDesktopPreferences, parseDesktopPreferencesUpdate, parseResolvedDesktopPreferences } from "../source/main.js"

describe("Desktop preferences", () => {
  it("defines one bounded default scale", () => {
    expect(defaultDesktopScale).toBe(1)
    expect(defaultDesktopScale).toBeGreaterThanOrEqual(desktopPreferencesLimits.scale.minimum)
    expect(defaultDesktopScale).toBeLessThanOrEqual(desktopPreferencesLimits.scale.maximum)
  })

  it("accepts a scale only as a number", () => {
    expect(parseDesktopPreferencesUpdate({ scale: 1.25 })).toEqual({ scale: 1.25 })
    expect(() => parseDesktopPreferencesUpdate({ scale: "browser" })).toThrow(/scale preference/)
  })

  it("lets the theme and animations follow the browser", () => {
    expect(parseDesktopPreferencesUpdate({ theme: "browser", animations: "browser" })).toEqual({ theme: "browser", animations: "browser" })
    expect(() => parseDesktopPreferencesUpdate({ theme: "desktop" })).toThrow(/theme preference/)
    expect(() => parseDesktopPreferencesUpdate({ animations: "desktop" })).toThrow(/animations preference/)
  })

  it("keeps what was chosen apart from what it resolves to", () => {
    expect(parseDesktopPreferences({ theme: "browser", animations: false, scale: 1 })).toEqual({ theme: "browser", animations: false, scale: 1 })
    expect(parseResolvedDesktopPreferences({ theme: "dark", animations: true, scale: 1 })).toEqual({ theme: "dark", animations: true, scale: 1 })
    expect(() => parseResolvedDesktopPreferences({ theme: "browser", animations: true, scale: 1 })).toThrow(/resolved/)
    expect(() => parseDesktopPreferences({ theme: "dark", animations: "browser" })).toThrow(/invalid preferences/)
  })

  it("preserves sibling updates and ignores unrelated additional data", () => {
    expect(parseDesktopPreferencesUpdate({ theme: "dark", animations: false, scale: 0.75, extension: true }))
      .toEqual({ theme: "dark", animations: false, scale: 0.75 })
  })

  it.each([0.49, 2.01, Number.NaN, Number.POSITIVE_INFINITY, "1"])("rejects invalid scale %s", scale => {
    expect(() => parseDesktopPreferencesUpdate({ scale })).toThrow(/scale preference/)
  })
})
