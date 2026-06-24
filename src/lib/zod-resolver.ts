import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

// @hookform/resolvers@5's type overloads reference `zod/v4/core`, which pnpm
// resolves to the zod copy Expo's CLI tooling pulls in (3.x, core "minor 0")
// rather than the app's zod 4.x (core "minor 4"). That version skew breaks
// TypeScript overload resolution even though the runtime resolver handles zod 4
// correctly. Wrapping it once gives every form a correctly-typed resolver.
export function zodFormResolver<T extends FieldValues>(
  schema: ZodType<T>,
): Resolver<T> {
  return zodResolver(schema as never) as Resolver<T>;
}
