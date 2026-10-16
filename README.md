# Ingredient Scanner

## Project Overview

A mobile app for iPhone and Android that checks skincare and cosmetic ingredient lists for pore-clogging ingredients. Take a photo of a product's ingredient list (or paste the list in), and the app flags any ingredient on a list of known pore-clogging ingredients.

The ingredient list was compiled by licensed estheticians at a day spa from the Acne Clinic NYC and Face Reality pore-clogging ingredient lists. The idea came from working with those estheticians.

Built as a capstone project for an AI Software Development bootcamp.

> **Information only.** Ingredient Scanner flags ingredients that appear on published pore-clogging lists. It doesn't replace advice from a skincare professional.

## Features

- **Scan or paste:** photograph an ingredient list (text is read with Google Cloud Vision) or paste one in, then correct any misread words before checking. Photos of a whole package keep only the ingredient list, not the brand, directions or address.
- **Flagging:** each ingredient is checked against the 358-entry list, including keywords such as "Coconut" that flag every ingredient containing them. Ingredients are flagged, not rated, and each flag shows which source list it came from.
- **Checks on what's entered:** a warning when the text doesn't look like an ingredient list, and the option to remove pieces that aren't ingredients from the results.
- **Saved products:** save results with a name, brand and category; sort, group, filter to products with no flagged ingredients, edit, and swipe to delete. Saving the same product twice asks whether to replace it or keep both.
- **Ingredient search:** look up any ingredient to see whether it's on the list and which source list it came from.
- **Accounts:** email and password login, email verification, forgot password with an emailed code, and account deletion.
- **Guide and About:** how flagging works and tips for accurate results, plus the data source and disclaimer.
- **iPhone and Android:** one app for both, tested on each.

## Technologies Used

| Part | Technology |
|---|---|
| Mobile app | React Native with Expo, JavaScript |
| Navigation | React Navigation (stacks and bottom tabs) |
| Camera and photos | expo-camera, expo-image-picker, expo-image-manipulator (shrinks photos before upload) |
| Login storage on the phone | expo-secure-store (iPhone Keychain, Android Keystore) |
| Swipe to delete | react-native-gesture-handler, react-native-reanimated |
| API | Node.js, Express |
| Database | MongoDB Atlas with Mongoose |
| Login | Passport.js (JWT), bcrypt |
| Photo text (OCR) | Google Cloud Vision API |
| Email | nodemailer with Gmail |
| Rate limiting | express-rate-limit |
| Tests | Jest (server), jest-expo (app) |
| Code checks | ESLint, GitHub Actions (runs lint and tests on every push) |
| Hosting | Render (API), MongoDB Atlas (database) |

The full design (screens, data flow, API endpoints, data models, security and the reasons behind the main decisions) is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Section 11a there lists which features of each library are used, where, and why.

## Project structure

```
ingredient-scanner/
├── frontend/   React Native (Expo) app
├── backend/    Node + Express API, Jest tests and the ingredient list
└── docs/       ARCHITECTURE.md, TESTING.md
```

## Installation Instructions

The app runs on your phone through **Expo Go** and talks to the API running on your computer, so the phone and computer must be on the **same Wi-Fi network**.

### What you need

