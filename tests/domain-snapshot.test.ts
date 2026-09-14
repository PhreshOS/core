import { describe, expect, it } from "vitest"
import { parseEndpointReference, parseProcessSnapshot, parseProgramSnapshot } from "../source/main.js"

const program = {
  reference: "program-reference",
  identity: "example",
  assetId: "asset-reference",
  installed: true,
  name: "Example",
  version: null,
  description: null,
  hasAgent: false,
  server: { start: true, service: false },
  client: {
    start: true,
    service: false,
    title: null,
    size: null,
    position: null,
    layer: null,
    minimize: null, maximize: null
  }
}

const process = {
  reference: "process-reference",
  identity: "process-identity",
  name: null,
  program,
  options: { view: "main" },
  startedAt: "2026-09-12T00:00:00.000Z",
  server: { service: false },
  client: { service: true }
}

describe("domain snapshots", function () {
  it("canonicalizes shared Program and Process values", function () {
    const parsedProgram = parseProgramSnapshot(program)
    const parsedProcess = parseProcessSnapshot(process)

    expect(parsedProgram.client).not.toHaveProperty("permissions")
    expect(parsedProcess.program).toEqual(parsedProgram)
    expect(parsedProcess.startedAt).toEqual(new Date(process.startedAt))
    expect(Object.isFrozen(parsedProcess.options)).toBe(true)
  })

  it("validates consumed values and ignores additional properties", function () {
    expect(parseProgramSnapshot({ ...program, extension: true, client: { ...program.client, extension: true } })).toEqual(program)
    expect(() => parseProgramSnapshot({ ...program, client: { start: true } })).toThrow("Client declaration")
    expect(() => parseProcessSnapshot({ ...process, options: { view: 1 } })).toThrow("Process")
    expect(() => parseEndpointReference({ kind: "worker", process })).toThrow("Endpoint reference")
  })
})
