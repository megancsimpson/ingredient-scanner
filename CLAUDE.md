# CLAUDE.md — Ingredient Scanner (Capstone Project)

This file gives Claude Code the context for this repository: the project background and working guidelines. The full architecture lives in `docs/ARCHITECTURE.md` and is imported below.

---

## Project context

- **What it is:** A capstone school project for an AI Software Development bootcamp — a React Native mobile app that checks skincare and cosmetic ingredient lists (photographed via OCR or pasted as text) against a database of known pore-clogging ingredients, flagging any matches (no ratings).
- **Where the idea came from:** Working with the estheticians at a day spa. The ingredient list was compiled by licensed estheticians from that spa, using the Acne Clinic NYC and Face Reality pore-clogging ingredient lists.
- **Deliverables:** Design, development and testing phases; a deployed app, a GitHub repo, a README and a devlog.
- **Repo and deployment:** The GitHub repo is **public**, as the assignment requires, so anything committed (including history) is visible to everyone: never commit secrets, real URLs or personal data. The API is deployed on Render and the Android app is an APK built with EAS. The professor tests on an Android phone. During development the app runs locally and on real devices through Expo.
- **Developer level:** Learning JavaScript and full-stack development. Explain non-obvious code and decisions clearly, and prefer readable, conventional code over clever shortcuts.

## Working guidelines for Claude Code

- Follow the folder structure, layering and patterns in the architecture below. Keep controllers thin; put business logic in `backend/services/`.
- All HTTP calls from the app go through `frontend/src/services/api.js`.
- Keep state local; only auth state is global (`AuthContext`). Don't add Redux or another state library.
- `ingredientParser` and `ingredientMatcher` must stay pure functions and be covered by Jest unit tests.
- Never commit secrets. MongoDB URI, JWT secret, OCR API key and Gmail app password live in `.env` (gitignored) locally, and in the hosting provider's environment variables once deployed.
- Saved products are always queried and deleted by **both** product ID and user ID.
- The app is informational only — keep the disclaimer on ResultsScreen and AboutScreen.
- The app must work on **both iPhone and Android**. Consider both platforms for every UI/UX change: keyboard behavior, safe areas (notch, home indicator, Android navigation bar), headers and tab bars, fonts, shadows (iOS `shadow*` vs. Android `elevation`) and permissions such as the camera. Use `Platform.OS` only where behavior genuinely differs, and explain why in a comment. The developer tests on an iPhone; when a change can't be checked on Android, say so.
- Ingredients are flagged, not rated. Don't add ratings or a `rating` field.
- The API is deployed on Render and redeploys on every push to `main`, so work on the `dev` branch and merge to `main` only when tested (see section 12a of the architecture). The Android app is built as an APK with EAS Build (`preview` profile in `frontend/eas.json`; the live API address is an EAS environment variable, not in the repo); there's no iPhone build (section 12a). OCR uses Google Cloud Vision through `backend/services/ocrService.js`, and email (forgot password codes and welcome emails) uses Gmail through nodemailer in `backend/services/emailService.js`. Don't hard-code assumptions that make these hard to change.

---

@docs/ARCHITECTURE.md
