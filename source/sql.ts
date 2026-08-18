/** SQL access to a Program-owned database or its read-only logs. */
export interface ProgramSql {
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

/** One captured line from a Program endpoint. */
export type LogRecord = Readonly<{
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
