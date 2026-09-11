import { describe, expectTypeOf, it } from "vitest"
import {
  Storage,
  StorageFile,
  type StorageListOptions,
  type StorageReadOptions,
  type StorageTransferOptions,
  type StorageWatchOptions,
  type StorageWriteOptions,
  type WritableContent
} from "../source/main.js"

describe("Storage", function () {
  it("separates directory selection from file access", function () {
    expectTypeOf<ReturnType<Storage["navigate"]>>().toEqualTypeOf<Storage>()
    expectTypeOf<Parameters<Storage["file"]>>().toEqualTypeOf<[string, ...string[]]>()
    expectTypeOf<ReturnType<Storage["file"]>>().toEqualTypeOf<StorageFile>()
    expectTypeOf<Parameters<Storage["list"]>>().toEqualTypeOf<[options?: StorageListOptions]>()
    expectTypeOf<Parameters<Storage["watch"]>>().toEqualTypeOf<[options?: StorageWatchOptions]>()
  })

  it("puts content operations only on StorageFile", function () {
    expectTypeOf<Parameters<StorageFile["bytes"]>>().toEqualTypeOf<[options?: StorageReadOptions]>()
    expectTypeOf<Parameters<StorageFile["text"]>>().toEqualTypeOf<[options?: StorageReadOptions]>()
    expectTypeOf<Parameters<StorageFile["write"]>>().toEqualTypeOf<[content: WritableContent, options?: StorageWriteOptions]>()
    expectTypeOf<Parameters<StorageFile["append"]>>().toEqualTypeOf<[content: WritableContent]>()
    expectTypeOf<Parameters<StorageFile["copy"]>>().toEqualTypeOf<[destination: StorageFile, options?: StorageTransferOptions]>()
  })
})
