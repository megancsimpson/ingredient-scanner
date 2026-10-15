# Ingredient Scanner

A mobile app for iPhone and Android that checks skincare and cosmetic ingredient lists for pore-clogging ingredients. Take a photo of a product's ingredient list (or paste the list in), and the app flags any ingredient on a list of known pore-clogging ingredients.

The ingredient list was compiled by licensed estheticians at a day spa from the Acne Clinic NYC and Face Reality pore-clogging ingredient lists. The idea came from working with those estheticians.

Built as a capstone project for an AI Software Development bootcamp.

> **Information only.** Ingredient Scanner flags ingredients that appear on published pore-clogging lists. It doesn't replace advice from a skincare professional.

## Features

- **Scan or paste:** photograph an ingredient list (text is read with Google Cloud Vision) or paste one in, then correct any misread words before checking.
- **Flagging:** each ingredient is checked against the 358-entry list, including keywords such as "Coconut" that flag every ingredient containing them. Ingredients are flagged, not rated.
- **Saved products:** save results with a name, brand and category; sort, group, filter to products with no flagged ingredients, edit, and swipe to delete.
- **Ingredient search:** look up any ingredient to see whether it's on the list and which source list it came from.
- **Accounts:** email and password login, email verification, forgot password with an emailed code, and account deletion.

## Tech stack

| Part | Technology |
|---|---|
| Mobile app | React Native with Expo, JavaScript, React Navigation |
| API | Node.js, Express |
| Database | MongoDB Atlas with Mongoose |
| Login | Passport.js (JWT), bcrypt |
| Photo text (OCR) | Google Cloud Vision API |
| Email | nodemailer with Gmail |
| Tests | Jest |

The full design (screens, data flow, API endpoints, data models, security and the reasons behind the main decisions) is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Project structure

```
ingredient-scanner/
├── frontend/   React Native (Expo) app
├── backend/    Node + Express API, Jest tests and the ingredient list
└── docs/       ARCHITECTURE.md
```

## Running it locally

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

## Tests

The ingredient parser and matcher, the photo-text cleanup, login and email codes, and the login checks are covered by Jest unit tests:

```bash
cd backend
npm test
```

## Updating the ingredient list

The list is in [backend/seed/data/ingredients.json](backend/seed/data/ingredients.json). After editing it, run `npm run seed` in `backend` to update the database. `npm run seed -- --reset` clears the list first, which also removes anything taken out of the file.

## Deployment

**You don't need this section to run the project.** Everything in [Running it locally](#running-it-locally) works on your own computer for free. This section describes how the live version is hosted.

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

5. **Check it:** `https://<service-name>.onrender.com/api/health` should show `{"status":"ok"}`. The other addresses start with `/api/` and are for the app, so the bare address shows "Cannot GET /".

### Using the app with the live API

Set `EXPO_PUBLIC_API_URL` in `frontend/.env` to the Render address (`https://<service-name>.onrender.com`, with no port or slash at the end) and restart with `npx expo start --clear`. The app still loads through Expo Go from your computer, but all its requests go to Render, so the local API doesn't need to be running.

Getting the app onto phones as an installable app, without Expo Go, is still to come.

## Acknowledgments

Thank you to the licensed estheticians at the spa who compiled the pore-clogging ingredient list from the Acne Clinic NYC and Face Reality lists.
