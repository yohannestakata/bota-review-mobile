import { useUser } from "@clerk/clerk-expo";
import { useRef, useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

export type ReplyTarget = {
  reviewId: string;
  replyId?: string;
  initialBody?: string;
  // Context about the review being replied to (shown at the top of the sheet).
  reviewAuthorName?: string | null;
  reviewAuthorAvatarUrl?: string | null;
  reviewText?: string;
};

// Screen-level reply composer. Lifted out of the review row so it never lives
// inside a recycled FlashList item (which would mis-recycle the open state and
// typed text). The owning screen runs the create/update mutation and toggles
// `target`.
export function ReplyComposerModal({
  target,
  submitting,
  onClose,
  onSubmit,
}: {
  target: ReplyTarget | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (body: string) => void;
}) {
  const targetKey = target
    ? `${target.reviewId}:${target.replyId ?? "new"}:${target.initialBody ?? ""}`
    : "closed";

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={target !== null}
    >
      {target ? (
        <ReplyComposerContent
          key={targetKey}
          onClose={onClose}
          onSubmit={onSubmit}
          submitting={submitting}
          target={target}
        />
      ) : null}
    </Modal>
  );
}

function ReplyComposerContent({
  target,
  submitting,
  onClose,
  onSubmit,
}: {
  target: ReplyTarget;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (body: string) => void;
}) {
  const { user } = useUser();
  const inputRef = useRef<TextInput>(null);
  const [body, setBody] = useState(target.initialBody ?? "");
  const isEdit = Boolean(target?.replyId);

  const meName = user?.fullName ?? user?.firstName ?? "You";

  return (
    <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
      <KeyboardAvoidingView behavior="padding">
        <Pressable
          className="gap-4 rounded-t-3xl bg-surface px-5 pb-8 pt-5"
          onLayout={() => inputRef.current?.focus()}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedText size="lg" weight="semibold">
            {isEdit ? "Edit reply" : "Reply"}
          </ThemedText>

          {/* Original review being replied to. */}
          {target.reviewText ? (
            <View className="gap-2">
              {target.reviewAuthorName ? (
                <View className="flex-row items-center gap-2.5">
                  <Avatar
                    name={target.reviewAuthorName}
                    size={28}
                    uri={target.reviewAuthorAvatarUrl}
                  />
                  <ThemedText size="sm" weight="medium">
                    {target.reviewAuthorName}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText size="xs" tone="muted">
                  Original review
                </ThemedText>
              )}
              <ThemedText numberOfLines={3} size="sm" tone="muted">
                {target.reviewText}
              </ThemedText>
            </View>
          ) : null}

          <View className="h-px bg-placeholder" />

          {/* You, the replier. */}
          <View className="flex-row items-center gap-2.5">
            <Avatar name={meName} size={28} uri={user?.imageUrl} />
            <ThemedText size="sm" weight="medium">
              {meName}
            </ThemedText>
          </View>

          <TextInput
            className="min-h-24 rounded-xl border border-placeholder bg-background px-3 py-2 font-outfit text-md text-foreground"
            maxLength={2000}
            multiline
            onChangeText={setBody}
            placeholder="Share your response…"
            placeholderTextColor={colors.muted}
            ref={inputRef}
            textAlignVertical="top"
            value={body}
          />
          <Button
            disabled={!body.trim() || submitting}
            label={isEdit ? "Save" : "Send reply"}
            loading={submitting}
            onPress={() => onSubmit(body.trim())}
          />
        </Pressable>
      </KeyboardAvoidingView>
    </Pressable>
  );
}