- [Node.js](https://nodejs.org/) 20 or newer
- The **Expo Go** app on your iPhone or Android phone (App Store or Google Play)
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) database
- A [Google Cloud](https://console.cloud.google.com/) project with the Cloud Vision API turned on (for photo scanning)
- A Gmail account for the app to send email from (for verification and forgot password codes)

### 1. Set up the accounts and keys

**MongoDB Atlas**
1. Create a free cluster.
2. Under **Database Access**, add a database user with a password.
3. Under **Network Access**, allow your current IP address.
4. Click **Connect → Drivers** and copy the connection string. Put the user's password in it.

**Google Cloud Vision**
1. Create a project and turn on billing. The first 1,000 photos each month are free, but Google requires billing to be set up. Setting a budget alert is a good idea.
2. Enable the **Cloud Vision API**.
3. Under **APIs & Services → Credentials**, create an API key and restrict it to the Cloud Vision API.

**Gmail**
1. Use a Gmail account just for the app (not your personal one).
2. Turn on **2-Step Verification** for it.
3. Create an **app password** at https://myaccount.google.com/apppasswords. Copy the 16 letters without spaces.

Photo scanning and email are optional for starting the server. Without them, pasting ingredient lists still works, but new accounts can't be verified.

### 2. Start the API

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env`:

| Variable | What it is |
|---|---|
| `MONGODB_URI` | The MongoDB Atlas connection string |
| `PORT` | Port the API listens on (`3000`) |
| `JWT_SECRET` | A long random string for signing logins. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `GOOGLE_VISION_API_KEY` | The Cloud Vision API key |
| `EMAIL_USER` | The app's Gmail address |
| `EMAIL_APP_PASSWORD` | The Gmail app password |

Load the ingredient list into the database (only needed once, or after the list changes), then start the server:

```bash
npm run seed
npm run dev
```

You should see `Connected to MongoDB` and `Server running on port 3000`. To check it's working, open http://localhost:3000/api/health in a browser; it should show `{"status":"ok"}`.

### 3. Start the app

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

In `frontend/.env`, set `EXPO_PUBLIC_API_URL` to your computer's address on the Wi-Fi network and the API's port. On a Mac, `ipconfig getifaddr en0` shows the address:

```
EXPO_PUBLIC_API_URL=http://192.168.1.23:3000
```

Then start Expo:

```bash
npx expo start
```

Scan the QR code with the iPhone Camera app, or from inside Expo Go on Android. The app opens in Expo Go.

If you change `frontend/.env` later, restart with `npx expo start --clear` so the new address is picked up.

## Usage

1. **Create an account.** Sign up with your name, email and a password (8 or more characters). The app emails you a 6-digit code; enter it to finish signing up.
2. **Check a product** on the **Scan** tab:
   - **Take a photo** of the ingredient list. Photos work best when the whole list fits in one shot, as on a flat box. If the photo is blurry, use **"Blurry? Use your phone's camera"**, which opens the phone's own camera with tap to focus. You can also choose a photo you've already taken.
   - **Or tap Paste ingredient list** and paste it in, for example from the brand's website. This works best for round bottles, where the list wraps around out of view.
3. **Review the text.** Fix any words the photo misread, and delete anything that isn't an ingredient. Then tap **Check ingredients**.
4. **Read the results.** Flagged ingredients are listed first, with the source list each one comes from, followed by the full ingredient list with flagged ones highlighted. Tap **Edit** to remove pieces that aren't ingredients.
5. **Save the product** (optional) with a name, and a brand and category if you like. Saved products are on the **Saved** tab, where you can sort them, group them by brand or category, show only "Non pore-clogging" products, edit them, or swipe left to delete.
6. **Look up an ingredient** on the **Ingredients** tab to see whether it's on the list and where it came from. It checks one ingredient at a time; to check a whole list, use the Scan tab.
7. **Profile** has **How flagging works** (what a flag means and tips for accurate results), **About**, log out and delete account.

Forgot your password? Tap **Forgot password?** on the login screen, and the app emails you a code to set a new one.

> A flag means the ingredient is on a published pore-clogging list. It isn't a rating or a diagnosis, and no flags doesn't guarantee a product won't clog pores.

## Tests

How the app is tested (unit tests, the manual checklist for iPhone and Android, and the bugs found and fixed) is in [docs/TESTING.md](docs/TESTING.md). Both test suites also run automatically on GitHub (GitHub Actions) on every push, along with ESLint, which checks the code for common mistakes. To run ESLint yourself, use `npm run lint` in `backend` or `frontend`.

The ingredient parser and matcher, name normalizing, the seed script and the ingredient list itself (every entry loads, has a known source and no accidental duplicates), the photo-text cleanup, the ingredient-list check, ingredient search, saved products (only the owner can see, edit or delete them; duplicates; what gets saved), login, sign-up and email codes, login tokens, every route's login check (found automatically, so new routes are checked too), input validation, the photo and analyze endpoints (including Google Vision failing, timing out or not being set up), sending email (with Gmail faked), what each endpoint passes on and sends back (the user always comes from the login token, never the request; saved products never include their owner's ID) and rate limits (what each one allows and that it's on the right routes) are covered by Jest tests:

```bash
cd backend
npm test
```

The app has its own Jest tests (using `jest-expo`, Expo's setup for running Jest with React Native). They cover every call to the server (`services/api.js`: the right address and body, sending the login token, error messages, and logging out when the login stops working), shrinking photos before they're sent, the Saved list's sorting, grouping and "Non pore-clogging" filter, date formatting, the category list (including that it matches the server's), and the "Already saved" question:

```bash
cd frontend
npm test
```

## Rate limits

The API limits how often one person can make certain requests, using [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit). This stops password guessing, flooding inboxes with emailed codes, and running up the Google Vision bill (photo scans cost money after the first 1,000 a month). The limits are in [backend/middleware/rateLimits.js](backend/middleware/rateLimits.js):

| What | Limit | Counted per |
|---|---|---|
| Wrong passwords | 10 in 15 minutes (successful logins don't count) | Email address and IP address |
| New accounts | 20 an hour | IP address |
| Emailed codes (verification, forgot password) | 10 an hour (plus 1 a minute per account) | IP address |
| Entering codes | 20 in 15 minutes (plus 5 wrong guesses per code) | IP address |
| Photo scans | 50 a day | Logged-in user |
| Any API request | 1,000 in 15 minutes | IP address |

Going over a limit returns `429` with a message the app shows, e.g. "Too many login attempts. Please wait 15 minutes and try again." Counting wrong passwords per email means one person's mistakes can't lock out someone else on the same network, and counting photos per user means people sharing an IP address don't share a photo limit.

The counts are kept in the server's memory, so they reset when the server restarts (including every deploy). That's fine with one server; several servers would need a shared store such as Redis.

## Updating the ingredient list

The list is in [backend/seed/data/ingredients.json](backend/seed/data/ingredients.json). After editing it, run `npm run seed` in `backend` to update the database. `npm run seed -- --reset` clears the list first, which also removes anything taken out of the file.

## Deployment

**You don't need this section to run the project.** Everything in [Installation Instructions](#installation-instructions) works on your own computer for free. This section describes how the live version is hosted.

The API runs on [Render](https://render.com) as a web service on the Starter plan. The paid plan is needed because Render's free plan blocks the ports Gmail uses to send email, and sleeps when idle. Every push to `main` redeploys it automatically, so day-to-day work happens on the `dev` branch and is merged into `main` once tested.

The live API uses its own database, `ingredient-scanner-prod`, on the same Atlas cluster, so test accounts from local development never appear in the live app.

### Setting up the API on Render

1. **Create the service:** in Render, choose **New → Web Service**, connect the GitHub repo (give Render access to this repo only), and set:

   | Setting | Value |
   |---|---|
   | Branch | `main` |
   | Root Directory | `backend` |
   | Build Command | `npm ci` |
   | Start Command | `npm start` |
   | Instance Type | Starter |
   | Health Check Path (under Advanced) | `/api/health` |

2. **Add the environment variables:** the same ones as `backend/.env` (see [Start the API](#2-start-the-api)), with two differences:
   - **`MONGODB_URI`** uses the database name `ingredient-scanner-prod` (the part after `.mongodb.net/` and before `?`).
   - **`JWT_SECRET`** is a new random string, not the development one.

   Don't set `PORT`; Render sets it.

3. **Let Render reach the database:** in Render, open the service and go to **Connect → Outbound**. Add each IP range listed there in Atlas under **Network Access → Add IP Address**. Then choose **Manual Deploy → Deploy latest commit** in Render.

4. **Load the ingredient list into the live database:** from `backend` on your computer, run the seed script with the live connection string. Setting it on the command line overrides `.env` for that one command:

   ```bash
   MONGODB_URI='the-ingredient-scanner-prod-connection-string' npm run seed
   ```

   Run this again whenever `ingredients.json` changes.

5. **Check it:** `https://<service-name>.onrender.com/api/health` should show `{"status":"ok"}`. The other addresses start with `/api/` and are for the app, so the bare address shows `{"error":"Not found."}`.

6. **Set `TRUST_PROXY_HOPS` for the rate limits:** requests reach the server through Render's proxies, which pass on each user's real IP address in the `X-Forwarded-For` header. `TRUST_PROXY_HOPS` tells the server how many proxies to look past. Without it, everyone looks like the same visitor to the limits counted per IP address. To find the number:
   1. After a deploy, use the app once (any screen that loads data).
   2. In Render, open **Logs** and find the line starting `X-Forwarded-For has N address(es)`.
   3. Add an environment variable `TRUST_PROXY_HOPS` set to that number `N`. Render redeploys.
   4. After the next request, the same log line should show your own IP address as the client IP (compare with a "what is my IP" website).

   It was `2` when this was set up (October 2026). Leave it unset locally, where there's no proxy. It's a fixed number rather than "trust everything", because trusting too many would let anyone fake their IP address by sending their own header.

### Using the app with the live API

Set `EXPO_PUBLIC_API_URL` in `frontend/.env` to the Render address (`https://<service-name>.onrender.com`, with no port or slash at the end) and restart with `npx expo start --clear`. The app still loads through Expo Go from your computer, but all its requests go to Render, so the local API doesn't need to be running.

Getting the app onto phones as an installable app, without Expo Go, is still to come.

## Future Improvements

- **Installable app:** builds that install on phones without Expo Go (EAS Build for Android; TestFlight on iPhone).
- **Edit profile and change password** from the Profile tab.
- **Privacy policy screen.**
- **A larger ingredient database with information about each pore-clogging ingredient:** what it is, why it can clog pores, and other names it goes by on labels. The database already has `notes` and `aliases` fields for this, which are empty for now.
- **Barcode scanning** to look up a product instead of photographing its ingredient list.
- **Shared product database:** a searchable list of products and results submitted by users.
- **Social features** for sharing and discovering products with friends.


## Acknowledgments

Thank you to the licensed estheticians at the spa who compiled the pore-clogging ingredient list from the Acne Clinic NYC and Face Reality lists.
