import { useEffect, useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

export type ReplyTarget = {
  reviewId: string;
  replyId?: string;
  initialBody?: string;
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
  const [body, setBody] = useState("");
  const isEdit = Boolean(target?.replyId);

  useEffect(() => {
    if (target) setBody(target.initialBody ?? "");
  }, [target]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={target !== null}
    >
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <KeyboardAvoidingView behavior="padding">
          <Pressable
            className="gap-3 rounded-t-3xl bg-surface px-5 pb-8 pt-5"
            onPress={(event) => event.stopPropagation()}
          >
            <ThemedText size="lg" weight="semibold">
              {isEdit ? "Edit reply" : "Write a reply"}
            </ThemedText>
            <TextInput
              autoFocus
              className="min-h-24 rounded-xl border border-placeholder bg-background px-3 py-2 font-outfit text-md text-foreground"
              maxLength={2000}
              multiline
              onChangeText={setBody}
              placeholder="Share your response…"
              placeholderTextColor={colors.muted}
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
    </Modal>
  );
}
