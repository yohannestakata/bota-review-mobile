import { zodFormResolver } from "@/lib/zod-resolver";
import { Add01Icon, Cancel01Icon, Image01Icon } from "@hugeicons/core-free-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import { ControlledTextInput } from "@/components/ui/form-field";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import {
  uploadOwnerPhoto,
  useBranch,
  useUpdateOwnerInfo,
  type BranchHours,
  type PickedPhoto,
} from "@/features/branch";
import { colors } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type DayKey = (typeof DAY_KEYS)[number];
const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

type DayState = { isOpen: boolean; from: string; to: string };
type HoursState = Record<DayKey, DayState>;

function toHoursState(hours: BranchHours | null | undefined): HoursState {
  return DAY_KEYS.reduce(
    (acc, day) => {
      const slots = hours?.[day] as [string, string][] | undefined;
      acc[day] = slots?.length
        ? { isOpen: true, from: slots[0][0], to: slots[0][1] }
        : { isOpen: false, from: "09:00", to: "22:00" };
      return acc;
    },
    {} as HoursState,
  );
}

function fromHoursState(state: HoursState): BranchHours {
  return Object.fromEntries(
    Object.entries(state)
      .filter(([, { isOpen }]) => isOpen)
      .map(([day, { from, to }]) => [day, [[from, to]] as [string, string][]]),
  );
}

const schema = z.object({
  phone: z.string().trim().max(60).optional(),
});
type FormValues = z.infer<typeof schema>;

function SectionTitle({ title }: { title: string }) {
  return (
    <ThemedText size="lg" weight="semibold">
      {title}
    </ThemedText>
  );
}

export default function ManageListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const branch = useBranch(id);
  const update = useUpdateOwnerInfo(id);

  const [hoursState, setHoursState] = useState<HoursState | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const data = branch.data;

  // Lazily initialise hours state from the fetched branch (only once).
  const resolvedHours: HoursState =
    hoursState ?? (data ? toHoursState(data.hours) : toHoursState(null));

  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodFormResolver(schema),
    values: { phone: data?.phone ?? "" },
  });

  function setDay(day: DayKey, patch: Partial<DayState>) {
    setHoursState((prev) => {
      const base = prev ?? toHoursState(data?.hours);
      return { ...base, [day]: { ...base[day], ...patch } };
    });
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        phone: values.phone?.trim() || null,
        hours: fromHoursState(resolvedHours),
      });
      Alert.alert("Saved", "Your listing has been updated.");
      router.back();
    } catch {
      Alert.alert("Couldn't save", "Something went wrong. Please try again.");
    }
  });

  async function pickAndUploadPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to add photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: false,
      base64: true,
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const photo: PickedPhoto = {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      base64: asset.base64,
    };

    setUploadingPhoto(true);
    try {
      await uploadOwnerPhoto(id, photo, getToken);
      await branch.refetch();
      Alert.alert("Photo added", "Your photo is now live on the listing.");
    } catch {
      Alert.alert("Upload failed", "Couldn't upload the photo. Try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  if (branch.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-4 py-3">
          <CloseButton onPress={() => router.back()} />
          <ThemedText size="lg" weight="semibold">Manage listing</ThemedText>
          <View className="w-6" />
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.foreground} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3">
        <CloseButton onPress={() => router.back()} />
        <ThemedText size="lg" weight="semibold">Manage listing</ThemedText>
        <View className="w-6" />
      </View>

      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-6 pt-2 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          {/* Contact */}
          <View className="gap-3">
            <SectionTitle title="Contact" />
            <ControlledTextInput
              control={control}
              keyboardType="phone-pad"
              label="Phone number"
              name="phone"
              placeholder="+251 911 000 000"
            />
          </View>

          {/* Hours */}
          <View className="gap-3">
            <SectionTitle title="Opening hours" />
            <View className="gap-2">
              {DAY_KEYS.map((day) => {
                const state = resolvedHours[day];
                return (
                  <View
                    key={day}
                    className="rounded-2xl border border-placeholder bg-surface p-4"
                  >
                    <View className="flex-row items-center justify-between">
                      <ThemedText weight="medium">{DAY_LABELS[day]}</ThemedText>
                      <Switch
                        onValueChange={(value) => setDay(day, { isOpen: value })}
                        thumbColor={colors.inverse}
                        trackColor={{ false: colors.border, true: colors.foreground }}
                        value={state.isOpen}
                      />
                    </View>
                    {state.isOpen ? (
                      <View className="mt-3 flex-row items-center gap-3">
                        <View className="flex-1">
                          <ThemedText className="mb-1" size="xs" tone="muted">Opens</ThemedText>
                          <TextInput
                            className="h-10 rounded-xl border border-placeholder bg-background px-3 font-outfit text-sm text-foreground"
                            maxLength={5}
                            onChangeText={(v) => setDay(day, { from: v })}
                            placeholder="09:00"
                            placeholderTextColor={colors.muted}
                            value={state.from}
                          />
                        </View>
                        <View className="flex-1">
                          <ThemedText className="mb-1" size="xs" tone="muted">Closes</ThemedText>
                          <TextInput
                            className="h-10 rounded-xl border border-placeholder bg-background px-3 font-outfit text-sm text-foreground"
                            maxLength={5}
                            onChangeText={(v) => setDay(day, { to: v })}
                            placeholder="22:00"
                            placeholderTextColor={colors.muted}
                            value={state.to}
                          />
                        </View>
                      </View>
                    ) : (
                      <ThemedText className="mt-1" size="sm" tone="muted">Closed</ThemedText>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Official photos */}
          <View className="gap-3">
            <SectionTitle title="Official photos" />
            <View className="flex-row flex-wrap gap-2">
              {data?.photos.map((photo) => (
                <View
                  key={photo.id}
                  className="overflow-hidden rounded-xl"
                  style={{ width: 100, height: 100 }}
                >
                  <Image
                    contentFit="cover"
                    source={{ uri: photo.url }}
                    style={{ width: 100, height: 100 }}
                  />
                </View>
              ))}
              <Pressable
                className="items-center justify-center rounded-xl border border-placeholder bg-surface"
                disabled={uploadingPhoto}
                onPress={pickAndUploadPhoto}
                style={{ width: 100, height: 100 }}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color={colors.muted} />
                ) : (
                  <View className="items-center gap-1">
                    <AppIcon color={colors.muted} icon={Add01Icon} size={22} />
                    <ThemedText size="xs" tone="muted">Add photo</ThemedText>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={update.isPending}
            label="Save changes"
            loading={update.isPending}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
