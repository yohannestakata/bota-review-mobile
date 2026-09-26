import {
  Award01Icon,
  Camera01Icon,
  Compass01Icon,
  FavouriteIcon,
  Flag01Icon,
  PencilEdit02Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";

import { useDeviceList } from "@/lib/use-device-list";

import type { Milestone } from "./api";

// Icon per badge id. Unknown ids (a badge added server-side before the app
// updates) fall back to the award icon rather than breaking.
const ICONS: Record<string, typeof StarIcon> = {
  first_review: PencilEdit02Icon,
  first_photo: Camera01Icon,
  reviews_5: StarIcon,
  saves_10: FavouriteIcon,
  neighborhoods_3: Compass01Icon,
  place_live: Flag01Icon,
  reviews_10: Award01Icon,
};

export function milestoneIcon(id: string) {
  return ICONS[id] ?? Award01Icon;
}

const idOf = (id: string) => id;

// Earned badges the user has already been shown, so each one surprises them
// once — on the review celebration or with a "New" marker on Profile.
export function useSeenMilestones() {
  const seen = useDeviceList<string>("seen-milestones", { max: 50, idOf });
  return {
    ready: seen.ready,
    isNew: (milestone: Milestone) =>
      milestone.earned && !seen.items.includes(milestone.id),
    markSeen: (ids: string[]) =>
      ids.filter((id) => !seen.items.includes(id)).forEach(seen.add),
  };
}
