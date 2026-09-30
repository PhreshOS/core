import { describe, expect, it } from "vitest"
import { parseAppearanceTransaction, progressAt } from "../source/main.js"

describe("progressAt", () => {
  it("starts at 0 and arrives at 1 for every easing", () => {
    for (const easing of ["linear", "ease-out", [0.65, 0, 0.35, 1], { spring: { bounce: 0 } }, { spring: { bounce: 0.3, velocity: 2 } }] as const) {
      const transaction = { duration: 500, easing }
      expect(progressAt(transaction, 0)).toBe(0)
      expect(progressAt(transaction, 500)).toBe(1)
    }
  })

  it("follows a curve as CSS does", () => {
    expect(progressAt({ duration: 1000, easing: "linear" }, 250)).toBeCloseTo(0.25, 3)
    expect(progressAt({ duration: 1000, easing: "ease-out" }, 500)).toBeGreaterThan(0.5)
  })


  it("settles a spring without bounce and never passes the target", () => {
    const spring = { duration: 600, easing: { spring: { bounce: 0 } } } as const
    let last = 0
    for (let time = 0; time <= 600; time += 20) {
      const at = progressAt(spring, time)
      expect(at).toBeGreaterThanOrEqual(last - 1e-9)
      expect(at).toBeLessThanOrEqual(1)
      last = at
    }
    expect(progressAt(spring, 580)).toBeGreaterThan(0.99)
    // It lands on its target when the time is up: no step at the end.
    expect(1 - progressAt(spring, 599)).toBeLessThan(0.001)
  })

  it("carries a spring's starting velocity, and overshoots with bounce", () => {
    const still = progressAt({ duration: 600, easing: { spring: { bounce: 0 } } }, 60)
    const moving = progressAt({ duration: 600, easing: { spring: { bounce: 0, velocity: 3 } } }, 60)
    expect(moving).toBeGreaterThan(still)
    const bouncing = Array.from({ length: 30 }, (_, index) => progressAt({ duration: 600, easing: { spring: { bounce: 0.5 } } }, index * 20))
    expect(Math.max(...bouncing)).toBeGreaterThan(1)
  })

  it("reads a spring as a valid transaction easing", () => {
    expect(parseAppearanceTransaction({ duration: 400, easing: { spring: { bounce: 0.2, velocity: 1.5 } } })).toEqual({ duration: 400, easing: { spring: { bounce: 0.2, velocity: 1.5 } } })
    expect(() => parseAppearanceTransaction({ duration: 400, easing: { spring: { bounce: 1 } } })).toThrow(/easing/)
  })
})
