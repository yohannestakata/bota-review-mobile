import { View } from "react-native";

function CardSkeleton() {
  return (
    <View className="w-64">
      <View className="h-48 rounded-2xl bg-neutral-200" />
      <View className="mt-3 h-5 w-40 rounded-full bg-neutral-200" />
      <View className="mt-2 h-4 w-28 rounded-full bg-neutral-200" />
    </View>
  );
}

export function HomeFeedSkeleton() {
  return (
    <View className="mt-8 gap-4">
      <View className="ml-6 h-6 w-36 rounded-full bg-neutral-200" />
      <View className="flex-row gap-4 overflow-hidden pl-6">
        <CardSkeleton />
        <CardSkeleton />
      </View>
    </View>
  );
}
