import { describe, expectTypeOf, it } from "vitest"
import type { Storage } from "../source/main.js"

describe("Storage", function () {
  it("requires a path for file operations", function () {
    expectTypeOf<Parameters<Storage["bytes"]>>().toEqualTypeOf<[string, ...string[]]>()
    expectTypeOf<Parameters<Storage["text"]>>().toEqualTypeOf<[string, ...string[]]>()
    expectTypeOf<Parameters<Storage["json"]>>().toEqualTypeOf<[string, ...string[]]>()
    expectTypeOf<Parameters<Storage["stream"]>>().toEqualTypeOf<[string, ...string[]]>()
    expectTypeOf<Parameters<Storage["delete"]>>().toEqualTypeOf<[string, ...string[]]>()
    expectTypeOf<Parameters<Storage["write"]>>().toMatchTypeOf<[string, ...unknown[]]>()
  })

  it("allows root metadata and clearing operations", function () {
    expectTypeOf<Parameters<Storage["stat"]>>().toEqualTypeOf<string[]>()
    expectTypeOf<Parameters<Storage["list"]>>().toEqualTypeOf<string[]>()
    expectTypeOf<Parameters<Storage["clear"]>>().toEqualTypeOf<string[]>()
  })
})
