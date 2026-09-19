/** Stable timing curves accepted by Appearance transactions. */
export type Easing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | readonly [number, number, number, number]

/** Complete timing for one change in visual Appearance. */
export type AppearanceTransaction = Readonly<{
  duration: number
  easing: Easing
}>

/** Timing selected for a Window presentation operation. */
export type WindowTransaction = boolean | number | AppearanceTransaction
