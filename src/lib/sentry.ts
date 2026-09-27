import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

// Crash and error reporting. The DSN is a public identifier (it only allows
// sending events), so it lives in code. Development builds don't report —
// errors there show in the red box and Metro instead.
Sentry.init({
  dsn: "https://686b5c855a08c240e28b5e9e4e6a8605@o4512157456596992.ingest.us.sentry.io/4512157551099904",
  enabled: !__DEV__,
  environment: process.env.EXPO_PUBLIC_API_BASE_URL?.includes("onrender.com")
    ? "preview"
    : "production",
  release: Constants.expoConfig?.version,
  // A sample of performance traces — enough to spot slow screens without
  // burning through the free quota.
  tracesSampleRate: 0.2,
  // Never attach IPs, cookies or request bodies.
  sendDefaultPii: false,
});

export { Sentry };
