import { Redirect, useLocalSearchParams } from "expo-router";

// https://botareview.com/p/:id (shared links, opened as universal/app links)
// lands here — forward to the place page.
export default function SharedPlaceLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/branch/${id}?source=share`} />;
}
