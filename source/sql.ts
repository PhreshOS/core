import type { JsonValue } from "./content.js"
import type { Subscribable } from "./subscribable.js"

/** SQL access shared by databases and read-only logs. */
export interface SqlQuery {
  /** Executes one statement; template interpolations become bound values. */
  query<Row = Record<string, unknown>>(
    statement: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Row[]>

  /** Executes one statement with optional bound values. */
  query<Row = Record<string, unknown>>(
    statement: string,
    values?: unknown[]
  ): Promise<Row[]>
}

/** SQL access to one Program-owned database. */
export interface ProgramSql extends SqlQuery {}

/** Events emitted by one live log. Historical rows remain available through SQL. */
export type LogEvents<Record> = {
  log: Record
}

/** Read-only SQL and future records from one log. */
export interface Logs<Record> extends SqlQuery, Subscribable<LogEvents<Record>, never> {}

/** One captured line from a Program Endpoint. */
export type ProgramLogRecord = Readonly<{
  /** Capture time as Unix milliseconds. */
  createdAt: number

  /** Runtime identity of the Process that produced the line. */
  process: string

  /** Endpoint kind that produced the line. */
  source: LogSource

  /** Logging method or stream represented by the line. */
  kind: LogKind

  /** Text captured from the Endpoint. */
  content: string
}>

/** Read-only records produced by one Program's Endpoints. */
export interface ProgramLogs extends Logs<ProgramLogRecord> {}

/** Severity selected by the System component that produced a record. */
export type SystemLogLevel = "debug" | "info" | "warning" | "error"

/** One intentional record produced by the PhreshOS System. */
export type SystemLogRecord = Readonly<{
  /** Capture time as Unix milliseconds. */
  createdAt: number

  /** Severity selected by the producing System component. */
  level: SystemLogLevel

  /** System component that produced the record. */
  source: string

  /** Stable machine-readable event name. */
  kind: string

  /** Human-readable account of the event. */
  content: string

  /** Structured event-specific facts, or `null`. */
  data: JsonValue
}>

/** Read-only records produced by the PhreshOS System. */
export interface SystemLogs extends Logs<SystemLogRecord> {}

/** Validate one Program log record received from a runtime boundary. */
export function parseProgramLogRecord(value: unknown): ProgramLogRecord {
  const record = object(value, "Program log")

  if (!finite(record.createdAt)) throw new Error("The System returned an invalid Program log time")
  if (typeof record.process !== "string") throw new Error("The System returned an invalid Program log Process")
  if (record.source !== "client" && record.source !== "server") throw new Error("The System returned an invalid Program log source")
  if (typeof record.kind !== "string") throw new Error("The System returned an invalid Program log kind")
  if (typeof record.content !== "string") throw new Error("The System returned invalid Program log content")

  return Object.freeze({
    createdAt: record.createdAt,
    process: record.process,
    source: record.source,
    kind: record.kind,
    content: record.content
  })
}

/** Validate one System log record received from a runtime boundary. */
export function parseSystemLogRecord(value: unknown): SystemLogRecord {
  const record = object(value, "System log")

  if (!finite(record.createdAt)) throw new Error("The System returned an invalid System log time")
  if (record.level !== "debug" && record.level !== "info" && record.level !== "warning" && record.level !== "error") {
    throw new Error("The System returned an invalid System log level")
  }
  if (typeof record.source !== "string") throw new Error("The System returned an invalid System log source")
  if (typeof record.kind !== "string") throw new Error("The System returned an invalid System log kind")
  if (typeof record.content !== "string") throw new Error("The System returned invalid System log content")
  if (!json(record.data)) throw new Error("The System returned invalid System log data")

  return Object.freeze({
    createdAt: record.createdAt,
    level: record.level,
    source: record.source,
    kind: record.kind,
    content: record.content,
    data: record.data
  })
}

/** Endpoint kind capable of producing a captured log line. */
export type LogSource = "client" | "server"

/** Standard and application-defined kinds of captured output. */
export type LogKind =
  | "debug"
  | "log"
  | "info"
  | "warn"
  | "error"
  | "stdout"
  | "stderr"
  | "exit"
  | (string & {})

function object(value: unknown, domain: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`The System returned an invalid ${domain}`)
  return value as Record<string, unknown>
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function json(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true
  if (typeof value === "number") return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(json)
  if (!value || typeof value !== "object") return false
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return false
  return Object.values(value).every(json)
}
