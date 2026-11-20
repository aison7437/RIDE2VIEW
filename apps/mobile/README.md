# Ride2View Mobile — M01 foundation

React Native + Expo Router + TypeScript scaffold. This is **not yet a production application**.

## Existing repository preservation

The mobile app is isolated under `apps/mobile/`. The existing Node.js server, web apps and workflows are unchanged. This project has its own package boundary; there is no root workspace migration in M01.

## Setup

1. Use a supported Node.js version and run `cd apps/mobile && npm install`.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL` to the **verified** backend origin (HTTPS).
3. Run `npx expo install --fix` if Expo reports package version misalignment, and commit the resulting lockfile.
4. Run `npm run typecheck`, `npx expo-doctor`, and `npx expo start`.
5. Set up Expo account/signing in a later milestone before using EAS builds.

## Scope and limitations

- The welcome page and property list are scaffolds; no demo listings are passed off as real.
- The property API path `/api/v1/properties` and `data` response envelope are **proposals** and must be reconciled against the current backend/OpenAPI specification before enabling live discovery.
- Firebase login, role-based navigation, booking, dispatch, M-Pesa, push notifications, backend deployment, Figma screen parity and app-store builds are **not implemented**.
- The configured design token colors are provisional and require Figma validation.
- The code has not been compiled or run on a device by adding it to GitHub. M01 must pass dependency installation and CI before review.
