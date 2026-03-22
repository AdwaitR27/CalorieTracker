# AI Calorie Tracker

Live demo: https://adwaitr27.github.io/CalorieTracker/

## What this app does
- Tracks daily food intake and nutritional values (calories, protein, carbs).
- Allows users to log food manually or describe meals using AI.
- Uses an AI model to estimate nutrition from natural language input (e.g., "2 eggs and toast").
- Displays a weekly overview to help users understand eating patterns.
- Automatically organizes and updates data by date.

## Key features
- 🤖 AI-powered food parsing using LLM (Groq API - LLaMA 3)
- ✍️ Manual food entry for precise control
- 📊 Weekly calorie and macro summary
- 🔄 Automatic day switching at midnight (no refresh needed)
- 🗑️ Add, delete, and clear daily entries
- 🔐 User authentication (Email/Password + Google Sign-In)
- ☁️ Cloud sync with Firebase Firestore
- 💾 Local caching for fast performance and offline fallback

## How AI integration works
- Users describe food in natural language.
- The app sends a prompt to the Groq API (LLaMA 3 model).
- The model returns structured JSON with:
  - food name
  - calories
  - protein
  - carbs
- The response is parsed and automatically added to the tracker.

## Data persistence
- Data is stored in two layers:
  1. **LocalStorage (fast access & offline support)**
  2. **Firebase Firestore (cloud sync per user)**

- Structure:
  - `allFoodData` is an object keyed by ISO date (`YYYY-MM-DD`)
  - Each date contains an array of food entries

- Example:
```json
{
  "2026-03-22": [
    {
      "name": "Eggs and toast",
      "calories": 300,
      "protein": 18,
      "carbs": 25
    }
  ]
}
