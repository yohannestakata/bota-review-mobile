import { useAuth } from "@clerk/clerk-expo";
import { zodFormResolver } from "@/lib/zod-resolver";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import { ControlledTextArea } from "@/components/ui/form-field";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import {
  PhotoGrid,
  RatingInput,
  uploadReviewPhoto,
  useCreateReview,
  useReview,
  useUpdateReview,
  type PickedPhoto,
} from "@/features/branch";
import { getMyReviews } from "@/features/profile";
import { analytics } from "@/lib/analytics";
import { getErrorCode } from "@/lib/api";
import { colors } from "@/lib/theme";
import { useDiscardConfirm } from "@/lib/use-discard-confirm";

const MIN_CHARS = 20;
const MAX_CHARS = 2000;
const MAX_PHOTOS = 3;
const REVIEW_ALREADY_EXISTS = "REVIEW_ALREADY_EXISTS";

// Local midnight today — the latest selectable visit date (visits are past).
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatVisitDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const reviewSchema = z.object({
  rating: z.number().min(1, "Pick a rating"),
  text: z
    .string()
    .trim()
    .min(MIN_CHARS, `At least ${MIN_CHARS} characters`)
    .max(MAX_CHARS),
  visitDate: z.string().optional(),
});

type ReviewValues = z.infer<typeof reviewSchema>;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export default function WriteReviewScreen() {
  const {
    branchId,
    reviewId,
    rating: ratingParam,
    text: textParam,
  } = useLocalSearchParams<{
    branchId: string;
    reviewId?: string;
    rating?: string;
    text?: string;
  }>();
  const { getToken } = useAuth();
  const isEdit = Boolean(reviewId);
  const createReview = useCreateReview(branchId);
  const updateReview = useUpdateReview();
  // Edit mode is populated from the source of truth (GET /reviews/:id), with the
  // route params used only as instant placeholders until the fetch resolves.
  const existingReview = useReview(reviewId);

  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { control, handleSubmit, formState, reset, setValue } =
    useForm<ReviewValues>({
      resolver: zodFormResolver(reviewSchema),
      mode: "onChange",
      defaultValues: {
        rating: ratingParam ? Number(ratingParam) : 0,
        text: textParam ?? "",
        visitDate: undefined,
      },
    });

  const trimmedLength = useWatch({ control, name: "text" }).trim().length;
  const visitDate = useWatch({ control, name: "visitDate" });
  const busy = createReview.isPending || updateReview.isPending || uploading;

  // Hydrate the form once the canonical review loads (edit mode only).
  useEffect(() => {
    if (existingReview.data) {
      const r = existingReview.data;
      reset({
        rating: r.rating,
        text: r.text,
        visitDate: r.visitDate ? r.visitDate.slice(0, 10) : undefined,
      });
    }
  }, [existingReview.data, reset]);

  // review_started — the screen was actually reached (write or edit).
  useEffect(() => {
    if (branchId) {
      analytics.track("review_started", { branch_id: branchId });
    }
  }, [branchId]);

  const attemptClose = useDiscardConfirm(
    formState.isDirty || photos.length > 0,
  );

  async function pickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo access to add photos to your review.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      base64: true,
      mediaTypes: ["images"],
      quality: 0.8,
      selectionLimit: MAX_PHOTOS - photos.length,
    });

    if (!result.canceled) {
      const picked = result.assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        base64: asset.base64,
      }));
      setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
    }
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((photo) => photo.uri !== uri));
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && reviewId) {
        await updateReview.mutateAsync({
          reviewId,
          branchId,
          body: {
            rating: values.rating,
            text: values.text,
            ...(values.visitDate ? { visitDate: values.visitDate } : {}),
          },
        });
        analytics.track("review_submitted", {
          branch_id: branchId,
          rating: values.rating,
        });
        Alert.alert("All set!", "Your changes are saved.");
        router.back();
        return;
      }

      const review = await createReview.mutateAsync({
        rating: values.rating,
        text: values.text,
        ...(values.visitDate ? { visitDate: values.visitDate } : {}),
      });
      analytics.track("review_submitted", {
        branch_id: branchId,
        rating: values.rating,
      });

      let failed = 0;
      if (photos.length > 0) {
        setUploading(true);
        const results = await Promise.allSettled(
          photos.map((photo) =>
            uploadReviewPhoto(branchId, review.id, photo, getToken),
          ),
        );
        failed = results.filter((r) => r.status === "rejected").length;
      }

      Alert.alert(
        "You're a star!",
        failed > 0
          ? `Your review's in — but ${failed} photo(s) wouldn't upload.`
          : "Your review's in! It'll show up once it's approved.",
      );
      router.back();
    } catch (err) {
      // The user already has a review for this branch — send them to edit it
      // rather than leaving them stuck on a create form that can't succeed.
      if (getErrorCode(err) === REVIEW_ALREADY_EXISTS) {
        await routeToExistingReview();
        return;
      }
      Alert.alert("Couldn't post your review", getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  });

  async function routeToExistingReview() {
    try {
      const mine = await getMyReviews(getToken);
      const existing = mine.find(
        (r) => r.branchId === branchId && r.moderationStatus !== "archived",
      );
      if (existing) {
        Alert.alert(
          "You've already reviewed this place",
          "Want to edit your existing review instead?",
          [
            { text: "Not now", style: "cancel" },
            {
              text: "Edit review",
              onPress: () =>
                router.replace(`/review/${branchId}?reviewId=${existing.id}`),
            },
          ],
        );
        return;
      }
    } catch {
      // fall through to the generic message below
    }
    Alert.alert(
      "Already reviewed",
      "You've already reviewed this place. You can edit it from your profile.",
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3">
        <CloseButton onPress={attemptClose} />
        <ThemedText size="lg" weight="semibold">
          {isEdit ? "Edit review" : "Write a review"}
        </ThemedText>
        <View className="w-6" />
      </View>

      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-3">
            <ThemedText size="lg" weight="medium">
              How was it?
            </ThemedText>
            <Controller
              control={control}
              name="rating"
              render={({ field, fieldState }) => (
                <View className="gap-2">
                  <RatingInput onChange={field.onChange} value={field.value} />
                  {fieldState.error ? (
                    <ThemedText size="sm" tone="danger">
                      {fieldState.error.message}
                    </ThemedText>
                  ) : null}
                </View>
              )}
            />
          </View>

          <View className="gap-2">
            <ControlledTextArea
              control={control}
              inputClassName="min-h-40"
              label="Spill the details"
              maxLength={MAX_CHARS}
              name="text"
              placeholder="What did you order? How was the vibe?"
            />
            <ThemedText size="sm" tone="muted">
              {trimmedLength < MIN_CHARS
                ? `At least ${MIN_CHARS - trimmedLength} more characters`
                : `${trimmedLength}/${MAX_CHARS}`}
            </ThemedText>
          </View>

          <View className="gap-2">
            <ThemedText size="lg" weight="medium">
              When did you visit?
            </ThemedText>
            <View className="flex-row items-center gap-3">
              <Pressable
                className="flex-1 flex-row items-center gap-2 rounded-2xl border border-placeholder bg-surface px-4 py-3"
                onPress={() => setShowDatePicker(true)}
              >
                <AppIcon
                  color={colors.muted}
                  icon={Calendar03Icon}
                  size={18}
                />
                <ThemedText tone={visitDate ? "default" : "muted"}>
                  {visitDate ? formatVisitDate(visitDate) : "Optional"}
                </ThemedText>
              </Pressable>
              {visitDate ? (
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    setValue("visitDate", undefined, { shouldDirty: true })
                  }
                >
                  <ThemedText tone="muted" weight="medium">
                    Clear
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
            {showDatePicker ? (
              <DateTimePicker
                maximumDate={startOfToday()}
                mode="date"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (event.type === "set" && date) {
                    setValue("visitDate", toISODate(date), {
                      shouldDirty: true,
                    });
                  }
                }}
                value={visitDate ? new Date(visitDate) : startOfToday()}
              />
            ) : null}
          </View>

          {!isEdit ? (
            <View className="gap-2">
              <ThemedText size="lg" weight="medium">
                Add a few photos
              </ThemedText>
              <PhotoGrid
                canAdd={photos.length < MAX_PHOTOS}
                onAdd={pickPhotos}
                onRemove={removePhoto}
                photos={photos}
              />
            </View>
          ) : null}

        </ScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={!formState.isValid || busy}
            label={isEdit ? "Save changes" : "Submit review"}
            loading={busy}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
