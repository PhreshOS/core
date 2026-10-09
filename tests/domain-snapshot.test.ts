import { describe, expect, it } from "vitest"
import { parseConnectionSnapshot, parseEndpointReference, parseProcessSnapshot, parseProgramSnapshot, parseSessionEndSnapshot, parseSessionSnapshot, parseSessionState, parseConnectionState } from "../source/main.js"

const program = {
  reference: "program-reference",
  identity: "example",
  assetId: "asset-reference",
  installed: true,
  name: "Example",
  version: "0.0.0",
  description: null,
  categories: ["Graphics"],
  keywords: [],
  opens: ["image/*"],
  declaredPermissions: { network: ["https://api.example.com"] },
  hasAgent: false,
  server: { start: true, service: false },
  client: {
    sandbox: true,
    start: true,
    service: false,
    title: null,
    header: null,
    size: null,
    position: null,
    layer: null,
    minimize: null,
    maximize: null
  }
}

const process = {
  reference: "process-reference",
  identity: "process-identity",
  name: null,
  program,
  options: { view: "main" },
  opened: { type: "IMAGE/PNG", uri: "file:///home/me/picture.png" },
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
    // What it was started to open travels with it, its type in canonical case; a Process states it, even as null.
    expect(parsedProcess.opened).toEqual({ type: "image/png", uri: "file:///home/me/picture.png" })
    expect(parseProcessSnapshot({ ...process, opened: null }).opened).toBeNull()
    expect(() => parseProcessSnapshot({ ...process, opened: undefined })).toThrow("Process")
  })

  it("validates consumed values and ignores additional properties", function () {
    expect(parseProgramSnapshot({ ...program, extension: true, client: { ...program.client, extension: true } })).toEqual(program)
    expect(() => parseProgramSnapshot({ ...program, client: { start: true } })).toThrow("Client declaration")
    expect(() => parseProcessSnapshot({ ...process, options: { view: 1 } })).toThrow("Process")
    expect(() => parseEndpointReference({ kind: "worker", process })).toThrow("Endpoint reference")
  })

  it("canonicalizes Connection and Session boundary state", function () {
    const at = new Date(0)
    expect(parseConnectionSnapshot({ identity: "connection", connected: true, session: "session", connectedAt: at.toISOString(), device: "Chrome on macOS", extension: true })).toEqual({
      identity: "connection",
      connected: true,
      session: "session",
      connectedAt: at,
      device: "Chrome on macOS"
    })
    expect(parseSessionSnapshot({ identity: "session", valid: true, createdAt: at, device: null, extension: true })).toEqual({ identity: "session", valid: true, createdAt: at, device: null })
    expect(parseSessionEndSnapshot({ identity: "session", valid: false, createdAt: at, device: null, reason: "signedOut" })).toEqual({
      identity: "session",
      valid: false,
      createdAt: at,
      device: null,
      reason: "signedOut"
    })
    expect(parseSessionState({ valid: true, lastActiveAt: at })).toEqual({ valid: true, lastActiveAt: at })
    expect(parseSessionState({ valid: false, lastActiveAt: null })).toEqual({ valid: false, lastActiveAt: null })
    expect(parseConnectionState({ connected: false, session: null })).toEqual({ connected: false, session: null })
    expect(() => parseConnectionSnapshot({ identity: "connection", connected: true, session: null })).toThrow("Connection")
    expect(() => parseSessionEndSnapshot({ identity: "session", valid: false, createdAt: new Date(0), device: null, reason: "disconnect" })).toThrow("Session end")
  })
})
