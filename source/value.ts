/** A pixel count or a relative linear expression. */
export type Value = number | string

/** A value reduced to one relative coefficient and one absolute offset. */
export interface RelativeValue {
  relative: number
  pixels: number
}

/**
 * Reduces a strict linear expression into `span * relative + pixels`.
 *
 * Numbers are absolute values. Percentages and `n/d` fractions are relative
 * values. Addition and subtraction combine terms; multiplication and division
 * scale the preceding term by a number. No arbitrary code or CSS is accepted.
 */
export function parseRelativeValue(input: unknown): RelativeValue | null {
  if (typeof input === "number") return Number.isFinite(input) ? { relative: 0, pixels: clean(input) } : null

  if (typeof input !== "string" || input.trim().length === 0) return null

  return new Reader(input).parse()
}

/** Returns whether a value belongs to the linear relative-value grammar. */
export function isRelativeValue(value: unknown): value is Value {
  return parseRelativeValue(value) !== null
}

class Reader {
  private position = 0
  private readonly source: string

  public constructor(source: string) {
    this.source = source
  }

  public parse(): RelativeValue | null {
    const value = { relative: 0, pixels: 0 }

    let direction = this.sign()

    while (this.position < this.source.length) {
      const term = this.term()

      if (!term) return null

      value.relative += term.relative * direction
      value.pixels += term.pixels * direction

      if (!finite(value)) return null

      this.space()

      if (this.position === this.source.length) return { relative: clean(value.relative), pixels: clean(value.pixels) }

      const operator = this.source[this.position]

      if (operator !== "+" && operator !== "-") return null

      this.position += 1
      direction = (operator === "+" ? 1 : -1) * this.sign()
    }

    return null
  }

  private term(): RelativeValue | null {
    const value = this.measurement()

    if (!value) return null

    while (true) {
      this.space()

      const operator = this.source[this.position]

      if (operator !== "*" && operator !== "/") return value

      this.position += 1

      const scalar = this.scalar()

      if (scalar === null || operator === "/" && scalar === 0) return null

      const factor = operator === "*" ? scalar : 1 / scalar

      value.relative *= factor
      value.pixels *= factor

      if (!finite(value)) return null
    }
  }

  private measurement(): RelativeValue | null {
    this.space()

    const remainder = this.source.slice(this.position)
    const fraction = remainder.match(/^(\d+(?:\.\d+)?|\.\d+)\s*\/\s*(\d+(?:\.\d+)?|\.\d+)(?![\d.])/)

    if (fraction) {
      const denominator = Number(fraction[2])

      if (!denominator) return null

      this.position += fraction[0].length

      return { relative: Number(fraction[1]) / denominator, pixels: 0 }
    }

    const percentage = remainder.match(/^(\d+(?:\.\d+)?|\.\d+)\s*%/)

    if (percentage) {
      this.position += percentage[0].length

      return { relative: Number(percentage[1]) / 100, pixels: 0 }
    }

    const number = this.number()

    return number === null ? null : { relative: 0, pixels: number }
  }

  private scalar() {
    const direction = this.sign()
    const value = this.number()

    return value === null ? null : value * direction
  }

  private number() {
    this.space()

    const number = this.source.slice(this.position).match(/^(\d+(?:\.\d+)?|\.\d+)/)?.[0]

    if (!number) return null

    this.position += number.length

    return Number(number)
  }

  private sign() {
    this.space()

    const sign = this.source[this.position]

    if (sign !== "+" && sign !== "-") return 1

    this.position += 1
    this.space()

    return sign === "-" ? -1 : 1
  }

  private space() {
    while (/\s/.test(this.source[this.position] ?? "")) this.position += 1
  }
}

function finite(value: RelativeValue) {
  return Number.isFinite(value.relative) && Number.isFinite(value.pixels)
}

function clean(value: number) {
  return Object.is(value, -0) ? 0 : value
}
