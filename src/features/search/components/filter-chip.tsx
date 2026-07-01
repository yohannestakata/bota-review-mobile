import { ChipButton } from "@/components/ui/button";

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return <ChipButton label={label} onPress={onPress} selected={selected} />;
}
