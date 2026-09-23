import { expect, expectTypeOf, test } from "vitest"
import { isLayer, parseLaunch, parseProgramPermissionDeclarations, parsePermission, parsePermissions, type ProgramPermissionDeclarations, type PermissionValue } from "../source/main.js"

test("all restricted Client layers belong to the layers permission", () => {
  expect(isLayer("wallpaper")).toBe(true)
  expect(isLayer("shell")).toBe(true)
  expect(parseLaunch({ client: { layer: "wallpaper", minimize: true } })).toEqual({
    client: { layer: "wallpaper", minimize: true }
  })
  expect(parseProgramPermissionDeclarations({ layers: ["wallpaper", "shell"] })).toEqual({ layers: ["wallpaper", "shell"] })
  expect(parsePermission("layers", ["wallpaper"])).toEqual(["wallpaper"])
  expect(() => parsePermission("wallpaper" as never, [])).toThrow()
})

test("layer permissions share the declaration and stored permission contracts", () => {
  expectTypeOf<PermissionValue<"layers">>().toEqualTypeOf<"under" | "over" | "wallpaper" | "shell">()
  const declaration: ProgramPermissionDeclarations = { layers: ["under", "over", "wallpaper", "shell"] }
  expect(parseProgramPermissionDeclarations(declaration)).toEqual(declaration)
  expect(parseProgramPermissionDeclarations({ layers: true })).toEqual({ layers: true })
  expect(parseProgramPermissionDeclarations({ layers: [] })).toEqual({ layers: [] })
  expect(parsePermission("layers", ["over", "wallpaper", "shell", "under", "over"])).toEqual(["over", "wallpaper", "shell", "under"])
  expect(parsePermissions({ layers: false })).toEqual({ layers: false })
  expect(parsePermissions({ layers: null })).toEqual({ layers: null })
  for (const value of [false, null, ["window"], ["unknown"]]) {
    expect(() => parseProgramPermissionDeclarations({ layers: value })).toThrow()
  }
  // @ts-expect-error Declarations accept true or a list, not stored denials.
  const denied: ProgramPermissionDeclarations = { layers: false }
  // @ts-expect-error Standard windows are outside the permission's value domain.
  const standard: ProgramPermissionDeclarations = { layers: ["window"] }
  void denied
  void standard
})
