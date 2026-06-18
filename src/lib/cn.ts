import { twJoin, twMerge } from "tailwind-merge";

type ClassNameValue = Parameters<typeof twJoin>[number];

export function cn(...inputs: ClassNameValue[]) {
  return twMerge(twJoin(inputs));
}
