// Type shim — Metro resolves `./haptics` to `./haptics.native.ts` or `./haptics.web.ts`.
// TypeScript resolves this file for type checking.

export declare const haptics: {
  /** Subtle click — grind tape steps, individual selections */
  tick: () => void;
  /** Mid-weight — upvotes, toggle default, timer stop */
  medium: () => void;
  /** Selection changed — item picked from a list */
  select: () => void;
  /** Completion — save, submit, equipment added */
  success: () => void;
  /** Failure — shown alongside an error message */
  error: () => void;
};
