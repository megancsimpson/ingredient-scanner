# Architecture

**Design files**
- Architecture diagrams (component tree, data flow, data models): [FigJam board](https://www.figma.com/board/evxkEbVpD1bLMzt06rK5Z0)
- Screen wireframes and clickable prototype: [Figma wireframes](https://www.figma.com/design/7JIwblEbEnfJgthkhXWP2N)

## 1. Overview

Ingredient Scanner is a mobile app that checks skincare and cosmetic products for potentially pore-clogging ingredients. A user photographs an ingredient list (or pastes one in), the app converts the photo to text with OCR, and the server compares each ingredient against a database of known pore-clogging ingredients and flags any matches. Users can save checked products to review later and search the ingredient database directly.

The app is an informational tool and does not replace professional skincare advice.

## 2. Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Mobile app | React Native (Expo), JavaScript | User interface and device features (camera) |
| Navigation | React Navigation | Auth stack and bottom tabs |
| Back end | Node.js, Express | REST API and business logic |
| Database | MongoDB (Atlas), Mongoose | Data storage, schemas and validation |
| Authentication | Passport.js (passport-jwt), bcrypt, JSON Web Tokens | Email/password login (checked with bcrypt in `authService`) and protected routes (checked by Passport's JWT strategy) |
| OCR | Google Cloud Vision API (`DOCUMENT_TEXT_DETECTION`) | Converting ingredient photos to text |
| Gestures | react-native-gesture-handler, react-native-reanimated | Swipe to delete on the saved products list |
| Camera and photos | expo-camera, expo-image-picker, expo-image-manipulator | Taking or choosing a photo and shrinking it before upload |
| Email | nodemailer, Gmail (app password) | Sending verification and "forgot password" codes, and welcome emails |
| Testing | Jest | Unit tests |

## 3. System architecture

```
┌──────────────────────┐   HTTPS + JWT   ┌──────────────────────────────┐
│  React Native app    │ ──────────────▶ │  Express API                 │
│  screens, components │ ◀────────────── │  routes → controllers →      │
│  AuthContext, hooks  │      JSON       │  services → models           │
│  services/api.js     │                 └──────┬───────────────┬───────┘
└──────────────────────┘                        │               │
                                                ▼               ▼
                                         ┌────────────┐   ┌─────────────┐
                                         │  MongoDB   │   │ OCR service │
                                         └────────────┘   └─────────────┘
```

The app never communicates with the database or the OCR provider directly. All requests go through the Express API, which keeps secrets (database credentials, OCR API key, JWT secret) on the server and gives a single place to enforce authentication and validation.

## 4. Front end

### 4.1 Navigation structure

```
App
└── AuthProvider (Context)
    └── RootNavigator
        ├── Auth Stack (logged out)
        │   ├── LoginScreen
        │   ├── RegisterScreen
        │   ├── ForgotPasswordScreen
        │   └── ResetPasswordScreen
        ├── VerifyEmailStack (logged in, email not verified)
        │   └── VerifyEmailScreen
        └── AppTabs (logged in, email verified)
            ├── Scan tab
            │   ├── ScanHomeScreen
            │   ├── CameraScreen
            │   ├── ReviewTextScreen
            │   ├── ResultsScreen
            │   └── SaveProductModal
            ├── Saved tab
            │   ├── SavedProductsScreen
            │   ├── ProductDetailScreen
            │   └── EditProductModal
            ├── Ingredients tab
            │   ├── IngredientSearchScreen
            │   └── IngredientDetailScreen
            └── Profile tab
                ├── ProfileScreen
                │   └── DeleteAccountDialog (overlay)
                ├── FlaggingGuideScreen
                └── AboutScreen
```

`RootNavigator` chooses between the Auth Stack, VerifyEmailStack and AppTabs based on whether `AuthProvider` holds a valid token and whether the user's email is verified. Logging in or out, or verifying, switches the whole app automatically, and app screens cannot be reached while logged out or unverified. (If the app opens offline and the user's details can't be loaded, AppTabs is shown as before; the server still refuses requests from unverified users.)

Each tab has its own stack, so a user's place within one tab is kept when switching to another.

### 4.2 Screens

| Screen | Responsibility |
|---|---|
| LoginScreen / RegisterScreen | Collect credentials and call `login()` / `register()` from AuthContext. LoginScreen links to ForgotPasswordScreen, passing the email already typed |
| VerifyEmailScreen | Shown after signing up, or after logging in to an unverified account. Emails a 6-digit code when it opens (keeping one that still works), then calls `verifyEmail()` from AuthContext with the code, which opens the app. "Send a new code" after 60 seconds; "Wrong email? Start over" deletes the account after confirming (the phone's own alert) so the user can sign up again; "Log out" |
| ForgotPasswordScreen | Enter an email and ask the server to email a 6-digit code, then open ResetPasswordScreen |
| ResetPasswordScreen | Enter the code and a new password (with confirmation); calls `resetPassword()` from AuthContext, which logs the user in. "Send a new code" is available after 60 seconds |
| ScanHomeScreen | Choose between taking a photo or pasting an ingredient list. A short tip says photos work best when the whole list fits in one shot (flat boxes), and to paste the list for round bottles; the longer version is in FlaggingGuideScreen |
| CameraScreen | Take a photo (or choose one from the library), shrink it to 2000 px on the longest side, send it for OCR, then open ReviewTextScreen with the text. Centered framing guide, flashlight toggle, a "Blurry? Use your phone's camera" button (opens the phone's own Camera with `launchCameraAsync`, which has tap-to-focus and close-up handling that expo-camera lacks; this screen's preview is switched off meanwhile, since only one camera can run at a time), and a permission screen with "Open Settings" if the camera was refused. The camera preview only runs while the screen is focused |
| ReviewTextScreen | Let the user correct OCR mistakes (or paste text) before analysis. For photos with no "Ingredients" heading, a notice explains that all the text is shown and asks the user to delete non-ingredients or retake the photo |
| ResultsScreen | Show flagged ingredients, the full list and a disclaimer. "Edit" in the header shows × buttons to remove pieces that aren't ingredients (e.g. pasted website text), with "Undo all changes". Removing an ingredient removes its flag; saving sends the remaining names joined with ", " |
| SaveProductModal | Collect product name (required), brand and category (optional), then save. If the same name and brand is already saved, asks "Already saved" with Cancel, Keep both or Replace (the phone's own alert; three buttons is Android's maximum). Cancel saves nothing and returns to a fresh ScanHomeScreen. A stack screen with `presentation: 'modal'`: a sheet on iOS (with a Cancel button), a full screen on Android |
| SavedProductsScreen | List the user's saved products, with an empty state. Swipe a product left to show a Delete button (asks to confirm first; screen readers get a Delete action instead). Sort by newest or name, group by brand or category, or show only "Non pore-clogging" products (no flagged ingredients) (sorted in the app with `utils/organizeProducts.js`; resets when the app restarts) |
| ProductDetailScreen | Show a saved product's results; Edit button in the header; delete the product |
| EditProductModal | Change a saved product's name, brand and category, or delete it (results can't be edited). Asks the same "Already saved" question if the new name and brand match another product; Cancel discards the edits and returns to the unchanged product. Same modal style as SaveProductModal |
| IngredientSearchScreen | Search the ingredient list (whole list A to Z until something is typed). Waits 300 ms after typing before searching and ignores out-of-date responses. Notes that it checks one ingredient at a time; if a whole list is pasted (commas, semicolons or line breaks), it warns and offers to send the list to ReviewTextScreen on the Scan tab |
| IngredientDetailScreen | Show one ingredient's alternate names, source list(s) and notes |
| ProfileScreen | Account info, links to the guide and About, log out, delete account |
| DeleteAccountDialog | Confirm permanent deletion of the account and all saved products (a React Native `Modal`; Android's back button cancels) |
| FlaggingGuideScreen | Explain how flagging works: what a flag means, where the list comes from, how matching works (keywords, whole words), what "Non pore-clogging" means, and tips for accurate results |
| AboutScreen | App purpose, data source, full disclaimer, version (read from `app.json` with `expo-constants`) |

### 4.3 Reusable components

| Component | Used in | Purpose |
|---|---|---|
| FlaggedIngredientCard | IngredientResults, IngredientSearchScreen | One flagged ingredient with its source list(s); tappable when given `onPress`; × button when given `onRemove` |
| IngredientList | IngredientResults | Full parsed ingredient list, flagged ones highlighted; × buttons when given `onRemove` |
| RemoveButton | IngredientList, FlaggedIngredientCard | Small × button with an enlarged tap area |
| IngredientResults | ResultsScreen, ProductDetailScreen | Summary line, flagged ingredients and full list, so new and saved results look the same |
| ProductDetailsForm | SaveProductModal, EditProductModal | Product name, brand and category fields with submit and Cancel buttons |
| ChipSelect | ProductDetailsForm, SavedProductsScreen | Row of tappable chips where one can be selected (category picker, sort options); used instead of a native picker, which differs a lot between iOS and Android |
| SavedProductRow | SavedProductsScreen | One saved product in the list: name, brand, category, date and flagged count; swipe left for Delete (`ReanimatedSwipeable` from react-native-gesture-handler) |
| SearchBar | IngredientSearchScreen | Search input with its own clear button (iOS's built-in one doesn't exist on Android) |
| TextField | SaveProductModal, LoginScreen, RegisterScreen, ForgotPasswordScreen, ResetPasswordScreen | Labeled text input with error message |
| MenuRow | ProfileScreen | Tappable menu item |
| Disclaimer | ResultsScreen, ProductDetailScreen, IngredientDetailScreen, FlaggingGuideScreen, AboutScreen | "Information only" notice (short everywhere; full on AboutScreen) |
| LoadingOverlay | ReviewTextScreen, CameraScreen | Spinner while waiting for the server |
| Button | Throughout | Primary and secondary styles |

## 5. State management

State is kept as local as possible, and only data that the whole app needs is global.

| State | Where it lives | Why |
|---|---|---|
| Logged-in user and JWT | `AuthContext` (React Context), persisted with `expo-secure-store` | Needed app-wide; decides which navigator shows; persists between sessions |
| Current scan (photo → text → results) | Navigation params between Scan screens | Only relevant to one flow; nothing to share globally |
| Saved products | Fetched from the API with a custom hook (`useSavedProducts`) | Server is the source of truth; refetched after saving or deleting |
| Ingredient search results | Local state in IngredientSearchScreen | Only used on one screen |
| Form input, loading and error states | Local `useState` in each screen or component | Short-lived UI state |

Context plus hooks is sufficient for an app of this size. A state library such as Redux was considered and not used because it would add complexity without solving a problem this app has.

## 6. Data flow: scanning and saving a product

1. **Capture.** The user takes a photo on `CameraScreen`.
2. **OCR request.** The app shrinks the photo and sends `POST /api/ocr` with it as base64 JPEG and the user's JWT.
3. **OCR.** The server's `ocrService` sends the image to Google Cloud Vision and receives all the text on the package; `extractIngredientSection` keeps only the ingredient list.
4. **OCR response.** The server returns the text (`200`), and the app opens `ReviewTextScreen`.
5. **Review.** The user corrects any OCR errors. (Users who paste text start here.)
6. **Analyze request.** The app sends `POST /api/analyze` with the final text.
7. **Parse and match.** `ingredientParser` splits and normalizes the text; `ingredientMatcher` queries the Ingredient collection by name and aliases.
8. **Analyze response.** The server returns the parsed list and flagged ingredients (`200`).
9. **Results.** `ResultsScreen` displays the results. Nothing is saved yet.
10. **Save form.** The user taps Save and enters a product name and optional brand in `SaveProductModal`.
11. **Save request.** The app sends `POST /api/products` with the name, brand, ingredient text and source (not the results).
12. **Store.** The server analyzes the text again, attaches the user ID from the JWT and inserts a SavedProduct (`201 Created`).
13. **Confirm.** The app navigates to `SavedProductsScreen`, which now includes the product.

Separating OCR from analysis gives the user a chance to fix misread ingredients, which would otherwise be silently missed, and lets photo and paste input share the same analysis path. Separating analysis from saving lets users check any number of products without cluttering their saved list.

## 7. Back end

### 7.1 Layered structure

| Layer | Responsibility |
|---|---|
| Routes | Map URLs and HTTP methods to controllers; apply middleware |
| Middleware | Cross-cutting concerns: authentication, error handling |
| Controllers | Read the request, call services, send the response |
| Services | Business logic: OCR, ingredient parsing and matching. `analysisService` loads ingredients from MongoDB and runs the parser and matcher |
| Models | Mongoose schemas, validation and database access |

### 7.2 API endpoints

In the Auth column, "Yes" needs a login token and a verified email (`requireAuth`); "Login only" needs a login token but also works before the email is verified (`requireLogin`).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | `{ name, email, password }` in; `201 { token, user }` out. `400` invalid input, `409` email already registered. The new account's email is unverified |
| POST | `/api/auth/login` | No | `{ email, password }` in; `{ token, user }` out. `401` with the same message whether the email or password is wrong |
| POST | `/api/auth/send-verification` | Login only | `{ resend? }` in; `204`. Emails a 6-digit code to verify the user's email. Without `resend: true`, a code that still works is kept instead of sending another; nothing is sent within a minute of the last code, or if the email is already verified. `502` email couldn't be sent, `503` email not set up |
| POST | `/api/auth/verify-email` | Login only | `{ code }` in; `{ user }` out with `emailVerified: true`, then sends the welcome email in the background (verification succeeds even if it fails). `400` code wrong, expired (15 minutes), used up (5 wrong guesses) or already used, all with the same message |
| POST | `/api/auth/forgot-password` | No | `{ email }` in; `200 { message }` out whether or not the email has an account. If it has one, emails a 6-digit code (not more than once a minute). `502` email couldn't be sent, `503` email not set up |
| POST | `/api/auth/reset-password` | No | `{ email, code, password }` in; `{ token, user }` out (logged in, and the email counts as verified). `400` invalid password, or a code that is wrong, expired (15 minutes), used up (5 wrong guesses) or already used, all with the same message |
| GET | `/api/auth/me` | Login only | `{ user }`: the current user's profile |
| DELETE | `/api/auth/me` | Login only | Delete the current user's account and all their saved products; `204` |
| POST | `/api/ocr` | Yes | `{ image }` (base64 JPEG/PNG) in; `{ text, ingredientsFound }` out. `text` is just the ingredient list when the photo has an "Ingredients" heading (`ingredientsFound: true`), otherwise all the text in the photo. `400` missing, too large or unreadable image; `422` no text found; `502`/`503` OCR service failed or not set up. Accepts bodies up to 8 MB (mounted before the app-wide 100 KB JSON parser; the login check runs before the body is read) |
| POST | `/api/analyze` | Yes | `{ text }` in; `{ ingredients: [{ name, normalized }], flagged: [...] }` out. `400` if the text is missing, over 10,000 characters or has no ingredients |
| GET | `/api/products` | Yes | `{ products }`: the current user's saved products, newest first, without `rawText` and `ingredients` |
| GET | `/api/products/:id` | Yes | `{ product }`: one saved product (owner only; `404` otherwise) |
| POST | `/api/products` | Yes | `{ productName, brand?, category?, rawText, source?, onDuplicate? }` in; `201 { product }` out. The server analyzes `rawText` itself. If a product with the same name and brand (ignoring case and surrounding spaces) is already saved, returns `409 { error, duplicate: { id, productName, brand, createdAt } }` unless `onDuplicate` is `replace` (save, then delete the old one) or `keep` (save both) |
| PATCH | `/api/products/:id` | Yes | `{ productName?, brand?, category?, onDuplicate? }` in; `{ product }` out. Only these can change; an empty or null brand or category removes it (owner only). Returns the same `409 { error, duplicate }` as POST if the new name and brand match another product (the product itself doesn't count); `replace` deletes the other product, `keep` keeps both |
| DELETE | `/api/products/:id` | Yes | Delete a saved product (owner only); `204` |
| GET | `/api/ingredients?search=` | Yes | `{ ingredients }` A to Z: those whose name or alias contains the search, plus those that would flag the search text if it were on a label (same rule as the matcher). Empty search returns all; `400` over 200 characters |
| GET | `/api/ingredients/:id` | Yes | `{ ingredient }`: `{ id, name, aliases, sources, notes? }`; `404` if not found |

Every error response has the same shape, `{ "error": "message for the user" }`, sometimes with extra details for the app (e.g. `duplicate` on a `409` from `POST /api/products`). The `errorHandler` middleware catches unexpected errors, logs them on the server and returns a generic `500` message so internal details never reach the app.

### 7.3 Ingredient parsing and matching

Ingredient matching is the core logic of the app and lives in two pure functions:

- **`ingredientParser`** (`parseIngredients(text)`) splits the text into individual ingredients and normalizes each one with `normalizeIngredient`. It splits on commas, semicolons, bullets and the word "and" ("Beet Root Extract and Vegetable Glycerin"), never inside parentheses, and not at a comma between digits ("1,2-Hexanediol"). Ingredient blends in square brackets ("Phytonutrient Blend [Aloe Leaf Juice, Sunflower Seed Oil]") are opened up so the blend name and each ingredient inside are separate; brackets holding a single item ("Iron Oxides [CI 77491]") are kept like parentheses. Line breaks also separate ingredients when the text is a one-per-line list: when any line starts with a bullet or list marker ("•", "●", "- ", "* ", "1."), or when there are fewer commas than lines. Otherwise it's a comma-separated label and line breaks are just wrapping ("Isopropyl\nMyristate"). Counting commas against lines means a few commas in other text, such as an address in a pasted website footer, can't join a whole list into one ingredient. It removes headings ("Ingredients:", "Inactive Ingredients:", "May Contain (+/-):", or "Ingredients" alone on a line), percentages, footnotes ("*Certified Organic"), contact details and copyright lines (emails, web addresses, phone numbers, "©") and duplicates. Each ingredient is returned as `{ name, normalized, variants }`: `name` for display, `normalized` for saving, and `variants` listing every name the matcher should check. For example, "Water/Aqua/Eau" gives `water`, `aqua` and `eau`, and "Zea Mays (Corn) Oil" gives the full name, the name without "(Corn)", and `corn`.
- **`ingredientMatcher`** (`matchIngredients(parsedIngredients, dbIngredients)`) compares the parsed list against each Ingredient's `normalized` name and `aliases`. An ingredient is flagged when any of its variants **contains a database name as whole words**. A keyword such as "Coconut" therefore flags "Cocos Nucifera (Coconut) Oil" and "Coconut Alkanes", but "Laureth 4" does not flag "Laureth 40". It returns the flagged ingredients in label order as `{ name, normalized, sources, matches }`, where `matches` lists each database ingredient that caused the flag and `sources` combines their source lists. The caller loads the Ingredient documents and passes them in, so the matcher itself never touches the database.

**`extractIngredientSection`** (`services/ingredientSection.js`) runs on OCR text before the parser. A photo of a package includes the brand, directions, warnings and address, so it keeps only the text after an "Ingredients" heading: English or French ("Ingrédients"), bilingual ("Ingredients/Ingrédients"), "Active/Inactive Ingredients", followed by a colon or line break so sentences like "made with natural ingredients" don't count, and not "Key ingredients" highlights. Each list ends at a period that ends a line or paragraph (not abbreviations like "No."), at a paragraph that looks like company or legal text ("Inc.", "LLC", "Ltd", a numbered street address, phone number, website, email, Canadian postal code, "©", "trademark"; not "™"/"®" or 5-digit numbers, which blends and pigments use), at the next section ("Directions", "Warnings", "Made in", "Distributed by", "trademark", "©", a web address, French equivalents), or at barcode digits, batch numbers or the "12M" (months after opening) symbol: a line of only numbers with at least 8 digits or "12M", or a number of 6 or more digits partway along a line. Shorter numbers are kept, since ingredients have them ("CI 77491", "Polysorbate 20"). Other paragraph breaks don't end it, because Vision sometimes splits one list into several paragraphs where a long name wraps. A period in the middle of a line doesn't end it either, because OCR often misreads commas as periods in small print; cutting a list short would silently miss ingredients. Paragraphs come from Vision's layout: `ocrService` rebuilds the text from Vision's pages, blocks and paragraphs with a blank line between paragraphs, since Vision's plain text has no paragraph gaps. Separate English and French lists are both kept; the parser removes duplicates. It returns `null` when there's no heading, and the full text is used instead. It's a pure function with Jest tests.

Both build on **`normalizeIngredient`** (`backend/utils/normalize.js`), which lowercases a name, replaces anything other than letters, numbers and "+" with a space, and collapses spaces (e.g. "D&C Red # 17" → "d c red 17"). The seed script uses the same function, so scanned names and stored names are always compared in the same form.

Because they are pure functions with no database or network access in their core logic, they are straightforward to unit test with Jest.

## 8. Data models

### User
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `email` | String | Required, unique, lowercase, trimmed, basic format check |
| `passwordHash` | String | bcrypt hash (12 rounds); `select: false` so queries leave it out unless asked, and removed from JSON |
| `passwordChangedAt` | Date | Set when the password is reset; login tokens issued before it stop working. Removed from JSON |
| `passwordReset` | { codeHash, sentAt, attempts } | Current "forgot password" code: bcrypt hash, when it was sent, wrong guesses so far. `select: false`, removed from JSON, and deleted once used |
| `emailVerified` | Boolean | Default `false`; `true` once the user enters the emailed verification code (or resets their password). Accounts made before verification existed load as `false` and are asked once |
| `emailVerification` | { codeHash, sentAt, attempts } | Current verification code, stored and limited like `passwordReset`. `select: false`, removed from JSON, and deleted once verified |
| `name` | String | Required, trimmed, max 100 characters |
| `createdAt`, `updatedAt` | Date | Automatic timestamps |

The API sends a user as `{ id, email, name, emailVerified, createdAt }`.

### SavedProduct
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `user` | ObjectId → User | Required, indexed; set on the server from the JWT, never from the request; not included in API responses |
| `productName` | String | Required, trimmed, max 100 characters |
| `brand` | String | Optional, trimmed, max 100 characters |
| `category` | String | Optional; one of the codes in `PRODUCT_CATEGORIES`: `cleanser`, `toner`, `astringent`, `exfoliant`, `serum`, `retinoid`, `moisturizer`, `eye`, `lip`, `sunscreen`, `mask`, `makeup`, `hair`, `body`, `detergent`, `other`. The app's display names are in `frontend/src/utils/categories.js`; keep both lists in sync |
| `rawText` | String | Ingredient text as analyzed |
| `ingredients` | [{ name, normalized }] | Parsed ingredient list in label order (display names kept so the saved product looks the same as the original results) |
| `flagged` | [{ name, normalized, sources, matches: [{ name, sources }] }] | Snapshot of flagged ingredients at save time; database IDs aren't stored |
| `source` | String | Enum: `photo`, `paste`; default `paste` |
| `createdAt`, `updatedAt` | Date | Automatic timestamps |

### Ingredient
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `name` | String | Required; display name as written in the source list (e.g. "Coconut Oil") |
| `normalized` | String | Required, unique, indexed; name run through `normalizeIngredient` (e.g. "coconut oil"), used for matching |
| `aliases` | [String] | Other names found on labels, stored normalized; indexed |
| `sources` | [String] | Which reference list(s) the ingredient came from (e.g. "Acne Clinic NYC", "Face Reality") |
| `notes` | String | Optional |
| `createdAt`, `updatedAt` | Date | Automatic timestamps |

The Ingredient collection is reference data. Licensed estheticians at the spa compiled the list from published pore-clogging ingredient lists (Acne Clinic NYC and Face Reality), and each ingredient records which list(s) it came from in `sources`. The list is stored in `backend/seed/data/ingredients.json` and loaded with `npm run seed`. The seed script normalizes each name, merges duplicates (combining their sources) and upserts by `normalized`, so it is safe to run more than once; `npm run seed -- --reset` clears the collection first. Users cannot create or edit ingredients.

The current list has 358 entries with names and sources only; no aliases or notes yet.

### Relationships
- **User → SavedProduct: one to many.** Each saved product belongs to one user; queries are always filtered by the logged-in user's ID. Deleting an account also deletes all of that user's saved products.
- **SavedProduct → Ingredient: snapshot, not reference.** `ingredients` and `flagged` store copies of names and sources rather than links. Saved products keep showing what the user saw when they saved them, and loading them needs no extra lookups. Trade-off: saved products don't pick up changes to the ingredient list automatically.

## 9. Security

- **Passwords** must be 8–72 characters (bcrypt ignores anything past 72 bytes), are hashed with bcrypt and are never stored or returned in plain text. Login errors don't reveal whether an email has an account.
- **Password reset** uses a 6-digit code emailed to the user (a code, not a link, because a link would need deep-link setup on both iOS and Android). The code comes from Node's secure random generator, is stored only as a bcrypt hash, expires after 15 minutes, stops working after 5 wrong guesses and works once. Each guess is counted in the same database update that finds the code, so many guesses sent at once can't get past the limit. The forgot-password response is the same whether or not the email has an account, and a new code is emailed at most once a minute. Resetting logs out every other device (tokens issued before `passwordChangedAt` are rejected).
- **JWTs** contain only the user ID (`sub`), are signed with `JWT_SECRET`, expire after 7 days, are stored on the device with `expo-secure-store` (iOS Keychain / Android Keystore), and are sent in the `Authorization: Bearer` header by `api.js`. If the server rejects a token (`401`), the app logs out automatically.
- **Email verification:** a new account can't use the app until the user enters a 6-digit code emailed to them, proving the address is theirs. The code works like the password reset code (hashed, 15 minutes, 5 guesses, once). The welcome email is sent only after verifying. A reset password also verifies the email, since the code reached the inbox. If someone signs up with another person's address and never verifies, the real owner can use "Forgot password?" to take the account over.
- **Auth middleware** (`requireAuth`) verifies the token on every protected route, checks the user still exists, the token isn't from before a password reset and the email is verified (`403` otherwise), and attaches the user to the request as `req.user`. `requireLogin` skips the email check; it's used only on the routes an unverified user needs (`/api/auth/me`, `send-verification` and `verify-email`), so every other route requires a verified email by default.
- **Ownership checks:** saved products are always queried and deleted by both product ID and user ID. Another user's product returns the same `404` as one that doesn't exist, so responses don't reveal that it's there.
- **Account deletion:** from the Profile tab after confirming. The server removes the User and all their SavedProducts; the app clears the stored token and returns to the login screen.
- **Secrets** (MongoDB URI, JWT secret, OCR API key, Gmail app password) are stored in a `.env` file excluded from Git during development, and in the hosting provider's environment variables once deployed.
- **Validation** is enforced in Mongoose schemas so invalid data is rejected regardless of route.

## 10. Folder structure

```
ingredient-scanner/
├── frontend/        React Native (Expo) app
│   ├── App.js
│   └── src/
│       ├── navigation/      RootNavigator, AuthStack, AppTabs
│       ├── screens/         one file per screen
│       ├── components/      reusable UI components
│       ├── context/         AuthContext.js
│       ├── hooks/           useAuth.js, useSavedProducts.js
│       ├── services/        api.js (all HTTP calls)
│       └── utils/           formatting helpers
├── backend/         Node + Express API
│   ├── index.js
│   ├── config/              database connection, Passport setup
│   ├── routes/              auth, ocr, analyze, products, ingredients
│   ├── controllers/         one per route group
│   ├── services/            ocrService, ingredientSection, analysisService, ingredientParser, ingredientMatcher, emailService
│   ├── models/              User, SavedProduct, Ingredient
│   ├── middleware/          auth.js, errorHandler.js
│   ├── seed/                data/ingredients.json and seedIngredients.js
│   ├── utils/               normalize.js (shared by seed script and parser)
│   └── tests/               Jest unit tests
├── docs/
│   └── ARCHITECTURE.md
├── CLAUDE.md        Project context for Claude Code (imports ARCHITECTURE.md)
└── README.md
```

## 11. Design patterns and principles

| Pattern / principle | Where it's applied |
|---|---|
| **Separation of concerns** | Back end split into routes, controllers, services and models; front end split into screens, components, context, hooks and services |
| **Layered (MVC-style) architecture** | Express request flow: route → middleware → controller → service → model |
| **Service layer** | `services/api.js` is the only place the app makes HTTP calls; server services hold business logic so controllers stay thin |
| **Container / presentational components** | Screens fetch data and handle logic; reusable components only display the props they receive |
| **Provider pattern (Context)** | `AuthProvider` shares authentication state across the app |
| **Custom hooks** | `useAuth` and `useSavedProducts` package reusable stateful logic |
| **Middleware** | Authentication and error handling applied consistently across routes |
| **Modularization** | Reusable UI components mirrored as Figma components in the wireframes; one module per responsibility on the server |
| **Single source of truth** | The server owns saved data; the app refetches rather than keeping a separate copy |

## 12. Key decisions

| Decision | Reasoning |
|---|---|
| Email/password login instead of Google sign-in | Works on any device without developer accounts or fees; demonstrates building authentication directly |
| Render Starter ($7/month) for the API | Free plans that fit (Render Free, Railway Hobby) block outgoing email ports, which Gmail needs; Render Free also sleeps after 15 minutes idle and takes about a minute to wake, which would make the app's first request time out. Starter keeps the server always on and allows email with no code changes |
| Separate live database | Same Atlas cluster (free), different database name, so test accounts and data never appear in the live app and local testing can't affect real users |
| Gmail with nodemailer for email | Free and needs no domain; the app only sends occasional "forgot password" codes and welcome emails, well under Gmail's daily limit. Uses an app password (needs 2-Step Verification on the Google account) kept in `.env`. Only `emailService` knows the provider, so it can be swapped for a service such as Resend or SendGrid |
| OCR on the server, not the device | Keeps the OCR API key secret; simpler app setup |
| Google Cloud Vision for OCR | Built for reading text in photos (Document AI is aimed at scanned business documents and needs more setup). `DOCUMENT_TEXT_DETECTION` suits dense text. 1,000 images a month free, then $1.50 per 1,000. Called with a restricted API key (Cloud Vision only) kept in `.env`; only `ocrService` knows the provider, so it can be swapped |
| Review step after OCR | OCR errors would cause pore-clogging ingredients to be missed |
| Snapshot of results in saved products | Preserves what the user saw; avoids extra lookups |
| Fixed list of product categories | Users pick from a list rather than typing, so grouping by category works (no "Moisturizer" vs. "moisturiser"). Codes are stored, not display names, so names can change without updating saved products |
| Duplicate check on the server | Same name and brand (ignoring case) counts as a duplicate; the server checks because it has the real list. Replace saves the new product before deleting the old one, so a failed save never loses data |
| Server re-analyzes when saving | The app sends the ingredient text, not the results, so saved results always come from the server and can't be faked by a modified app |
| Save form as a modal | User keeps the results in view and can cancel easily |
| Context and hooks instead of Redux | Only authentication state is global; a state library isn't justified at this size |
| Expo | Simplifies setup, camera access and testing on real devices |
| Account deletion with confirmation | Users control their own data; app stores expect it; confirmation prevents accidents |
| Ingredient list compiled by estheticians | The spa's licensed estheticians compiled it from Acne Clinic NYC and Face Reality lists; reflects professional knowledge from the spa the app was built for |
| Flagging instead of 1–5 ratings | The estheticians' source lists identify pore-clogging ingredients but don't rate them, so an ingredient is either flagged or not |
| Keywords flag any ingredient that contains them (whole words) | The list includes keywords such as "Coconut", "Shea" and "Myristate" that are meant to cover every ingredient containing them; whole-word matching avoids false flags like "Laureth 4" in "Laureth 40" |
| No admin login or roles | The developer maintains the ingredient list by editing `seed/data/ingredients.json` and running `npm run seed`, and manages accounts in MongoDB Atlas. Admin screens would add work and attack surface without solving a need |
| Ingredient search reuses the parser and matcher | The list is small, so it's searched in memory with the same rules as scanning; searching a full label name shows exactly the entries that would flag it |
| One shared normalize function | Seed data and scanned text are normalized the same way, so formatting differences ("D&C Red 17" vs. "D & C Red # 17") don't cause missed matches |
| Private repo, deployed app | Deployment is a project requirement; the repo stays private as agreed with the professor. During development the app runs locally and through Expo |

## 12a. Deployment

| Part | Where | Notes |
|---|---|---|
| API | Render web service, Starter instance | Root directory `backend`, build `npm ci`, start `npm start`, health check `/api/health`. Node version pinned with `engines` in `backend/package.json`. Redeploys automatically on every push to `main` |
| Database | MongoDB Atlas, same cluster as development | The live API uses its own database, `ingredient-scanner-prod`; local development uses the default `test` database, so test data never mixes with real users. Atlas Network Access allows Render's outbound IP ranges |
| Secrets | Render environment variables | `MONGODB_URI` (with the `ingredient-scanner-prod` database name), `JWT_SECRET` (different from development, so local logins don't work on the live API), `GOOGLE_VISION_API_KEY`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`. Render sets `PORT` |
| Ingredient list | Loaded into the live database by running the seed script locally with the live `MONGODB_URI` | Run again after editing `ingredients.json` |

**Branches:** `main` is what's live; day-to-day work happens on `dev` and is merged into `main` once tested.

## 13. Open decisions

- **App distribution.** The API is live on Render (see section 12a); how the mobile app gets onto phones without Expo Go is still to be decided, most likely EAS Build (an installable Android build; TestFlight on iPhone, which needs an Apple Developer account).
- **Vision key restriction (to do).** Render's outbound IP ranges are fixed, so the Google Vision API key can be restricted to them in Google Cloud. Keep a Google Cloud budget alert on the billing account.

## 14. Future improvements (out of scope for now)

- Google and Apple sign-in
- Edit profile and change password
- Privacy policy screen
- Re-check a saved product against the latest ingredient list
- Shared, searchable database of products submitted by users
- Social features for sharing and discovering products with friends
- Barcode scanning to look up products
