import * as WebBrowser from "expo-web-browser";

// TODO: point these at the real hosted pages before store submission. The same
// URLs must be entered in the App Store / Play Store listings.
export const PRIVACY_POLICY_URL = "https://botareview.com/privacy";
export const TERMS_URL = "https://botareview.com/terms";

export function openLegal(url: string) {
  return WebBrowser.openBrowserAsync(url);
}
