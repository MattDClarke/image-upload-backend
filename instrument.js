import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://cc139b093f9635a577923cf16cd92655@o4506183415103488.ingest.us.sentry.io/4510199480909824",
  // Add Tracing by setting tracesSampleRate
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});
