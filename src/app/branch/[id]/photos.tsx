import { useAuth } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { TextButton } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import { useBranch } from "@/features/branch";
import {
  PhotoGallery,
  type GalleryPhoto,
} from "@/features/branch/components/photo-gallery";
import { useColors } from "@/lib/theme";
import { promptSignIn } from "@/lib/auth-gate";

export default function PhotoGalleryScreen() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const { id, index } = useLocalSearchParams<{ id: string; index?: string }>();
  const branch = useBranch(id);
  const photos = branch.data?.photos ?? [];

  function report(photo: GalleryPhoto) {
    if (!isSignedIn) {
      promptSignIn(isLoaded);
      return;
    }
    router.push({
      pathname: "/suggest-edit/[branchId]",
      params: {
        branchId: id,
        name: branch.data?.place.name ?? "",
        photoId: photo.id,
        photoUrl: photo.url,
      },
    });
  }

  if (photos.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        {branch.isPending ? (
          <ActivityIndicator color={colors.inverse} />
        ) : (
          <View className="items-center gap-3">
            <ThemedText className="text-center" tone="inverse">
              {branch.isError
                ? "Couldn't load photos. Check your connection."
                : "No photos here yet."}
            </ThemedText>
            {branch.isError ? (
              <TextButton
                label="Try again"
                onPress={() => void branch.refetch()}
                size="md"
                tone="inverse"
              />
            ) : (
              <TextButton
                label="Go back"
                onPress={() => router.back()}
                size="md"
                tone="inverse"
              />
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <PhotoGallery
      initialIndex={Number(index ?? 0) || 0}
      onClose={() => router.back()}
      onReport={report}
      photos={photos}
    />
  );
}
