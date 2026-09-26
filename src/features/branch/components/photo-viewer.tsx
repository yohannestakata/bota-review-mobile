import { Modal } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { PhotoGallery } from "./photo-gallery";

type Photo = { id: string; url: string };

type PhotoViewerProps = {
  photos: Photo[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
};

// Review photos: the shared gallery in a modal. A Modal renders outside the
// app's root view, so it needs its own gesture root.
export function PhotoViewer({
  photos,
  initialIndex,
  visible,
  onClose,
}: PhotoViewerProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PhotoGallery
          initialIndex={initialIndex}
          onClose={onClose}
          photos={photos}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}
