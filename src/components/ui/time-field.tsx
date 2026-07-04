import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";

const EXIT_MS = 220;

function parseTime(value: string): Date {
  const [h, m] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return date;
}

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// A "HH:MM" time value edited via the native time picker. Android pops the
// native dialog; iOS presents the wheel in a bottom sheet whose overlay fades
// while the sheet slides (driven by Reanimated, not the Modal's slide anim).
export function TimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [androidShow, setAndroidShow] = useState(false);
  const [iosOpen, setIosOpen] = useState(false); // Modal mounted
  const [iosContent, setIosContent] = useState(false); // sheet/overlay rendered
  const [draft, setDraft] = useState<Date>(() => parseTime(value));

  const field = (
    <Pressable
      className="h-10 justify-center rounded-xl border border-placeholder bg-surface px-4"
      onPress={() => {
        setDraft(parseTime(value));
        if (Platform.OS === "ios") {
          setIosOpen(true);
          setIosContent(true);
        } else {
          setAndroidShow(true);
        }
      }}
    >
      <ThemedText size="sm">{value}</ThemedText>
    </Pressable>
  );

  if (Platform.OS === "ios") {
    // Unmount the sheet first (plays exit animations), then close the Modal.
    function dismiss() {
      setIosContent(false);
      setTimeout(() => setIosOpen(false), EXIT_MS);
    }

    return (
      <>
        {field}
        <Modal
          animationType="none"
          onRequestClose={dismiss}
          transparent
          visible={iosOpen}
        >
          {iosContent ? (
            <View className="flex-1 justify-end">
              <Animated.View
                entering={FadeIn.duration(EXIT_MS)}
                exiting={FadeOut.duration(EXIT_MS)}
                style={StyleSheet.absoluteFill}
              >
                <Pressable className="flex-1 bg-black/40" onPress={dismiss} />
              </Animated.View>
              <Animated.View
                entering={SlideInDown.duration(EXIT_MS)}
                exiting={SlideOutDown.duration(EXIT_MS)}
              >
                <View className="gap-2 rounded-t-3xl bg-surface px-5 pb-8 pt-3">
                  <View className="items-center">
                    <DateTimePicker
                      display="spinner"
                      mode="time"
                      onChange={(_event, date) => {
                        if (date) setDraft(date);
                      }}
                      style={{ alignSelf: "center" }}
                      value={draft}
                    />
                  </View>
                  <Button
                    label="Done"
                    onPress={() => {
                      onChange(formatTime(draft));
                      dismiss();
                    }}
                  />
                </View>
              </Animated.View>
            </View>
          ) : null}
        </Modal>
      </>
    );
  }

  return (
    <>
      {field}
      {androidShow ? (
        <DateTimePicker
          mode="time"
          onChange={(event, date) => {
            setAndroidShow(false);
            if (event.type === "set" && date) onChange(formatTime(date));
          }}
          value={parseTime(value)}
        />
      ) : null}
    </>
  );
}
