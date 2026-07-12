import { useAuth } from "@clerk/clerk-expo";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button, ChipButton } from "@/components/ui/button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionTitle } from "@/components/ui/section-title";
import { ControlledTextInput } from "@/components/ui/form-field";
import { AppIcon } from "@/components/ui/huge-icon";
import { ControlledPhoneInput } from "@/components/ui/phone-input";
import { Switch } from "@/components/ui/switch";
import { ThemedText } from "@/components/ui/themed-text";
import { TimeField } from "@/components/ui/time-field";
import {
  uploadOwnerAvatar,
  uploadOwnerPhoto,
  removeOwnerPhoto,
  setOwnerPhotoCover,
  useBranch,
  useBranchMenus,
  useUpdateOwnerInfo,
  type BranchHours,
} from "@/features/branch";
import {
  LocationPinField,
  MenuField,
  type PinCoords,
  type SubmissionMenuItem,
} from "@/features/submissions";
import {
  useAmenities,
  useCuisines,
  useNeighborhoods,
  useTags,
} from "@/features/taxonomy";
import { zodFormResolver } from "@/lib/zod-resolver";
import { colors } from "@/lib/theme";
import { usePickImage } from "@/lib/use-pick-image";

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;
type DayKey = (typeof DAYS)[number][0];
type DayState = { isOpen: boolean; from: string; to: string };
type HoursState = Record<DayKey, DayState>;

function toHoursState(hours?: BranchHours | null): HoursState {
  return Object.fromEntries(
    DAYS.map(([day]) => {
      const slot = hours?.[day]?.[0];
      return [
        day,
        slot
          ? { isOpen: true, from: slot[0], to: slot[1] }
          : { isOpen: false, from: "09:00", to: "18:00" },
      ];
    }),
  ) as HoursState;
}

function fromHoursState(state: HoursState): BranchHours {
  return Object.fromEntries(
    DAYS.filter(([day]) => state[day].isOpen).map(([day]) => [
      day,
      [[state[day].from, state[day].to]],
    ]),
  );
}

const schema = z.object({
  label: z.string().trim().min(1, "Location name is required").max(120),
  addressText: z.string().trim().min(1, "Address is required").max(240),
  phone: z.string().trim().max(60).optional(),
});
type FormValues = z.infer<typeof schema>;

const PHOTO_GRID_GAP = 8;

function Choices({
  items,
  selected,
  onToggle,
}: {
  items: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => (
        <ChipButton
          key={item.id}
          label={item.name}
          onPress={() => onToggle(item.id)}
          selected={selected.includes(item.id)}
        />
      ))}
    </View>
  );
}

