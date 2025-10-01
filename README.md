# AI Calorie Tracker

Live demo: https://adwaitr27.github.io/CalorieTracker/

## Data persistence
- Entries are saved per day in the browser's localStorage.
- Structure: allFoodData is an object keyed by ISO date (YYYY-MM-DD), each containing an array of food entries for that day.
- The UI shows a weekly view summarizing daily totals. If the app stays open past midnight, it will automatically start saving to the new day without needing a page refresh.
