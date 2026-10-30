# Google OAuth — Current State & Production Checklist

> **Status (dev):** Code is wired correctly. Sign-in does not complete inside
> Expo Go because Expo's `auth.expo.io` proxy was retired for new projects.
> Everything works once we move to an **EAS development build** (or a real
> Play Store / TestFlight build). Email-password login works today and is the
> sole login path used during development.

> **Rename note:** the app was renamed to Squirrel. The Expo slug/scheme is now `squirrel` and the Android package / iOS bundle ID is now `com.himalacharya.squirrel`. The Google Cloud project and OAuth clients below were registered under the old name and package, so they must be re-created (or updated) for the new identifiers: new Android client with the new package + SHA-1, new iOS client with the new bundle ID, and the Web client redirect URI changed to `https://auth.expo.io/@himal-acharya/squirrel`. Then put the new client IDs in `backend/.env` and `frontend-mobile/.env`.

---

## What's already in place

### Google Cloud Console project

| Item | Value |
|---|---|
| Project ID | create a new project for Squirrel (a project ID cannot be renamed) |
| OAuth consent screen | External, **Testing** status |
| Authorized domain | `expo.io` |
| Scopes | `openid`, `userinfo.email`, `userinfo.profile` |
| Test users (3) | `acharyahimal122@gmail.com`, `guddugaming123@gmail.com`, `humorhaven22@gmail.com` |

### OAuth Clients

| Type | Client ID | Purpose |
|---|---|---|
| Web | `647696287415-s9uhd3c4j25058592l2ultvq39tn3guu.apps.googleusercontent.com` | Used by Expo Go via `auth.expo.io` proxy. Authorized redirect URI: `https://auth.expo.io/@himal-acharya/squirrel` |
| Android | `625044657742-856bk40jren07dbnq0drc9516t7o7lmr.apps.googleusercontent.com` | Used by EAS-built Android app. ⚠️ SHA-1 fingerprint not yet registered — will need to be added before EAS builds work |
| iOS | `625044657742-tlf39m5lfbu4ioqsfkqqdt19b1cile64.apps.googleusercontent.com` | Used by EAS-built iOS app. Bundle ID: `com.himalacharya.squirrel` |

> in Google Cloud Console → Credentials → Squirrel Web → Reset client
> secret** before production. The mobile client doesn't use the secret
> (PKCE flow), so rotation breaks nothing.

### Backend — `backend/.env`

```env
GOOGLE_ANDROID_CLIENT_ID=625044657742-856bk40jren07dbnq0drc9516t7o7lmr.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=625044657742-tlf39m5lfbu4ioqsfkqqdt19b1cile64.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=647696287415-s9uhd3c4j25058592l2ultvq39tn3guu.apps.googleusercontent.com
```

`backend/config/settings.py` whitelists all three as valid `aud` values via
`GOOGLE_CLIENT_IDS`. The endpoint that consumes the Google ID token is
`POST /api/v1/auth/google/`.

### Mobile — `frontend-mobile/.env`

```env
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=625044657742-856bk40jren07dbnq0drc9516t7o7lmr.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=625044657742-tlf39m5lfbu4ioqsfkqqdt19b1cile64.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=647696287415-s9uhd3c4j25058592l2ultvq39tn3guu.apps.googleusercontent.com
```

### Mobile code

- `frontend-mobile/src/utils/config.js` — reads all three IDs from env.
- `frontend-mobile/src/services/googleAuth.js` — branches on
  `Constants.appOwnership === 'expo'`:
  - **In Expo Go** → uses Web client + proxy redirect URI (will fail at the
    "finish signing in" step because the proxy is retired).
  - **In a built app (EAS dev-client / standalone)** → uses native
    Android/iOS client IDs + custom scheme deep link. This is the path that
    actually works.

### Mobile config (`app.json`)

```json
{
  "scheme": "squirrel",
  "slug": "squirrel",
  "ios":     { "bundleIdentifier": "com.himalacharya.squirrel" },
  "android": { "package":          "com.himalacharya.squirrel" }
}
```

### Expo account

- Username: `himal-acharya`
- App slug under that account: `squirrel`

---

## Production checklist (do these before launch)

### 1. Build a dev client and test sign-in locally

```bash
cd frontend-mobile
npx expo install expo-dev-client
npm install -g eas-cli
eas login                    # use himal-acharya
eas init                     # binds slug → Expo project on the server
eas build:configure          # generates eas.json
```

### 2. Register the Android SHA-1 with Google

```bash
eas credentials
# Pick Android → development profile
# "Set up a new keystore" → yes (let EAS generate)
# Copy the SHA-1 fingerprint EAS shows
```

Then in **Google Cloud Console → Credentials → Squirrel Android**:
- Paste the SHA-1 into "SHA-1 certificate fingerprints"
- Save

Repeat for the **production** keystore when you're ready to ship to the Play
Store (it'll have a different SHA-1).

### 3. Build the dev client

```bash
eas build --profile development --platform android
# wait ~10 minutes
# install the APK from the URL EAS gives you
```

### 4. Run with dev-client

```bash
npx expo start --dev-client
```

Open the **installed dev-client app** (not Expo Go), scan the QR, and
Continue with Google should now succeed end-to-end.

### 5. iOS (optional, only if you need iOS builds)

```bash
eas build --profile development --platform ios
```

You'll need a paid Apple Developer account (Cmd-line walks you through it).
The iOS client ID is already configured — Bundle ID `com.himalacharya.squirrel`
matches `app.json`.

### 6. Publish the OAuth consent screen

While in Testing, only the 3 added users can sign in.

When ready for public launch:

- Google Cloud Console → OAuth consent screen → **Publish app**
- For our scopes (`openid`, `email`, `profile`) **no Google review is
  required** — these are non-sensitive. Publishing is instant.
- The 100-user testing cap goes away.

### 7. Rotate the leaked Web client secret

- Google Cloud Console → Credentials → Squirrel Web → Reset client secret.
- No code change needed (mobile uses PKCE; backend doesn't use the secret
  either).

### 8. Final smoke test

Sign in with a Gmail that is **not** in the test-users list. It should:

1. Show the Google sign-in screen (no "Access blocked" warning).
2. Redirect into the app.
3. Issue our backend JWT.
4. The new user shows up in Django admin → Users.

---

## Why Expo Go OAuth fails (reference)

When `useGoogleAuthRequest()` runs inside Expo Go we route through Expo's
proxy at `https://auth.expo.io/@himal-acharya/squirrel`. Google
authenticates correctly, redirects to that URL, but Expo's proxy server
returns:

> Something went wrong trying to finish signing in.

Expo deprecated the proxy for projects that weren't already registered with
it before its 2025 sunset. New projects (ours, registered May 15, 2026) get
this dead-end page no matter what.

The dev-client / standalone path uses **native deep links** (`squirrel://`)
instead of the proxy and works fine. That's why the production path is to
ship a built app.

---

## Files touched (so future you knows where to look)

- `frontend-mobile/src/services/googleAuth.js` — main OAuth wiring
- `frontend-mobile/src/utils/config.js` — env passthrough
- `frontend-mobile/.env` — mobile env vars
- `backend/.env` — backend env vars
- `backend/config/settings.py` — assembles `GOOGLE_CLIENT_IDS` list
- `backend/apps/users/views.py` — `/api/v1/auth/google/` endpoint that
  verifies the ID token (`google_id_token.verify_oauth2_token(...)`)

---

_Last reviewed: 2026-05-15 by Himal Acharya._
