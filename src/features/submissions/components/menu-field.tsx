import { useAuth } from "@clerk/clerk-expo";
import {
  Add01Icon,
  Cancel01Icon,
  ImageAdd01Icon,
} from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { TextField } from "@/components/ui/text-field";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

import { uploadSubmissionPhoto, type SubmissionMenuItem } from "../api";

type Item = {
  id: string;
  name: string;
  price: string;
  imageUrl?: string;
  publicId?: string;
  uploading?: boolean;
};

// Structured items for the submission (only rows with a name).
function toItems(items: Item[]): SubmissionMenuItem[] {
  return items
    .filter((item) => item.name.trim())
    .map((item) => {
      const next: SubmissionMenuItem = { name: item.name.trim() };
      const price = item.price.trim();
      if (price) next.price = Number(price);
      if (item.imageUrl && item.publicId) {
        next.imageUrl = item.imageUrl;
        next.publicId = item.publicId;
      }
      return next;
    });
}

// Structured "menu or prices" editor: rows of item photo + name + price you can
// add and remove. Emits SubmissionMenuItem[].
export function MenuField({
  value,
  onChange,
}: {
  value: SubmissionMenuItem[];
  onChange: (value: SubmissionMenuItem[]) => void;
}) {
  const { getToken } = useAuth();
  const idRef = useRef(1);
  const makeItem = (): Item => ({
    id: String(idRef.current++),
    name: "",
    price: "",
  });
  const [items, setItems] = useState<Item[]>(() => [makeItem()]);
  // Mirror of items so async photo uploads apply against the latest rows.
  const itemsRef = useRef(items);
  // The last structured value we emitted, so we can tell a real external reset
  // (parent cleared the field) apart from our own emit of a nameless row —
  // otherwise adding a photo before a name would wipe the row.
  const lastEmitted = useRef<SubmissionMenuItem[]>([]);

  // Reset only when the form clears the field externally (e.g. after submit).
  useEffect(() => {
    if (value.length === 0 && lastEmitted.current.length > 0) {
      const fresh = [makeItem()];
      itemsRef.current = fresh;
      lastEmitted.current = [];
      setItems(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setItem(id, { uploading: true });
    try {
      const uploaded = await uploadSubmissionPhoto(
        {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          base64: asset.base64,
        },
        getToken,
      );
      setItem(id, {
        imageUrl: uploaded.url,
        publicId: uploaded.publicId,
        uploading: false,
      });
    } catch {
      setItem(id, { uploading: false });
    }
  }

  return (
    <View className="gap-2">
      <ThemedText size="sm" weight="medium">
        Menu or prices
      </ThemedText>

      <View className="gap-2">
        {items.map((item) => (
          <View className="flex-row items-center gap-2" key={item.id}>
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
                <AppIcon color={colors.muted} icon={ImageAdd01Icon} size={20} />
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
