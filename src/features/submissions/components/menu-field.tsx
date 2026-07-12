import { useAuth } from "@clerk/clerk-expo";
import {
  Add01Icon,
  Cancel01Icon,
  ImageAdd01Icon,
} from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { ChipButton } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/huge-icon";
import { TextField } from "@/components/ui/text-field";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";
import { usePickImage } from "@/lib/use-pick-image";

import { uploadSubmissionPhoto, type SubmissionMenuItem } from "../api";

type Item = {
  id: string;
  name: string;
  price: string;
  category: string;
  customCategory: boolean;
  imageUrl?: string;
  publicId?: string;
  photoIsNew?: boolean;
  uploading?: boolean;
};

const CATEGORIES = ["Starters", "Mains", "Sides", "Desserts", "Drinks"];

let nextItemId = 1;

function itemId() {
  return String(nextItemId++);
}

// Structured items for the submission (only rows with a name).
function toItems(items: Item[]): SubmissionMenuItem[] {
  return items
    .filter((item) => item.name.trim())
    .map((item) => {
      const next: SubmissionMenuItem = { name: item.name.trim() };
      if (item.category.trim()) next.category = item.category.trim();
      const price = item.price.trim();
      if (price) next.price = Number(price);
      if (item.imageUrl && item.publicId) {
        next.imageUrl = item.imageUrl;
        next.publicId = item.publicId;
        if (item.photoIsNew) next.photoIsNew = true;
      }
      return next;
    });
}

// Structured "menu or prices" editor: rows of item photo + name + price you can
// add and remove. Emits SubmissionMenuItem[].
export function MenuField({
  value,
  onChange,
  label = "Menu or prices",
  singleItem = false,
}: {
  value: SubmissionMenuItem[];
  onChange: (value: SubmissionMenuItem[]) => void;
  label?: string;
  singleItem?: boolean;
}) {
  const { getToken } = useAuth();
  const pick = usePickImage();
  const makeItem = (): Item => ({
    id: itemId(),
    name: "",
    price: "",
    category: "",
    customCategory: false,
  });
  const [items, setItems] = useState<Item[]>(() =>
    value.length
      ? value.map((item) => ({
          id: itemId(),
          name: item.name,
          price: item.price == null ? "" : String(item.price),
          category: item.category ?? "",
          customCategory: Boolean(
            item.category && !CATEGORIES.includes(item.category),
          ),
          imageUrl: item.imageUrl,
          publicId: item.publicId,
          photoIsNew: item.photoIsNew,
        }))
      : [makeItem()],
  );
  // Mirror of items so async photo uploads apply against the latest rows.
  const itemsRef = useRef(items);
  // The last structured value we emitted, so we can tell a real external reset
  // (parent cleared the field) apart from our own emit of a nameless row —
  // otherwise adding a photo before a name would wipe the row.
  const lastEmitted = useRef<SubmissionMenuItem[]>(value);

  // Reset only when the form clears the field externally (e.g. after submit).
  useEffect(() => {
    if (value.length === 0 && lastEmitted.current.length > 0) {
      const fresh = [makeItem()];
      itemsRef.current = fresh;
      lastEmitted.current = [];
      setItems(fresh);
    }
  }, [value]);

  function apply(next: Item[]) {
    const emitted = toItems(next);
    itemsRef.current = next;
    lastEmitted.current = emitted;
    setItems(next);
    onChange(emitted);
  }

  function setItem(id: string, patch: Partial<Item>) {
    apply(
      itemsRef.current.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeItem(id: string) {
    const next = itemsRef.current.filter((item) => item.id !== id);
    apply(next.length ? next : [makeItem()]);
  }

  async function pickImage(id: string) {
    const result = await pick({ base64: true });
    if (result.status !== "picked") return;
    const image = result.images[0];
    if (!image) return;

    setItem(id, { uploading: true });
    try {
      const uploaded = await uploadSubmissionPhoto(image, getToken);
      setItem(id, {
        imageUrl: uploaded.url,
        publicId: uploaded.publicId,
        photoIsNew: true,
        uploading: false,
      });
    } catch {
      setItem(id, { uploading: false });
    }
  }

  return (
    <View className="gap-2">
      <ThemedText size="sm" weight="medium">
        {label}
      </ThemedText>

      <View className="gap-2">
        {items.map((item, index) => (
          <View
            className={`gap-2 pb-3 ${index > 0 ? "border-t border-border pt-3" : ""}`}
            key={item.id}
          >
            <View className="flex-row items-center gap-2">
              <Pressable
                className="h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-placeholder bg-background"
                disabled={item.uploading}
                onPress={() => pickImage(item.id)}
              >
                {item.uploading ? (
                  <ActivityIndicator color={colors.muted} size="small" />
                ) : item.imageUrl ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: item.imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <AppIcon
                    color={colors.muted}
                    icon={ImageAdd01Icon}
                    size={20}
                  />
                )}
              </Pressable>
              <TextField
                className="flex-1"
                onChangeText={(name) => setItem(item.id, { name })}
                placeholder="Item, e.g. Macchiato"
                surface="muted"
                value={item.name}
              />
              <TextField
                className="w-24"
                keyboardType="number-pad"
                onChangeText={(price) =>
                  setItem(item.id, { price: price.replace(/\D/g, "") })
                }
                placeholder="0"
                suffix={
                  <ThemedText size="sm" tone="muted">
                    Br
                  </ThemedText>
                }
                surface="muted"
                value={item.price}
              />
              {!singleItem && items.length > 1 ? (
                <Pressable hitSlop={6} onPress={() => removeItem(item.id)}>
                  <AppIcon color={colors.muted} icon={Cancel01Icon} size={18} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              contentContainerClassName="gap-2"
              horizontal
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
            >
              {CATEGORIES.map((category) => (
                <ChipButton
                  key={category}
                  label={category}
                  onPress={() =>
                    setItem(item.id, { category, customCategory: false })
                  }
                  selected={!item.customCategory && item.category === category}
                />
              ))}
              <ChipButton
                label="Other"
                onPress={() =>
                  setItem(item.id, {
                    category: item.customCategory ? item.category : "",
                    customCategory: true,
                  })
                }
                selected={item.customCategory}
              />
            </ScrollView>

            {item.customCategory ? (
              <TextField
                onChangeText={(category) => setItem(item.id, { category })}
                placeholder="Custom category"
                surface="muted"
                value={item.category}
              />
            ) : null}
          </View>
        ))}
      </View>

      {!singleItem ? (
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
      ) : null}
    </View>
  );
}
