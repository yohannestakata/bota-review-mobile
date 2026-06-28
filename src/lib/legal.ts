import * as WebBrowser from "expo-web-browser";

// Also enter these in the App Store / Play Store listings.
export const PRIVACY_POLICY_URL = "https://botareview.com/privacy-policy";
export const TERMS_URL = "https://botareview.com/terms-of-service";

export function openLegal(url: string) {
  return WebBrowser.openBrowserAsync(url);
}