export default function ManageListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const pickImage = usePickImage();
  const branch = useBranch(id);
  const menus = useBranchMenus(id);
  const neighborhoods = useNeighborhoods();
  const cuisines = useCuisines();
  const tags = useTags();
  const amenities = useAmenities();
  const update = useUpdateOwnerInfo(id);
  const data = branch.data;

  const [hours, setHours] = useState<HoursState | null>(null);
  const [coords, setCoords] = useState<PinCoords | null | undefined>(undefined);
  const [neighborhoodId, setNeighborhoodId] = useState<
    string | null | undefined
  >(undefined);
  const [cuisineIds, setCuisineIds] = useState<string[] | null>(null);
  const [tagIds, setTagIds] = useState<string[] | null>(null);
  const [amenityIds, setAmenityIds] = useState<string[] | null>(null);
  const [menu, setMenu] = useState<SubmissionMenuItem[] | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  // Measured width of the photo grid row → square cells at 3 per row, full width.
  const [photoRowWidth, setPhotoRowWidth] = useState(0);
  const photoCell =
    photoRowWidth > 0 ? (photoRowWidth - PHOTO_GRID_GAP * 2) / 3 : 0;

  const resolvedHours = hours ?? toHoursState(data?.hours);
  const resolvedCoords =
    coords !== undefined
      ? coords
      : data?.latitude && data.longitude
        ? { lat: Number(data.latitude), lng: Number(data.longitude) }
        : null;
  const resolvedNeighborhood =
    neighborhoodId !== undefined
      ? neighborhoodId
      : (data?.neighborhood?.id ?? null);
  const resolvedCuisines =
    cuisineIds ?? data?.cuisines.map((item) => item.id) ?? [];
  const resolvedTags = tagIds ?? data?.tags.map((item) => item.id) ?? [];
  const resolvedAmenities =
    amenityIds ?? data?.amenities.map((item) => item.id) ?? [];
  const existingMenu: SubmissionMenuItem[] = (menus.data ?? []).flatMap(
    (group) =>
      group.items.map((item) => ({
        name: item.name,
        price: Number(item.price),
        ...(item.category ? { category: item.category } : {}),
        ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
        ...(item.cloudinaryPublicId
          ? { publicId: item.cloudinaryPublicId }
          : {}),
      })),
  );
  const officialPhotos = data?.photos.filter((photo) => !photo.reviewId) ?? [];

  const initialized = useRef(false);
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodFormResolver(schema),
    defaultValues: { label: "", addressText: "", phone: "" },
  });

  useEffect(() => {
    if (!data || initialized.current) return;
    initialized.current = true;
    reset({
      label: data.label ?? "",
      addressText: data.addressText ?? "",
      phone: data.phone ?? "",
    });
  }, [data, reset]);

  function toggle(
    current: string[],
    set: (value: string[]) => void,
    value: string,
  ) {
    set(
      current.includes(value)
        ? current.filter((id_) => id_ !== value)
        : [...current, value],
    );
  }

  function setDay(day: DayKey, patch: Partial<DayState>) {
    setHours((current) => {
      const base = current ?? toHoursState(data?.hours);
      return { ...base, [day]: { ...base[day], ...patch } };
    });
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        label: values.label.trim(),
        addressText: values.addressText.trim(),
        phone: values.phone?.trim() || null,
        hours: fromHoursState(resolvedHours),
        latitude: resolvedCoords ? String(resolvedCoords.lat) : null,
        longitude: resolvedCoords ? String(resolvedCoords.lng) : null,
        neighborhoodId: resolvedNeighborhood,
        cuisineIds: resolvedCuisines,
        tagIds: resolvedTags,
        amenityIds: resolvedAmenities,
        ...(menu !== null ? { menu } : {}),
      });
      Alert.alert("Nice, saved", "Your listing is up to date.");
      router.back();
    } catch {
      Alert.alert("Save hit a snag", "Try again in a moment.");
    }
  });

  async function pickAndUploadPhoto() {
    const result = await pickImage({ base64: true });
    if (result.status === "denied") {
      Alert.alert("Photo access needed", "Turn it on to add listing photos.");
      return;
    }
    if (result.status !== "picked") return;
    const photo = result.images[0];
    if (!photo) return;

    setUploadingPhoto(true);
    try {
      await uploadOwnerPhoto(id, photo, getToken);
      await branch.refetch();
      Alert.alert("Photo added", "Fresh shot, right on the listing.");
    } catch {
      Alert.alert("Upload hit a snag", "Give the photo another try.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function pickAndUploadAvatar() {
    const result = await pickImage({ base64: true });
    if (result.status === "denied") {
      Alert.alert("Photo access needed", "Turn it on to add a logo.");
      return;
    }
    if (result.status !== "picked") return;
    const image = result.images[0];
    if (!image) return;

    setUploadingAvatar(true);
    try {
      await uploadOwnerAvatar(id, image, getToken);
      await branch.refetch();
      Alert.alert("Logo updated", "It shows when you reply to reviews.");
    } catch {
      Alert.alert("Upload hit a snag", "Give it another try.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    setUploadingAvatar(true);
    try {
      await update.mutateAsync({ avatarUrl: null, avatarPublicId: null });
      await branch.refetch();
    } catch {
      Alert.alert("Couldn't remove", "Try again in a moment.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function makeCover(photoId: string) {
    try {
      await setOwnerPhotoCover(id, photoId, getToken);
      await branch.refetch();
    } catch {
      Alert.alert("Couldn't update cover", "Try again in a moment.");
    }
  }

  function confirmRemovePhoto(photoId: string) {
    Alert.alert("Remove this photo?", "It will leave the listing.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removeOwnerPhoto(id, photoId, getToken)
            .then(() => branch.refetch())
            .catch(() =>
              Alert.alert("Couldn't remove photo", "Try again in a moment."),
            );
        },
      },
    ]);
  }

  if (branch.isPending || !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.foreground} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenHeader title="Manage listing" />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-7 px-6 pb-10 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-3">
            <SectionTitle>Business logo</SectionTitle>
            <View className="flex-row items-center gap-4">
              <View className="size-20 items-center justify-center overflow-hidden rounded-full border border-placeholder bg-surface">
                {uploadingAvatar ? (
                  <ActivityIndicator color={colors.primary} />
                ) : data?.place.avatarUrl ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: data.place.avatarUrl }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <AppIcon color={colors.muted} icon={Add01Icon} size={24} />
                )}
              </View>
              <View className="flex-1 items-start gap-2">
                <Pressable
                  className="rounded-full border border-primary px-4 py-2"
                  disabled={uploadingAvatar}
                  onPress={pickAndUploadAvatar}
                >
                  <ThemedText size="sm" tone="brand" weight="medium">
                    {data?.place.avatarUrl ? "Change logo" : "Upload logo"}
                  </ThemedText>
                </Pressable>
                {data?.place.avatarUrl ? (
                  <Pressable
                    disabled={uploadingAvatar}
                    hitSlop={6}
                    onPress={removeAvatar}
                  >
                    <ThemedText size="sm" tone="muted">
                      Remove
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <ThemedText size="xs" tone="muted">
              Shown when you reply to reviews. Applies to all your locations.
            </ThemedText>
          </View>

          <View className="gap-3">
            <SectionTitle>Listing details</SectionTitle>
            <ControlledTextInput
              control={control}
              label="Location name"
              name="label"
              placeholder="e.g. Bole"
            />
            <ControlledTextInput
              control={control}
              label="Address"
              name="addressText"
              placeholder="Street and nearby landmark"
            />
            <LocationPinField onChange={setCoords} value={resolvedCoords} />
          </View>

          {neighborhoods.data?.length ? (
            <View className="gap-3">
              <SectionTitle>Neighborhood</SectionTitle>
              <View className="flex-row flex-wrap gap-2">
                {neighborhoods.data.map((item) => (
                  <ChipButton
                    key={item.id}
                    label={item.name}
                    onPress={() => setNeighborhoodId(item.id)}
                    selected={resolvedNeighborhood === item.id}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View className="gap-3">
            <SectionTitle>Contact</SectionTitle>
            <ControlledPhoneInput
              control={control}
              label="Phone number"
              name="phone"
            />
          </View>

          <View className="gap-3">
            <SectionTitle>Opening hours</SectionTitle>
            <View className="gap-2">
              {DAYS.map(([day, label]) => {
                const state = resolvedHours[day];
                return (
                  <View
                    key={day}
                    className="rounded-2xl border border-placeholder bg-surface p-3"
                  >
                    <View className="flex-row items-center justify-between">
                      <ThemedText weight="medium">{label}</ThemedText>
                      <View className="flex-row items-center gap-2">
                        {!state.isOpen ? (
                          <ThemedText size="sm" tone="muted">
                            Closed
                          </ThemedText>
                        ) : null}
                        <Switch
                          onValueChange={(isOpen) => setDay(day, { isOpen })}
                          value={state.isOpen}
                        />
                      </View>
                    </View>
                    {state.isOpen ? (
                      <View className="mt-2 flex-row items-center gap-2">
                        <TimeField
                          onChange={(from) => setDay(day, { from })}
                          value={state.from}
                        />
                        <ThemedText tone="muted">to</ThemedText>
                        <TimeField
                          onChange={(to) => setDay(day, { to })}
                          value={state.to}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          <View className="gap-3">
            <SectionTitle>Menu</SectionTitle>
            {menus.isPending ? (
              <ActivityIndicator color={colors.muted} />
            ) : (
              <MenuField onChange={setMenu} value={menu ?? existingMenu} />
            )}
          </View>

          {cuisines.data?.length ? (
            <View className="gap-3">
              <SectionTitle>Cuisines</SectionTitle>
              <Choices
                items={cuisines.data}
                selected={resolvedCuisines}
                onToggle={(value) =>
                  toggle(resolvedCuisines, setCuisineIds, value)
                }
              />
            </View>
          ) : null}
          {tags.data?.length ? (
            <View className="gap-3">
              <SectionTitle>Good for and tags</SectionTitle>
              <Choices
                items={tags.data}
                selected={resolvedTags}
                onToggle={(value) => toggle(resolvedTags, setTagIds, value)}
              />
            </View>
          ) : null}
          {amenities.data?.length ? (
            <View className="gap-3">
              <SectionTitle>Amenities</SectionTitle>
              <Choices
                items={amenities.data}
                selected={resolvedAmenities}
                onToggle={(value) =>
                  toggle(resolvedAmenities, setAmenityIds, value)
                }
              />
            </View>
          ) : null}

          <View className="gap-3">
            <SectionTitle>Listing photos</SectionTitle>
            <View
              className="flex-row flex-wrap"
              onLayout={(event) =>
                setPhotoRowWidth(event.nativeEvent.layout.width)
              }
              style={{ gap: PHOTO_GRID_GAP }}
            >
              {photoCell > 0 &&
                officialPhotos.map((photo) => (
                <View
                  key={photo.id}
                  className="overflow-hidden rounded-xl"
                  style={{ width: photoCell, height: photoCell }}
                >
                  <Image
                    contentFit="cover"
                    source={photo.url}
                    style={{ width: "100%", height: "100%" }}
                  />
                  {photo.isCover ? (
                    <View className="absolute bottom-1 left-1 rounded-full bg-surface px-2 py-0.5">
                      <ThemedText size="xs" weight="medium">
                        Cover
                      </ThemedText>
                    </View>
                  ) : (
                    <Pressable
                      className="absolute bottom-1 left-1 rounded-full bg-surface px-2 py-0.5"
                      onPress={() => void makeCover(photo.id)}
                    >
                      <ThemedText size="xs" weight="medium">
                        Set cover
                      </ThemedText>
                    </Pressable>
                  )}
                  <Pressable
                    className="absolute right-1 top-1 size-6 items-center justify-center rounded-full bg-black/60"
                    hitSlop={4}
                    onPress={() => confirmRemovePhoto(photo.id)}
                  >
                    <AppIcon
                      color={colors.inverse}
                      icon={Cancel01Icon}
                      size={12}
                    />
                  </Pressable>
                </View>
              ))}
              <Pressable
                className="items-center justify-center rounded-xl border border-placeholder bg-surface"
                disabled={uploadingPhoto}
                onPress={pickAndUploadPhoto}
                style={{ width: photoCell, height: photoCell }}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <View className="items-center gap-1">
                    <AppIcon color={colors.muted} icon={Add01Icon} size={22} />
                    <ThemedText size="xs" tone="muted">
                      Add photo
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
        <View className="px-6 pb-2 pt-2">
          <Button
            label="Save changes"
            loading={update.isPending}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
