# CLAUDE.md — Ingredient Scanner (Capstone Project)

This file gives Claude Code the context for this repository: the project background and working guidelines. The full architecture lives in `docs/ARCHITECTURE.md` and is imported below.

---

## Project context

- **What it is:** A capstone school project for an AI Software Development bootcamp — a React Native mobile app that checks skincare and cosmetic ingredient lists (photographed via OCR or pasted as text) against a database of pore-clogging ingredients rated 1–5.
- **Where the idea came from:** Working with the estheticians at a day spa. The ingredient list is compiled by licensed estheticians from that spa.
- **Deliverables:** Design, development and testing phases; a deployed app, a GitHub repo, a README and a devlog.
- **Repo and deployment:** The GitHub repo stays **private** (agreed with the professor). The app will be deployed, as required by the project. During development it runs locally and on real devices through Expo.
- **Developer level:** Learning JavaScript and full-stack development. Explain non-obvious code and decisions clearly, and prefer readable, conventional code over clever shortcuts.

## Working guidelines for Claude Code

- Follow the folder structure, layering and patterns in the architecture below. Keep controllers thin; put business logic in `backend/services/`.
- All HTTP calls from the app go through `frontend/src/services/api.js`.
- Keep state local; only auth state is global (`AuthContext`). Don't add Redux or another state library.
- `ingredientParser` and `ingredientMatcher` must stay pure functions and be covered by Jest unit tests.
- Never commit secrets. MongoDB URI, JWT secret and OCR API key live in `.env` (gitignored) locally, and in the hosting provider's environment variables once deployed.
- Saved products are always queried and deleted by **both** product ID and user ID.
- The app is informational only — keep the disclaimer on ResultsScreen and AboutScreen.
- Three decisions are still open (see section 13 of the architecture): ratings vs. simple flagging, the OCR provider, and hosting. Don't hard-code assumptions that make these hard to change.

---

@docs/ARCHITECTURE.md
