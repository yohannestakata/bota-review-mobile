import { router } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";

type AuthRequiredScreenProps = {
  title: string;
  body: string;
};

export function AuthRequiredScreen({ title, body }: AuthRequiredScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <ThemedText className="text-center" size="2xl" weight="semibold">
          {title}
        </ThemedText>
        <ThemedText className="text-center" tone="muted">
          {body}
        </ThemedText>
        <Button
          className="mt-3 w-full"
          label="Sign in"
          onPress={() => router.push("/login")}
        />
      </View>
    </SafeAreaView>
  );
}
