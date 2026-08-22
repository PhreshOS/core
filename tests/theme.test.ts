import { describe, expect, it } from "vitest"
import { createThemeSnapshot, standardTheme, themeLimits } from "../source/main.js"

describe("Theme colors", function () {
  it("keeps independent standard background, content, and emphasis sources", function () {
    expect(standardTheme.background).toBe("#f5f4ee")
    expect(standardTheme.foreground).toBe("#183447")
    expect(standardTheme.accent).toBe("#4c9cff")
    expect("glass" in standardTheme).toBe(false)
    expect(standardTheme.surface).toEqual({
      grain: 0.04,
      animation: 0,
      backdrop: 0,
      opacity: 1
    })
  })

  it("preserves every explicit color in a complete immutable snapshot", function () {
    const theme = createThemeSnapshot({
      ...standardTheme,
      background: "canvas",
      foreground: "canvastext",
      accent: "hotpink"
    })

    expect(theme.background).toBe("canvas")
    expect(theme.foreground).toBe("canvastext")
    expect(theme.accent).toBe("hotpink")
    expect(Object.isFrozen(theme)).toBe(true)
    expect(Object.isFrozen(theme.surface)).toBe(true)
  })

  it("publishes the complete bounded Surface ranges", function () {
    expect("glass" in themeLimits).toBe(false)
    expect(themeLimits.surface).toEqual({
      grain: { minimum: 0, maximum: 1 },
      animation: { minimum: 0, maximum: 16 },
      backdrop: { minimum: 0, maximum: 24 },
      opacity: { minimum: 0, maximum: 1 }
    })
  })
})
