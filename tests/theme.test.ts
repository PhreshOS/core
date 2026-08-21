import { describe, expect, it } from "vitest"
import { createThemeSnapshot, standardTheme } from "../source/main.js"

describe("Theme colors", function () {
  it("keeps independent standard surface, content, and emphasis sources", function () {
    expect(standardTheme.background).toBe("#f5f4ee")
    expect(standardTheme.foreground).toBe("#183447")
    expect(standardTheme.accent).toBe("#4c9cff")
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
  })
})
