# Testing

Ingredient Scanner is tested in three ways:

1. **Automated unit tests** (Jest) for the server and the app, which run in seconds and need no accounts or internet.
2. **Manual testing on devices**, on an iPhone and on Android, for what unit tests can't check: the camera, moving between screens, and how the app looks and behaves on each platform.
3. **Debugging**: bugs found while testing, what caused them and how they were fixed (with a test added where possible, so they can't come back unnoticed).

## 1. Automated tests

### Running them

The tests replace MongoDB, Google Cloud Vision and Gmail with fakes ("mocks"), so they don't need a database, API keys or a `.env` file. Install the packages first (`npm install` in each folder), then:

```bash
cd backend
npm test
```

```bash
cd frontend
npm test
```

To see how much of the code the tests run, add `-- --coverage` (for example `npm test -- --coverage`). A table of every file is printed at the end.

### Automatic runs on GitHub

Both test suites also run on GitHub on every push and pull request, along with ESLint (`npm run lint`, which checks the code for common mistakes), using GitHub Actions ([.github/workflows/tests.yml](../.github/workflows/tests.yml)). Each commit shows a ✓ if all tests passed or a ✗ if any failed, and the **Actions** tab on GitHub has the full output. This catches a broken test even when it wasn't run locally, and before anything is merged into `main` (which redeploys the live API).

### Results (October 2026)

| Part | Test files | Tests | Code covered (lines) |
|---|---|---|---|
| Server (`backend/tests/`) | 20 | 413 | 96% |
| App (`frontend/__tests__/`) | 6 | 74 | Helper functions and server calls (see below) |

All tests pass.

### What the server tests cover

| Area | Test file(s) | What's checked |
|---|---|---|
| Ingredient parsing | `ingredientParser.test.js` | Splitting on commas, semicolons, bullets and "and"; not splitting inside parentheses or "1,2-Hexanediol"; blends in square brackets; one-per-line lists; removing headings, percentages, footnotes, contact details and duplicates; name variants ("Water/Aqua/Eau") |
| Ingredient matching | `ingredientMatcher.test.js` | Keywords flag every ingredient containing them as whole words ("Coconut" flags "Coconut Alkanes"; "Laureth 4" doesn't flag "Laureth 40"); aliases; label order; combined sources |
| Normalizing names | `normalize.test.js` | Lowercasing, accents ("Glycérine"), symbols ("D&C Red # 17") |
| Photo text cleanup | `ingredientSection.test.js`, `ocrService.test.js` | Keeping only the ingredient list (English and French headings) and stopping at directions, company details, barcodes and batch numbers; rebuilding Vision's paragraphs |
| "Is this an ingredient list?" | `ingredientListCheck.test.js` | Real labels pass; random words, sentences and reviews don't |
| Ingredient list data | `seedIngredients.test.js` | Every entry loads, has a known source and isn't an accidental duplicate |
| Ingredient search | `ingredientService.test.js` | Name and alias search, finding entries that would flag a full label name, long searches refused |
| Saved products | `productService.test.js`, `productValidation.test.js` | Only the owner can see, edit or delete a product; duplicates (replace, keep); the server re-analyzes the text; the product name rule; non-text fields refused |
| Accounts | `authService.test.js` | Sign-up, login, email verification and password reset codes (expiry, 5 wrong guesses, one use), account deletion |
| Login checks | `authMiddleware.test.js`, `routeProtection.test.js` | Every route is found automatically and checked: no login gives `401`, unverified email gives `403`; expired, forged and pre-reset tokens refused |
| Endpoints | `controllers.test.js`, `analyzeController.test.js`, `ocrController.test.js` | Right status codes; the user always comes from the login token, never the request; only allowed fields reach the services; photo and text size limits |
| Google Vision | `ocrService.test.js` | Not set up (`503`), unreachable or timing out (`502`), refusing the key (`502`), unreadable image (`400`) |
| Email | `emailService.test.js` | Codes and expiry time in each email; Gmail failing (`502`); not set up (`503`); welcome email skipped quietly |
| What the API sends | `modelJson.test.js` | Saved products never include their owner's ID; ingredients leave out internal fields |
| Errors | `errorHandler.test.js` | Every error is `{ error }` JSON; unexpected errors never reveal internal details; unknown addresses get a JSON `404` |
| Rate limits | `rateLimits.test.js` | Each limit allows the right number and then answers `429`; each is attached to the right routes |

### What the app tests cover

| Area | Test file | What's checked |
|---|---|---|
| Server calls (`services/api.js`) | `api.test.js` | Every call's address, method and body; the login token is sent only when logged in; readable error messages (including no connection); a `401` while logged in logs the user out, a wrong password doesn't |
| Photo shrinking | `preparePhoto.test.js` | Photos shrink to 2000 px on the longest side, keep their shape and are never enlarged |
| Saved list | `organizeProducts.test.js` | Newest, name, brand and category order and groups; the "Non pore-clogging" filter |
| Categories | `categories.test.js` | Display names; the app's list matches the server's |
| Dates | `formatDate.test.js` | Uses the phone's language and region; bad dates show nothing |
| "Already saved" question | `askAboutDuplicate.test.js` | Wording, the three buttons and what each answers; closing the alert on Android counts as Cancel |

### Not covered by automated tests

- **Screens and components** (forms, lists, navigation between screens). These need React Native Testing Library, which isn't set up yet. They're covered by the manual checklist below.
- **The camera and photo library**, which need a real device.
- **Real calls to MongoDB, Google Vision and Gmail.** These are checked by hand against the live server.

## 2. Devices and platforms

The app is a mobile app for iPhone and Android, built with React Native. It isn't a website, so it isn't tested in web browsers. The mobile equivalent is testing on both platforms and with different phone settings. (Expo can also build a web version, but this app relies on features that only exist on phones: the phone's own alert boxes, and secure storage for the login token in the iPhone Keychain or Android Keystore.)

| Device | Type | System | Used for |
|---|---|---|---|
| iPhone (model: 16pro) | Real phone | iOS 26.6.2 | Everything, including the camera |
| Pixel 10 | Android emulator | Android 16 (API 36) | Everything except a real camera (the emulator's camera shows a test scene) |

The app is set to portrait only and to light mode only (`app.json`), so the checklist includes checking that it stays readable when the phone itself is in dark mode.

## 3. Manual test checklist

Each check is done on both platforms. Mark **Pass**, or **Fail** with a short note (and fix it, then add the bug to section 4).

### Accounts

| # | Steps | Expected | iPhone | Android |
|---|---|---|---|---|
| A1 | Sign up with a name, email and password | The "Verify your email" screen opens, and a 6-digit code arrives by email | Pass | Pass |
| A2 | Enter the code | The app opens on the Scan tab; a welcome email arrives | Pass | Pass |
| A3 | Enter a wrong code | An error message; the screen stays | Pass | Pass |
| A4 | Tap "Send a new code" | Not available for 60 seconds, then sends a new code | Pass | Pass |
| A5 | "Wrong email? Start over" | Asks to confirm, deletes the account, returns to sign up | Pass | Pass |
| A6 | Sign up with an email that already has an account | A message says the email is already registered | Pass | Pass |
| A7 | Sign up with a password under 8 characters | A message about the password length | Pass | Pass |
| A8 | Log out, then log in | The app opens on the Scan tab | Pass | Pass |
| A9 | Log in with a wrong password | "Incorrect email or password." | Pass | Pass |
| A10 | Close the app completely and reopen it | Still logged in | Pass | Pass |
| A11 | "Forgot password?" from the login screen | The typed email is filled in; a code arrives by email | Pass | Pass |
| A12 | Enter the code and a new password | Logged in; the old password no longer works | Pass | Pass |
| A13 | Profile → Delete account → confirm | Back to the login screen; the account can't log in | Pass | Pass |
| A14 | Delete account → cancel (and Android's back button) | Nothing is deleted | Pass | Pass |

### Scanning

| # | Steps | Expected | iPhone | Android |
|---|---|---|---|---|
| S1 | Scan → Take a photo, first time | The phone asks for camera permission | Pass | Pass |
| S2 | Refuse camera permission | A screen explains why, with "Open Settings" | Pass | Pass |
| S3 | Photograph a label with an "Ingredients" heading | Review screen shows only the ingredient list | Pass | Pass (photo from library) |
| S4 | Photograph a label without an "Ingredients" heading | All the text is shown, with a notice to delete non-ingredients | Pass | Pass (photo from library) |
| S5 | Flashlight button | The flashlight turns on and off | Pass | Pass |
| S6 | "Blurry? Use your phone's camera" | The phone's own Camera opens; the photo comes back for reading | Pass | n/a (emulator has no phone camera app) |
| S7 | Choose a photo from the library | The text is read as with a new photo | Pass | Pass |
| S8 | Photograph something with no text | "Couldn't find any text in that photo…" | Pass | Pass |
| S9 | Scan → Paste, paste a real ingredient list | The list is shown for review | Pass | Pass |
| S10 | Check a list with a known pore-clogging ingredient (e.g. "Water, Coconut Oil") | Coconut Oil is flagged, with its source list | Pass | Pass |
| S11 | Check random words ("hello world") | A warning offers "Edit text" or "Check anyway" | Pass | Pass |
| S12 | Results → Edit → remove an ingredient | It disappears, along with its flag; "Undo all changes" restores it | Pass | Pass |
| S13 | Results screen | The "information only" disclaimer is shown | Pass | Pass |
| S14 | Results → Cancel | Back to a fresh Scan screen; nothing saved | Pass | Pass |
| S15 | Results → back arrow | Back to the text to fix it | Pass | Pass |

### Saving and the Saved list

| # | Steps | Expected | iPhone | Android |
|---|---|---|---|---|
| P1 | Results → Save product, enter a name, brand and category | The product appears at the top of the Saved tab | Pass | Pass |
| P2 | Save with no name, or a name of only symbols ("!!!") | A message explains the name rule; nothing is saved | Pass | Pass |
| P3 | Save the same name and brand again | "Already saved" with Cancel, Keep both and Replace; each does what it says | Pass | Pass |
| P4 | Type in the save form | The keyboard doesn't cover Save and Cancel | Pass | Pass |
| P5 | Sort by Newest and Name; group by Brand and Category | The list reorders and groups correctly | Pass | Pass |
| P6 | "Non pore-clogging" | Only products with no flagged ingredients | Pass | Pass |
| P7 | Swipe a product left, then swipe another | Delete shows on one row at a time | Pass | Pass |
| P8 | Tap Delete, then confirm | The product is removed | Pass | Pass |
| P9 | Open a product | Its results look the same as when it was saved | Pass | Pass |
| P10 | Edit a product's name, brand or category | The changes show in the product and the list | Pass | Pass |
| P11 | Edit, then Cancel | The product is unchanged | Pass | Pass |
| P12 | No saved products | A message explains how to save one | Pass | Pass |

### Ingredients and Profile

| # | Steps | Expected | iPhone | Android |
|---|---|---|---|---|
| I1 | Ingredients tab with nothing typed | The whole list, A to Z | Pass | Pass |
| I2 | Search "coconut" | Every entry containing "coconut" | Pass | Pass |
| I3 | Paste a whole ingredient list into search | A warning offers to check the list on the Scan tab, which opens the Review screen with it | Pass | Pass |
| I4 | Tap an ingredient | Its source list(s) and the disclaimer | Pass | Pass |
| I5 | Search bar's clear button | Clears the search | Pass | Pass |
| R1 | Profile → How flagging works | The guide opens and scrolls to the end | Pass | Pass |
| R2 | Profile → About | The full disclaimer and the version number | Pass | Pass |

### Platform and device checks

| # | Steps | Expected | iPhone | Android |
|---|---|---|---|---|
| D1 | Every screen | Nothing hidden behind the notch, status bar, home indicator or Android navigation bar | Pass | Pass |
| D2 | Every form (login, sign up, codes, review text, save) | The keyboard doesn't cover the field being typed in or the main button | Pass | Pass |
| D3 | Android back button on each screen, modal and dialog | Goes back or closes, as expected | n/a | Pass |
| D4 | Phone set to dark mode | The app stays in its light colors and is readable | Pass | Pass |
| D5 | Phone's text size set to the largest | Text grows and nothing important is cut off | Pass | Pass |
| D6 | Turn off Wi-Fi and mobile data, then check a list | "Couldn't reach the server…" instead of a crash | Pass | Pass |
| D7 | Cards and buttons | Shadows show on both (iOS uses `shadow*`, Android uses `elevation`) | Pass | Pass |

## 4. Bugs found and fixed

| Bug | Cause | Fix | Commit |
|---|---|---|---|
| A pasted one-per-line list showed as a single flagged "ingredient" | Commas in other pasted text (e.g. an address in a website footer) made the parser treat line breaks as wrapping | Treat the text as one-per-line when a line starts with a bullet, or when there are fewer commas than lines; drop contact details and copyright lines (12 new tests) | `832d218` |
| Labels with blends, "and" or "1,2-Hexanediol" were split wrongly | The parser only split on commas | Open up blends in square brackets, split on "and" outside parentheses, and never split at a comma between digits (new tests) | `ba7a835` |
| Photo ingredient lists ran on into the company name, address and trademark text | Google Vision's plain text has no gaps between paragraphs | Rebuild the text from Vision's paragraphs and stop the list at company or legal text (19 new tests) | `467a5d9` |
| The camera frame sat at the top of the screen at a fifth of its size, and the loading overlay didn't cover the screen | React Native 0.86 removed `StyleSheet.absoluteFillObject`, so the style added nothing | Use `StyleSheet.absoluteFill` | `c6d1769` |
| Several products could be swiped open at once | Each row's swipe was independent | Close the previously opened row when another is swiped | `4df9110` |
| On iPhone, the disclaimer below long ingredient lists showed as one clipped line | A React Native 0.86 iOS rounding bug with wrapped text far down a scrolling page | A tiny bottom padding (`utils/textWrapFix.js`) until React Native includes the fix | `a59c3bc` |
| Barcode digits, batch numbers and the "12M" symbol were read as ingredients | The ingredient list didn't stop at them | Stop the list at long numbers and the "12M" symbol, keeping short numbers like "CI 77491" (new tests) | `0d57c58` |
| The keyboard covered Save and Cancel on the product forms, and iPhone showed two Cancel buttons | The buttons were part of the scrolling form | Pin the buttons in a bar above the keyboard, with one Cancel | `ed9254e` |
| French names on bilingual labels ("Glycérine") didn't match the list | Accents weren't removed when comparing names | Remove accents in `normalizeIngredient` (new tests) | `1da9db2` |
| Unknown addresses got an HTML page the app couldn't read | Express's default "Cannot GET" page | Answer `404 { error: "Not found." }` (new tests) | `3354412` |
