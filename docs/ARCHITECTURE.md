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
| OCR | Cloud OCR provider (e.g. Google Cloud Vision) | Converting ingredient photos to text |
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
        │   └── RegisterScreen
        └── AppTabs (logged in)
            ├── Scan tab
            │   ├── ScanHomeScreen
            │   ├── CameraScreen
            │   ├── ReviewTextScreen
            │   ├── ResultsScreen
            │   └── SaveProductModal
            ├── Saved tab
            │   ├── SavedProductsScreen
            │   └── ProductDetailScreen
            ├── Ingredients tab
            │   ├── IngredientSearchScreen
            │   └── IngredientDetailScreen
            └── Profile tab
                ├── ProfileScreen
                │   └── DeleteAccountDialog (overlay)
                ├── FlaggingGuideScreen
                └── AboutScreen
```

`RootNavigator` chooses between the Auth Stack and AppTabs based on whether `AuthProvider` holds a valid token. Logging in or out switches the whole app automatically, and app screens cannot be reached while logged out.

Each tab has its own stack, so a user's place within one tab is kept when switching to another.

### 4.2 Screens

| Screen | Responsibility |
|---|---|
| LoginScreen / RegisterScreen | Collect credentials and call `login()` / `register()` from AuthContext |
| ScanHomeScreen | Choose between taking a photo or pasting an ingredient list |
| CameraScreen | Capture a photo and send it for OCR |
| ReviewTextScreen | Let the user correct OCR mistakes (or paste text) before analysis |
| ResultsScreen | Show flagged ingredients, the full list and a disclaimer |
| SaveProductModal | Collect product name (required) and brand (optional), then save |
| SavedProductsScreen | List the user's saved products, with an empty state |
| ProductDetailScreen | Show a saved product's results; delete the product |
| IngredientSearchScreen | Search the ingredient database |
| IngredientDetailScreen | Show one ingredient's alternate names, source list(s) and notes |
| ProfileScreen | Account info, links to the guide and About, log out, delete account |
| DeleteAccountDialog | Confirm permanent deletion of the account and all saved products |
| FlaggingGuideScreen | Explain how flagging works: what a flag means and where the ingredient list comes from |
| AboutScreen | App purpose, data source, full disclaimer, version |

### 4.3 Reusable components

| Component | Used in | Purpose |
|---|---|---|
| FlaggedIngredientCard | ResultsScreen, ProductDetailScreen, IngredientSearchScreen | One flagged ingredient with its source list(s) |
| IngredientList | ResultsScreen, ProductDetailScreen | Full parsed ingredient list |
| SavedProductRow | SavedProductsScreen | One saved product in the list |
| SearchBar | IngredientSearchScreen | Search input |
| TextField | SaveProductModal, LoginScreen, RegisterScreen | Labeled text input with error message |
| MenuRow | ProfileScreen | Tappable menu item |
| Disclaimer | ResultsScreen, AboutScreen | "Information only" notice (short or full) |
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
2. **OCR request.** The app sends `POST /api/ocr` with the image and the user's JWT.
3. **OCR.** The server's `ocrService` sends the image to the OCR provider and receives the extracted text.
4. **OCR response.** The server returns the text (`200`), and the app opens `ReviewTextScreen`.
5. **Review.** The user corrects any OCR errors. (Users who paste text start here.)
6. **Analyze request.** The app sends `POST /api/analyze` with the final text.
7. **Parse and match.** `ingredientParser` splits and normalizes the text; `ingredientMatcher` queries the Ingredient collection by name and aliases.
8. **Analyze response.** The server returns the parsed list and flagged ingredients (`200`).
9. **Results.** `ResultsScreen` displays the results. Nothing is saved yet.
10. **Save form.** The user taps Save and enters a product name and optional brand in `SaveProductModal`.
11. **Save request.** The app sends `POST /api/products` with the name, brand and results.
12. **Store.** The server attaches the user ID from the JWT and inserts a SavedProduct (`201 Created`).
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

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | `{ name, email, password }` in; `201 { token, user }` out. `400` invalid input, `409` email already registered |
| POST | `/api/auth/login` | No | `{ email, password }` in; `{ token, user }` out. `401` with the same message whether the email or password is wrong |
| GET | `/api/auth/me` | Yes | `{ user }`: the current user's profile |
| DELETE | `/api/auth/me` | Yes | Delete the current user's account and all their saved products (to be built with saved products) |
| POST | `/api/ocr` | Yes | Image in, extracted text out |
| POST | `/api/analyze` | Yes | `{ text }` in; `{ ingredients: [{ name, normalized }], flagged: [...] }` out. `400` if the text is missing, over 10,000 characters or has no ingredients |
| GET | `/api/products` | Yes | The current user's saved products |
| GET | `/api/products/:id` | Yes | One saved product (owner only) |
| POST | `/api/products` | Yes | Save a product |
| DELETE | `/api/products/:id` | Yes | Delete a saved product (owner only) |
| GET | `/api/ingredients?search=` | Yes | Search the ingredient database |
| GET | `/api/ingredients/:id` | Yes | One ingredient's details |

Every error response has the same shape, `{ "error": "message for the user" }`. The `errorHandler` middleware catches unexpected errors, logs them on the server and returns a generic `500` message so internal details never reach the app.

### 7.3 Ingredient parsing and matching

Ingredient matching is the core logic of the app and lives in two pure functions:

- **`ingredientParser`** (`parseIngredients(text)`) splits the text into individual ingredients and normalizes each one with `normalizeIngredient`. It splits on commas, semicolons and bullets (or on line breaks when the list has no commas), never inside parentheses. It removes headings ("Ingredients:", "Inactive Ingredients:", "May Contain (+/-):"), percentages, footnotes ("*Certified Organic") and duplicates. Each ingredient is returned as `{ name, normalized, variants }`: `name` for display, `normalized` for saving, and `variants` listing every name the matcher should check. For example, "Water/Aqua/Eau" gives `water`, `aqua` and `eau`, and "Zea Mays (Corn) Oil" gives the full name, the name without "(Corn)", and `corn`.
- **`ingredientMatcher`** (`matchIngredients(parsedIngredients, dbIngredients)`) compares the parsed list against each Ingredient's `normalized` name and `aliases`. An ingredient is flagged when any of its variants **contains a database name as whole words**. A keyword such as "Coconut" therefore flags "Cocos Nucifera (Coconut) Oil" and "Coconut Alkanes", but "Laureth 4" does not flag "Laureth 40". It returns the flagged ingredients in label order as `{ name, normalized, sources, matches }`, where `matches` lists each database ingredient that caused the flag and `sources` combines their source lists. The caller loads the Ingredient documents and passes them in, so the matcher itself never touches the database.

Both build on **`normalizeIngredient`** (`backend/utils/normalize.js`), which lowercases a name, replaces anything other than letters, numbers and "+" with a space, and collapses spaces (e.g. "D&C Red # 17" → "d c red 17"). The seed script uses the same function, so scanned names and stored names are always compared in the same form.

Because they are pure functions with no database or network access in their core logic, they are straightforward to unit test with Jest.

## 8. Data models

### User
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `email` | String | Required, unique, lowercase, trimmed, basic format check |
| `passwordHash` | String | bcrypt hash (12 rounds); `select: false` so queries leave it out unless asked, and removed from JSON |
| `name` | String | Required, trimmed, max 100 characters |
| `createdAt`, `updatedAt` | Date | Automatic timestamps |

The API sends a user as `{ id, email, name, createdAt }`.

### SavedProduct
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `user` | ObjectId → User | Required; set on the server from the JWT |
| `productName` | String | Required |
| `brand` | String | Optional |
| `rawText` | String | Ingredient text as analyzed |
| `parsedIngredients` | [String] | Normalized ingredient list |
| `flagged` | [{ name, sources }] | Snapshot of flagged ingredients at save time |
| `source` | String | Enum: `photo`, `paste` |
| `createdAt` | Date | Automatic timestamp |

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
- **SavedProduct → Ingredient: snapshot, not reference.** `flagged` stores copies of names and sources rather than links. Saved products keep showing what the user saw when they saved them, and loading them needs no extra lookups. Trade-off: saved products don't pick up changes to the ingredient list automatically.

## 9. Security

- **Passwords** must be 8–72 characters (bcrypt ignores anything past 72 bytes), are hashed with bcrypt and are never stored or returned in plain text. Login errors don't reveal whether an email has an account.
- **JWTs** contain only the user ID (`sub`), are signed with `JWT_SECRET`, expire after 7 days, are stored on the device with `expo-secure-store` (iOS Keychain / Android Keystore), and are sent in the `Authorization: Bearer` header by `api.js`. If the server rejects a token (`401`), the app logs out automatically.
- **Auth middleware** (`requireAuth`) verifies the token on every protected route, checks the user still exists, and attaches the user to the request as `req.user`.
- **Ownership checks:** saved products are always queried and deleted by both product ID and user ID.
- **Account deletion:** from the Profile tab after confirming. The server removes the User and all their SavedProducts; the app clears the stored token and returns to the login screen.
- **Secrets** (MongoDB URI, JWT secret, OCR API key) are stored in a `.env` file excluded from Git during development, and in the hosting provider's environment variables once deployed.
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
│   ├── services/            ocrService, analysisService, ingredientParser, ingredientMatcher
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
| OCR on the server, not the device | Keeps the OCR API key secret; simpler app setup |
| Review step after OCR | OCR errors would cause pore-clogging ingredients to be missed |
| Snapshot of results in saved products | Preserves what the user saw; avoids extra lookups |
| Save form as a modal | User keeps the results in view and can cancel easily |
| Context and hooks instead of Redux | Only authentication state is global; a state library isn't justified at this size |
| Expo | Simplifies setup, camera access and testing on real devices |
| Account deletion with confirmation | Users control their own data; app stores expect it; confirmation prevents accidents |
| Ingredient list compiled by estheticians | The spa's licensed estheticians compiled it from Acne Clinic NYC and Face Reality lists; reflects professional knowledge from the spa the app was built for |
| Flagging instead of 1–5 ratings | The estheticians' source lists identify pore-clogging ingredients but don't rate them, so an ingredient is either flagged or not |
| Keywords flag any ingredient that contains them (whole words) | The list includes keywords such as "Coconut", "Shea" and "Myristate" that are meant to cover every ingredient containing them; whole-word matching avoids false flags like "Laureth 4" in "Laureth 40" |
| No admin login or roles | The developer maintains the ingredient list by editing `seed/data/ingredients.json` and running `npm run seed`, and manages accounts in MongoDB Atlas. Admin screens would add work and attack surface without solving a need |
| One shared normalize function | Seed data and scanned text are normalized the same way, so formatting differences ("D&C Red 17" vs. "D & C Red # 17") don't cause missed matches |
| Private repo, deployed app | Deployment is a project requirement; the repo stays private as agreed with the professor. During development the app runs locally and through Expo |

## 13. Open decisions

- **OCR provider.** A cloud provider such as Google Cloud Vision is planned; to be confirmed during development.
- **Hosting.** The app will be deployed; where the Express API runs and how the mobile app is distributed are still to be decided.
- **Email: forgot password and welcome email (to come back to; forgot password needed before deployment).** There is currently no way to recover an account, so a deployed app could lock users out for good.
  - **Forgot password plan:** the user taps "Forgot password?" on LoginScreen and enters their email. The server emails a 6-digit code that expires after about 15 minutes, and the user enters the code and a new password in the app. A code is used instead of an email link because a link would need deep-link setup on both iOS and Android to open the right screen. New endpoints would be `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`, with the code stored hashed on the User and limited attempts. The forgot-password response should be the same whether or not the email has an account.
  - **Welcome email (optional):** sent after registration, using the same email setup. Registration should still succeed if the email fails to send.
  - **Email provider (to decide):** Gmail with an app password via `nodemailer` (free, no domain needed, daily sending limits) or a service such as Resend or SendGrid (more reliable; free tiers usually require a verified domain). Credentials go in `.env` like the other secrets. Keep the sending code in one `emailService` so the provider can be swapped.

## 14. Future improvements (out of scope for now)

- Google and Apple sign-in
- Edit profile and change password
- Privacy policy screen
- Re-check a saved product against the latest ingredient list
- Shared, searchable database of products submitted by users
- Social features for sharing and discovering products with friends
- Barcode scanning to look up products
