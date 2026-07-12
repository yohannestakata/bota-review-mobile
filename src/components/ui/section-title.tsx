import { ThemedText } from "@/components/ui/themed-text";

// A section heading used across detail/manage screens. `className` lets the
// caller own layout (e.g. `px-6` on the edge-to-edge branch screen) while the
// type styling stays consistent everywhere.
export function SectionTitle({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <ThemedText className={className} size="xl" weight="bold">
      {children}
    </ThemedText>
  );
}
