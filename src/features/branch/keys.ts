// Query keys for branch data, kept dependency-free so lightweight modules
// (like the card prefetch) can use them without pulling in the rest.
export const branchKeys = {
  all: ["branch"] as const,
  detail: (id: string) => [...branchKeys.all, id] as const,
  siblings: (id: string) => [...branchKeys.detail(id), "siblings"] as const,
  menus: (id: string) => [...branchKeys.detail(id), "menus"] as const,
  reviews: (id: string) => [...branchKeys.detail(id), "reviews"] as const,
  review: (id: string) => [...branchKeys.all, "review", id] as const,
};
