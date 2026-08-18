/** The transport-neutral result of an operation that may fail. */
export type Outcome<Result = unknown> =
  | Readonly<{
    /** Indicates that the operation completed successfully. */
    success: true

    /** Value returned by the successful operation. */
    result: Result
  }>
  | Readonly<{
    /** Indicates that the operation failed. */
    success: false

    /** Transport-safe description of the failure. */
    error: string
  }>
