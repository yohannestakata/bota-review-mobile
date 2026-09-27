import { router } from "expo-router";

import { toast } from "@/components/ui/toast";

/**
 * Send a signed-out person to sign in. Until Clerk has loaded (e.g. right
 * after coming back online) we can't tell who's signed in, so don't send a
 * signed-in person to a login screen that then says "already signed in".
 */
export function promptSignIn(isLoaded: boolean) {
  if (!isLoaded) {
    toast.error("Still reconnecting", "Give it a second and try again.");
    return;
  }
  router.push("/login");
}
