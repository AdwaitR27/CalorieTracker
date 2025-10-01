// Firebase initialization and exports
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCs5BMeQhwT5IDg7WdDskPFzaELgVZbe0w",
  authDomain: "calorietrackerdatabase-b84d8.firebaseapp.com",
  projectId: "calorietrackerdatabase-b84d8",
  storageBucket: "calorietrackerdatabase-b84d8.firebasestorage.app",
  messagingSenderId: "170371661809",
  appId: "1:170371661809:web:525919997b89f4dce74e50",
  measurementId: "G-EML9ZJ72Z2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
