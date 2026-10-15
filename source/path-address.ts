/** A drive letter at the start of a Windows path, such as `C:` in `C:\Users`. */
const drive = /^[A-Za-z]:(?:[\\/]|$)/

/** A path's names as an address spells them: each one escaped, joined by `/`. */
const spelled = (names: readonly string[]) => names.map(encodeURIComponent).join("/")

/**
 * A path on the System's machine as an address, such as what to open: `/home/me` is
 * `file:///home/me`, `C:\Users\me` is `file:///C:/Users/me`, and a share, `\\server\share`, is
 * `file://server/share`. Another scheme names the same place for another opener, such as
 * `terminal:` for a shell there.
 */
export function addressOf(path: string, scheme = "file"): string {
  if (path.startsWith("\\\\")) {
    const [host = "", ...names] = path.slice(2).split(/[\\/]/)
    return `${scheme}://${host}/${spelled(names)}`
  }
  if (drive.test(path)) {
    const [letter, ...names] = path.split(/[\\/]/)
    return `${scheme}:///${letter!.toUpperCase()}/${spelled(names)}`
  }
  return `${scheme}://${spelled(path.split("/"))}`
}

/**
 * The path on the System's machine an address names, spelled as that machine spells it: the
 * reverse of `addressOf`, whatever its scheme. `null` when it names no path.
 */
export function pathOf(uri: string): string | null {
  if (!URL.canParse(uri)) return null
  const address = new URL(uri)
  const names = address.pathname.split("/").map(name => decodeURIComponent(name))
  const path = names.join("/")
  if (address.host !== "" && address.host !== "localhost") return `\\\\${address.host}${names.join("\\")}`
  if (/^\/[A-Za-z]:(?:\/|$)/.test(path)) {
    const windows = path.slice(1).replaceAll("/", "\\")
    return windows.length === 2 ? `${windows}\\` : windows
  }
  return path === "" ? null : path
}
