import { describe, expect, it } from "vitest"
import { addressOf, pathOf } from "../source/main.js"

describe("paths as addresses", () => {
  it("spells a Unix path as a file address and back", () => {
    expect(addressOf("/home/me/My Notes.txt")).toBe("file:///home/me/My%20Notes.txt")
    expect(addressOf("/")).toBe("file:///")
    expect(pathOf("file:///home/me/My%20Notes.txt")).toBe("/home/me/My Notes.txt")
    expect(pathOf("file:///")).toBe("/")
  })

  it("spells a Windows path as a file address and back", () => {
    expect(addressOf("C:\\Users\\me\\Desktop")).toBe("file:///C:/Users/me/Desktop")
    expect(addressOf("c:\\")).toBe("file:///C:/")
    expect(pathOf("file:///C:/Users/me/Desktop")).toBe("C:\\Users\\me\\Desktop")
    expect(pathOf("file:///C:/")).toBe("C:\\")
    expect(pathOf("file:///C:")).toBe("C:\\")
  })

  it("spells a Windows share with its server as the host", () => {
    expect(addressOf("\\\\server\\share\\a b")).toBe("file://server/share/a%20b")
    expect(pathOf("file://server/share/a%20b")).toBe("\\\\server\\share\\a b")
  })

  it("names the same place under another scheme", () => {
    expect(addressOf("/home/me", "terminal")).toBe("terminal:///home/me")
    expect(addressOf("C:\\Users\\me", "terminal")).toBe("terminal:///C:/Users/me")
    expect(pathOf("terminal:///C:/Users/me")).toBe("C:\\Users\\me")
    expect(pathOf("terminal:///home/me")).toBe("/home/me")
  })

  it("names no path for what is not an address", () => {
    expect(pathOf("not an address")).toBeNull()
  })
})
