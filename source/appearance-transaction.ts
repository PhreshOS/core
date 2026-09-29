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

/** Explicit timing selected for a presentation operation. */
export type PresentationTransaction = number | AppearanceTransaction
