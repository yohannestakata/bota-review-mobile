import { View } from "react-native";

import { ChipButton } from "@/components/ui/button";

export type ChipOption = { value: string; label: string };

// A wrapping row of selectable chips over a multi-select value. Owns the
// add/remove toggle so call sites stop re-implementing the includes/filter
// dance (and its off-by-one bugs). Pass RHF `field.value`/`field.onChange`
// directly, or a plain `string[]` + setter.
export function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: readonly ChipOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option.value);
        return (
          <ChipButton
            key={option.value}
            label={option.label}
            onPress={() =>
              onChange(
                selected
                  ? value.filter((item) => item !== option.value)
                  : [...value, option.value],
              )
            }
            selected={selected}
          />
        );
      })}
    </View>
  );
}
