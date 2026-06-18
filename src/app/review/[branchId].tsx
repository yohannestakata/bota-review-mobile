import { useAuth } from "@clerk/clerk-expo";
import { colors } from "@/lib/theme";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { FormTextArea } from "@/components/ui/form-field";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import {
  PhotoGrid,
  RatingInput,
  uploadReviewPhoto,
  useCreateReview,
  useUpdateReview,
  type PickedPhoto,
} from "@/features/branch";

const MIN_CHARS = 20;
const MAX_CHARS = 2000;
const MAX_PHOTOS = 5;

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

  const [rating, setRating] = useState(() =>
    ratingParam ? Number(ratingParam) : 0,
  );
  const [text, setText] = useState(textParam ?? "");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const trimmed = text.trim();
  const busy = createReview.isPending || updateReview.isPending || uploading;
  const canSubmit = rating >= 1 && trimmed.length >= MIN_CHARS && !busy;

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
      }));
      setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
    }
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((photo) => photo.uri !== uri));
  }

  async function onSubmit() {
    if (!canSubmit) {
      return;
    }

    setError("");

    try {
      if (isEdit && reviewId) {
        await updateReview.mutateAsync({
          reviewId,
          branchId,
          body: { rating, text: trimmed },
        });
        Alert.alert("All set!", "Your changes are saved.");
        router.back();
        return;
      }

      const review = await createReview.mutateAsync({ rating, text: trimmed });

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
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <AppIcon color={colors.foreground} icon={Cancel01Icon} size={24} />
        </Pressable>
        <ThemedText size="lg" weight="semibold">
          {isEdit ? "Edit review" : "Write a review"}
        </ThemedText>
        <View className="w-6" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-3">
            <ThemedText size="lg" weight="medium">
              How was it?
            </ThemedText>
            <RatingInput onChange={setRating} value={rating} />
          </View>

          <View className="gap-2">
            <FormTextArea
              inputClassName="min-h-40 bg-neutral-100"
              label="Spill the details"
              maxLength={MAX_CHARS}
              onChangeText={setText}
              placeholder="What did you order? How was the vibe?"
              value={text}
            />
            <ThemedText size="sm" tone="muted">
              {trimmed.length < MIN_CHARS
                ? `At least ${MIN_CHARS - trimmed.length} more characters`
                : `${trimmed.length}/${MAX_CHARS}`}
            </ThemedText>
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

          {error ? (
            <ThemedText size="sm" tone="brand">
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={!canSubmit}
            label={isEdit ? "Save changes" : "Submit review"}
            loading={busy}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
