import { describe, expect, it } from "vitest"
import { parseProgramLogRecord, parseSystemLogRecord } from "../source/main.js"

describe("logs", () => {
  it("parses Program records without retaining unrelated boundary values", () => {
    expect(parseProgramLogRecord({
      createdAt: 1,
      process: "main",
      source: "server",
      kind: "stdout",
      content: "ready",
      transport: "inert"
    })).toEqual({
      createdAt: 1,
      process: "main",
      source: "server",
      kind: "stdout",
      content: "ready"
    })

    expect(() => parseProgramLogRecord({ createdAt: 1, process: "main", source: "node", kind: "log", content: "ready" })).toThrow(/source/)
  })

  it("parses System records and validates structured data", () => {
    expect(parseSystemLogRecord({
      createdAt: 2,
      level: "error",
      source: "process",
      kind: "unexpectedServerEndpointExit",
      content: "Example stopped unexpectedly.",
      data: { program: "example", exit: { code: 1, signal: null } },
      transport: "inert"
    })).toEqual({
      createdAt: 2,
      level: "error",
      source: "process",
      kind: "unexpectedServerEndpointExit",
      content: "Example stopped unexpectedly.",
      data: { program: "example", exit: { code: 1, signal: null } }
    })

    expect(() => parseSystemLogRecord({
      createdAt: 2,
      level: "fatal",
      source: "process",
      kind: "crash",
      content: "failed",
      data: null
    })).toThrow(/level/)

    expect(() => parseSystemLogRecord({
      createdAt: 2,
      level: "error",
      source: "process",
      kind: "crash",
      content: "failed",
      data: { exception: new Error("failed") }
    })).toThrow(/data/)
  })
})
