/** A capability that can be viewed with one caller-selected deadline. */
export interface Timeoutable<Timed> {
  /** Returns an immutable view whose asynchronous operation uses this deadline. */
  timeout(milliseconds: number): Timed
}
