import { expect, test } from "vitest"
import { parseProgramInstallOptions, parseProgramUninstallOptions } from "../source/main.js"

test("installation preserves independent launch and purge decisions", () => {
  expect(parseProgramInstallOptions({})).toEqual({})
  expect(parseProgramInstallOptions({ launch: true, purge: true })).toEqual({ launch: true, purge: true })
  const input = { launch: { name: "main", replace: true, options: { mode: "editor" } }, purge: false }
  const parsed = parseProgramInstallOptions(input)
  input.launch.options.mode = "changed"
  expect(parsed).toEqual({ launch: { name: "main", replace: true, options: { mode: "editor" } }, purge: false })
  expect(parseProgramInstallOptions({ extension: true })).toEqual({})
  for (const value of [true, false, null, { launch: false }, { purge: "yes" }]) {
    expect(() => parseProgramInstallOptions(value)).toThrow()
  }
})

test("uninstallation reads only its purge decision", () => {
  expect(parseProgramUninstallOptions({})).toEqual({})
  expect(parseProgramUninstallOptions({ purge: true })).toEqual({ purge: true })
  expect(parseProgramUninstallOptions({ extension: true })).toEqual({})
  for (const value of [true, false, null, { purge: "yes" }]) {
    expect(() => parseProgramUninstallOptions(value)).toThrow()
  }
})
