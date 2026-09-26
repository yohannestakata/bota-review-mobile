import { useDeviceList } from "@/lib/use-device-list";

export type RecentlyViewedPlace = {
  id: string;
  name: string;
  viewedAt: number;
};

const idOf = (place: RecentlyViewedPlace) => place.id;

// Branches the user opened recently, newest first. Written by the branch page,
// read by Home's "Been to X lately?" nudge.
export function useRecentlyViewed() {
  return useDeviceList<RecentlyViewedPlace>("recently-viewed", {
    max: 10,
    idOf,
  });
}
