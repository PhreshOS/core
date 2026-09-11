/** A value that has one stable JSON representation. */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>

/** Content accepted by capabilities that persist bytes. */
export type WritableContent =
  | JsonValue
  | Blob
  | ArrayBuffer
  | ArrayBufferView
  | ReadableStream<Uint8Array>
