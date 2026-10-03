import { useAuth } from "@clerk/clerk-expo";
import { zodFormResolver } from "@/lib/zod-resolver";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { View } from "react-native";
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
} from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { Button, TextButton } from "@/components/ui/button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { ControlledTextArea } from "@/components/ui/form-field";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import {
  branchKeys,
  getBranch,
  PhotoPicker,
  RatingInput,
  ReviewCelebration,
  defaultPhotoCategory,
  uploadReviewPhoto,
  useCreateReview,
  useReview,
  useUpdateReview,
  type PickedPhoto,
} from "@/features/branch";
import { useSaves } from "@/features/home";
import {
  getMyMilestones,
  getMyReviews,
  MilestoneMedallion,
  useMyReviews,
  useSeenMilestones,
} from "@/features/profile";
import { analytics } from "@/lib/analytics";
import { getErrorCode, getErrorMessage } from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { promptAndRegisterPush } from "@/lib/push-registration";
import { usePickImage } from "@/lib/use-pick-image";
import { useColors } from "@/lib/theme";
import { useDiscardConfirm } from "@/lib/use-discard-confirm";
import {
  clearReviewDraft,
  hasDraftContent,
  loadReviewDraft,
  saveReviewDraft,
} from "@/features/branch/review-draft";
import { PressableFade } from "@/components/ui/pressable-scale";
import {
  DEFAULT_PHOTO_CATEGORIES,
  usePhotoCategories,
} from "@/features/taxonomy";

const MIN_CHARS = 20;
const MAX_CHARS = 2000;
const MAX_PHOTOS = 3;
const REVIEW_ALREADY_EXISTS = "REVIEW_ALREADY_EXISTS";
// Badges that writing a review can unlock (see backend milestones.ts).
const REVIEW_MILESTONES = new Set([
  "first_review",
  "first_photo",
  "reviews_5",
  "neighborhoods_3",
  "reviews_10",
]);

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

type PostedReview = {
  reviewId: string;
  newBadge?: ComponentProps<typeof ReviewCelebration>["newBadge"];
  rating: number;
  placeName?: string;
  pendingModeration: boolean;
  failed: PickedPhoto[];
  reviewNumber?: number;
  reviewedBranchIds: Set<string>;
};

