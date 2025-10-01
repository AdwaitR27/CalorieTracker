# AI Calorie Tracker

Live demo: https://adwaitr27.github.io/CalorieTracker/

## Data persistence
- Entries are saved per day in the browser's localStorage.
- Structure: allFoodData is an object keyed by ISO date (YYYY-MM-DD), each containing an array of food entries for that day.
- The UI shows a weekly view summarizing daily totals. If the app stays open past midnight, it will automatically start saving to the new day without needing a page refresh.

# AI Calorie Tracker

## Troubleshooting: Firebase Auth "auth/unauthorized-domain" on Google Sign-In

If you see the error Firebase: Error (auth/unauthorized-domain) when clicking "Continue with Google", your site domain is not authorized in Firebase Authentication.

Fix in under a minute:

1. Open Firebase Console → your project → Build → Authentication → Settings tab.
2. Scroll to Authorized domains and click Add domain.
3. Add your deployment domain and save.
   - For GitHub Pages Project Sites: add `YOUR_USERNAME.github.io`
   - For a custom domain: add your exact domain, e.g. `app.example.com`
   - Local development is usually covered by `localhost` (already present).
4. Reload your site and try signing in again.

Notes:
- If popups are blocked or closed, the app will fall back to a redirect-based sign-in.
- This is a console configuration requirement; no API key change is needed.

Where this is handled in code:
- `src/main.js` shows a clear message when `auth/unauthorized-domain` occurs and suggests adding the current host to Firebase Authorized domains.
