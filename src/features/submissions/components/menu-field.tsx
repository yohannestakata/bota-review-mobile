import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

type Item = { id: string; name: string; price: string };

// Serializes filled items to a readable string for the submission note, e.g.
// "Macchiato — 90 Br, Burger — 250 Br".
function serialize(items: Item[]): string {
  return items
    .filter((item) => item.name.trim())
    .map((item) => {
      const price = item.price.trim();
      return price ? `${item.name.trim()} — ${price} Br` : item.name.trim();
    })
    .join(", ");
}

// Structured "menu or prices" editor: rows of item name + price you can add and
// remove, instead of a single free-text box.
export function MenuField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  const idRef = useRef(1);
  const makeItem = (): Item => ({
    id: String(idRef.current++),
    name: "",
    price: "",
  });
  const [items, setItems] = useState<Item[]>(() => [makeItem()]);

  // Reset when the form clears the field (e.g. after submit).
  useEffect(() => {
    if (value === "") setItems([makeItem()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function apply(next: Item[]) {
    setItems(next);
    onChangeText(serialize(next));
  }

  function setItem(id: string, patch: Partial<Item>) {
    apply(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    const next = items.filter((item) => item.id !== id);
    apply(next.length ? next : [makeItem()]);
  }

  return (
    <View className="gap-2">
      <ThemedText size="sm" weight="medium">
        Menu or prices
      </ThemedText>

      <View className="gap-2">
        {items.map((item) => (
          <View className="flex-row items-center gap-2" key={item.id}>
            <TextInput
              className="h-11 flex-1 rounded-xl border border-placeholder bg-background px-3 font-outfit text-md text-foreground"
              onChangeText={(name) => setItem(item.id, { name })}
              placeholder="Item, e.g. Macchiato"
              placeholderTextColor={colors.muted}
              value={item.name}
            />
            <View className="h-11 w-24 flex-row items-center rounded-xl border border-placeholder bg-background px-3">
              <TextInput
                className="flex-1 py-0 font-outfit text-md text-foreground"
                keyboardType="number-pad"
                onChangeText={(price) =>
                  setItem(item.id, { price: price.replace(/\D/g, "") })
                }
                placeholder="0"
                placeholderTextColor={colors.muted}
                value={item.price}
              />
              <ThemedText size="sm" tone="muted">
                Br
              </ThemedText>
            </View>
            {items.length > 1 ? (
              <Pressable hitSlop={6} onPress={() => removeItem(item.id)}>
                <AppIcon color={colors.muted} icon={Cancel01Icon} size={18} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <Pressable
        className="flex-row items-center gap-1.5 self-start"
        hitSlop={6}
        onPress={() => apply([...items, makeItem()])}
      >
        <AppIcon color={colors.foreground} icon={Add01Icon} size={16} />
        <ThemedText size="sm" weight="medium">
          Add item
        </ThemedText>
      </Pressable>
    </View>
  );
}