export default function WriteReviewScreen() {
  const colors = useColors();
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
  const { getToken, userId } = useAuth();
  const pickImage = usePickImage();
  const photoCategories = usePhotoCategories();
  const isEdit = Boolean(reviewId);
  const createReview = useCreateReview(branchId);
  const updateReview = useUpdateReview();
  // Edit mode is populated from the source of truth (GET /reviews/:id), with the
  // route params used only as instant placeholders until the fetch resolves.
  const existingReview = useReview(reviewId);
  // The place being reviewed, shown under the title so it's never unclear
  // (usually cached from the place page).
  const place = useQuery({
    queryKey: branchKeys.detail(branchId),
    queryFn: () => getBranch(branchId, getToken),
    enabled: Boolean(branchId),
  });

  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posted, setPosted] = useState<PostedReview | null>(null);
  const [retryingPhotos, setRetryingPhotos] = useState(false);
  const queryClient = useQueryClient();
  const saves = useSaves();
  const seenMilestones = useSeenMilestones();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { control, handleSubmit, formState, reset, setValue } =
    useForm<ReviewValues>({
      resolver: zodFormResolver(reviewSchema),
      mode: "onSubmit",
      defaultValues: {
        rating: ratingParam ? Number(ratingParam) : 0,
        text: textParam ?? "",
        visitDate: undefined,
      },
    });

  const rating = useWatch({ control, name: "rating" });
  const text = useWatch({ control, name: "text" });
  const trimmedLength = text.trim().length;
  const visitDate = useWatch({ control, name: "visitDate" });
  const busy = createReview.isPending || updateReview.isPending || uploading;
  const textError = formState.errors.text?.message;

  // Hydrate the form exactly once when the canonical review loads (edit mode).
  // The ref guard stops a slow/refetched response from clobbering edits already
  // in progress — otherwise a late fetch would reset() over the user's typing.
  // GET /reviews/:id only serves published reviews, so a review still
  // awaiting a check (or sent back) is filled from your own review list.
  const myReviews = useMyReviews();
  const ownCopy = isEdit
    ? myReviews.data?.find((r) => r.id === reviewId)
    : undefined;
  const source = existingReview.data ?? ownCopy;
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (source && !hydratedRef.current) {
      hydratedRef.current = true;
      const r = source;
      reset({
        rating: r.rating,
        text: r.text,
        visitDate: r.visitDate ? r.visitDate.slice(0, 10) : undefined,
      });
    }
  }, [source, reset]);

  // review_started — the screen was actually reached (write or edit).
  useEffect(() => {
    if (branchId) {
      analytics.track("review_started", { branch_id: branchId });
    }
  }, [branchId]);

  // Drafts: a new review autosaves on the device as it's written, so closing
  // the screen (or the app) never loses it. Edits have the server copy.
  const draftUser = !isEdit ? userId : null;
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);
  const hasContent = hasDraftContent({ rating, text, visitDate, photos });

  useEffect(() => {
    if (!draftUser) return;
    let cancelled = false;
    void loadReviewDraft(draftUser, branchId).then((saved) => {
      if (cancelled) return;
      if (saved) {
        reset(
          {
            // A star picked on the way in (quick-rate) beats the draft's.
            rating: ratingParam ? Number(ratingParam) : saved.draft.rating,
            text: saved.draft.text,
            visitDate: saved.draft.visitDate,
          },
          { keepDefaultValues: true },
        );
        setPhotos(saved.photos);
        setDraftRestored(true);
      }
      setDraftLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [draftUser, branchId, ratingParam, reset]);

  const draft = { rating, text, visitDate, photos };
  const latestDraft = useRef(draft);
  useEffect(() => {
    latestDraft.current = draft;
    submittedRef.current = submitted;
  });

  // Save shortly after each change (and once more on the way out, below).
  useEffect(() => {
    if (!draftUser || !draftLoaded || submitted) return;
    const timer = setTimeout(() => {
      saveReviewDraft(draftUser, branchId, { rating, text, visitDate, photos });
    }, 600);
    return () => clearTimeout(timer);
  }, [
    draftUser,
    draftLoaded,
    submitted,
    branchId,
    rating,
    text,
    visitDate,
    photos,
  ]);

  useEffect(
    () => () => {
      if (draftUser && !submittedRef.current) {
        saveReviewDraft(draftUser, branchId, latestDraft.current);
      }
    },
    [draftUser, branchId],
  );

  function startOver() {
    reset({ rating: 0, text: "", visitDate: undefined });
    setPhotos([]);
    setDraftRestored(false);
    if (draftUser) clearReviewDraft(draftUser, branchId);
  }

  // Edits confirm before discarding; new reviews just keep their draft.
  const confirmClose = useDiscardConfirm(
    isEdit && !posted && (formState.isDirty || photos.length > 0),
  );
  function attemptClose() {
    if (draftUser && !posted && hasContent) {
      toast.success("Draft saved", "It'll be here when you come back.");
    }
    confirmClose();
  }

  async function pickPhotos() {
    const result = await pickImage({
      multiple: true,
      base64: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (result.status === "denied") {
      Alert.alert(
        "Photo access needed",
        "Turn it on to add snapshots to your review.",
      );
      return;
    }
    if (result.status === "picked") {
      // New photos start as Food (or the first category); tap to change.
      const category = defaultPhotoCategory(
        photoCategories.data ?? DEFAULT_PHOTO_CATEGORIES,
      );
      setPhotos((prev) =>
        [
          ...prev,
          ...result.images.map((image) => ({ ...image, category })),
        ].slice(0, MAX_PHOTOS),
      );
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
        haptics.success();
        toast.success("All set!", "Your review got a fresh coat.");
        router.back();
        return;
      }

      const review = await createReview.mutateAsync({
        rating: values.rating,
        text: values.text,
        ...(values.visitDate ? { visitDate: values.visitDate } : {}),
      });
      // Posted — the draft has done its job.
      setSubmitted(true);
      if (draftUser) clearReviewDraft(draftUser, branchId);
      analytics.track("review_submitted", {
        branch_id: branchId,
        rating: values.rating,
      });
      // First review is a meaningful action — a good moment to ask about push.
      void promptAndRegisterPush(getToken);

      // Upload photos and count the user's reviews in parallel — both feed the
      // celebration screen. A failed count just drops the "#N" from the copy.
      setUploading(true);
      const [failed, mine, branch] = await Promise.all([
        uploadPhotos(review.id, photos),
        getMyReviews(getToken).catch(() => undefined),
        // Usually cached from the branch page; fetched when arriving by link.
        queryClient
          .ensureQueryData({
            queryKey: branchKeys.detail(branchId),
            queryFn: () => getBranch(branchId, getToken),
          })
          .catch(() => undefined),
      ]);
      const active = mine?.filter(
        (r) =>
          r.moderationStatus !== "archived" &&
          r.moderationStatus !== "rejected",
      );
      // After the uploads, since the photo badge depends on them. Only badges a
      // review can earn are announced here; others surface on Profile.
      const milestones = await getMyMilestones(getToken).catch(() => undefined);
      const unlocked = (milestones ?? []).filter(
        (m) => REVIEW_MILESTONES.has(m.id) && seenMilestones.isNew(m),
      );
      if (unlocked.length > 0) {
        seenMilestones.markSeen(unlocked.map((m) => m.id));
      }
      const badge = unlocked[0];
      setPosted({
        newBadge: badge
          ? {
              title: badge.title,
              description: badge.description,
              art: <MilestoneMedallion milestone={badge} size={52} />,
            }
          : undefined,
        reviewId: review.id,
        rating: values.rating,
        placeName: branch?.place.name,
        pendingModeration: review.moderationStatus !== "approved",
        failed,
        reviewNumber: active?.length || undefined,
        reviewedBranchIds: new Set(active?.map((r) => r.branchId) ?? []),
      });
    } catch (err) {
      // The user already has a review for this branch — send them to edit it
      // rather than leaving them stuck on a create form that can't succeed.
      if (getErrorCode(err) === REVIEW_ALREADY_EXISTS) {
        await routeToExistingReview();
        return;
      }
      // The form stays mounted, so the draft is intact — offer a one-tap retry.
      Alert.alert("Review hit a snag", getErrorMessage(err), [
        { text: "Keep editing", style: "cancel" },
        { text: "Try again", onPress: () => void onSubmit() },
      ]);
    } finally {
      setUploading(false);
    }
  });

  // Returns the photos that failed. The review itself is already saved, so a
  // photo failure never loses it — the celebration offers a retry instead.
  async function uploadPhotos(
    reviewIdToAttach: string,
    pending: PickedPhoto[],
  ) {
    if (pending.length === 0) return [];
    const results = await Promise.allSettled(
      pending.map((photo) =>
        uploadReviewPhoto(branchId, reviewIdToAttach, photo, getToken),
      ),
    );
    return pending.filter((_, i) => results[i].status === "rejected");
  }

  async function retryFailedPhotos() {
    if (!posted) return;
    setRetryingPhotos(true);
    const failed = await uploadPhotos(posted.reviewId, posted.failed);
    setRetryingPhotos(false);
    setPosted((prev) => (prev ? { ...prev, failed } : prev));
    if (failed.length === 0) haptics.success();
  }

  async function routeToExistingReview() {
    try {
      const mine = await getMyReviews(getToken);
      const existing = mine.find(
        (r) => r.branchId === branchId && r.moderationStatus !== "archived",
      );
      if (existing) {
        Alert.alert(
          "You've already reviewed this place",
          "Want to freshen up your first take instead?",
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
      "One review per spot keeps things tidy. You can edit yours from your profile.",
    );
  }

  if (posted) {
    const suggestions = (saves.data ?? [])
      .filter((b) => b.id !== branchId && !posted.reviewedBranchIds.has(b.id))
      .slice(0, 3);

    return (
      <ReviewCelebration
        failedPhotoCount={posted.failed.length}
        onDone={() => router.back()}
        onFindAnother={() => router.navigate("/search")}
        onPickSuggestion={(branch) =>
          router.replace({
            pathname: "/review/[branchId]",
            params: { branchId: branch.id },
          })
        }
        onRetryPhotos={() => void retryFailedPhotos()}
        pendingModeration={posted.pendingModeration}
        placeName={posted.placeName}
        rating={posted.rating}
        retryingPhotos={retryingPhotos}
        newBadge={posted.newBadge}
        reviewNumber={posted.reviewNumber}
        suggestions={suggestions}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenHeader
        onClose={attemptClose}
        title={isEdit ? "Edit review" : "Write a review"}
      />

      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <KeyboardAwareScrollView
          bottomOffset={24}
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName="gap-6 px-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          {isEdit &&
          existingReview.isError &&
          !ownCopy &&
          !myReviews.isPending ? (
            <View className="gap-2 rounded-2xl bg-danger-soft p-4">
              <ThemedText size="sm" tone="danger" weight="medium">
                Couldn&apos;t load your saved review.
              </ThemedText>
              <TextButton
                label="Try again"
                onPress={() => void existingReview.refetch()}
              />
            </View>
          ) : null}

          {draftRestored ? (
            <View className="flex-row items-center justify-between gap-3 rounded-2xl bg-personalized px-4 py-3">
              <ThemedText className="shrink" size="sm" weight="medium">
                Picked up where you left off
              </ThemedText>
              <TextButton label="Start over" onPress={startOver} />
            </View>
          ) : null}

          <View className="gap-3">
            {/* The place is named in the question, so it's always clear
                what this review is for. */}
            <View>
              <ThemedText size="xl" weight="bold">
                {place.data
                  ? `How was ${place.data.place.name}?`
                  : "How was it?"}
              </ThemedText>
            </View>
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
              headingLabel
              inputClassName="min-h-40"
              label="Spill the details"
              maxLength={MAX_CHARS}
              name="text"
              placeholder="What did you order? How was the vibe?"
            />
            {!textError ? (
              <ThemedText size="sm" tone="muted">
                {trimmedLength > 0
                  ? `${trimmedLength}/${MAX_CHARS}`
                  : "A quick note is enough."}
              </ThemedText>
            ) : null}
          </View>

          <View className="gap-2">
            <ThemedText size="xl" weight="bold">
              When did you visit?
            </ThemedText>
            <View className="flex-row items-center gap-3">
              <PressableFade
                className="h-14 flex-1 flex-row items-center gap-3 rounded-xl border border-placeholder bg-surface px-4"
                onPress={() => setShowDatePicker(true)}
              >
                <AppIcon color={colors.muted} icon={Calendar03Icon} size={18} />
                <ThemedText size="sm" tone={visitDate ? "default" : "muted"}>
                  {visitDate ? formatVisitDate(visitDate) : "Optional"}
                </ThemedText>
              </PressableFade>
              {visitDate ? (
                <TextButton
                  accessibilityLabel="Clear visit date"
                  label="Clear"
                  onPress={() =>
                    setValue("visitDate", undefined, { shouldDirty: true })
                  }
                  tone="muted"
                />
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
            <PhotoPicker
              fill
              heading
              label="Add a few photos"
              max={MAX_PHOTOS}
              onAdd={pickPhotos}
              onCategoryChange={(uri, category) =>
                setPhotos((prev) =>
                  prev.map((photo) =>
                    photo.uri === uri ? { ...photo, category } : photo,
                  ),
                )
              }
              onRemove={removePhoto}
              photos={photos}
            />
          ) : null}
        </KeyboardAwareScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={busy}
            label={isEdit ? "Save changes" : "Submit review"}
            loading={busy}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
