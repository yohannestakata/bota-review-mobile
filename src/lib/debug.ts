// Flip to true to turn the [bota:*] logs back on while debugging.
const LOGGING_ENABLED = false;

export function debugLog(
  scope: string,
  message: string,
  data?: Record<string, unknown>,
) {
  if (!LOGGING_ENABLED || !__DEV__) {
    return;
  }

  if (data) {
    console.log(`[bota:${scope}] ${message}`, data);
    return;
  }

  console.log(`[bota:${scope}] ${message}`);
}
