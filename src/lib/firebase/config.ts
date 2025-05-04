
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// IMPORTANT: Use NEXT_PUBLIC_ prefix for client-side environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (Optional)
};

// Initialize Firebase
let app: FirebaseApp | null = null; // Initialize with null
let db: Firestore | null = null;     // Initialize with null
let auth: Auth | null = null;       // Initialize with null
let firebaseInitializationError: Error | null = null; // Store initialization error

// Check if Firebase app is already initialized
if (!getApps().length) {
    // Validate essential configuration values
    const missingConfigKeys = Object.entries(firebaseConfig)
      .filter(([key, value]) => key !== 'measurementId' && !value) // measurementId is optional
      .map(([key]) => key);

    if (missingConfigKeys.length > 0) {
        const errorMessage = `Firebase configuration is missing or invalid for keys: ${missingConfigKeys.join(', ')}. Please check your .env file and ensure all NEXT_PUBLIC_FIREBASE_* variables are set correctly.`;
        console.error(errorMessage);
        firebaseInitializationError = new Error(errorMessage);
    } else {
        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            console.log("Firebase initialized successfully.");
        } catch (error: any) {
            console.error("Firebase initialization error:", error);
            firebaseInitializationError = error;
             // Ensure app, db, auth remain null on error
            app = null;
            db = null;
            auth = null;
        }
    }
} else {
    app = getApp(); // Get the existing app instance
    // Attempt to get Firestore and Auth instances, handle potential errors if app is invalid
    try {
       db = getFirestore(app);
       auth = getAuth(app);
    } catch (error: any) {
        console.error("Error getting Firestore/Auth from existing Firebase app:", error);
        firebaseInitializationError = error;
        app = null; // Invalidate app if instances cannot be retrieved
        db = null;
        auth = null;
    }
}

// Function to check initialization status and throw if failed
function ensureFirebaseInitialized() {
    if (firebaseInitializationError) {
        throw new Error(`Firebase failed to initialize. Please check console logs for details. Original error: ${firebaseInitializationError.message}`);
    }
    if (!app || !db || !auth) {
         throw new Error("Firebase is not initialized. Ensure configuration is correct and initialization succeeded.");
    }
}


// Export initialized instances, throwing an error if accessed when not initialized
// It's generally better to handle the lack of initialization gracefully where these are used,
// but this provides a fallback safety net. Consider checking `firebaseInitializationError`
// or the null status of `app`, `db`, `auth` in components/hooks before use.
export { app, db, auth, firebaseInitializationError, ensureFirebaseInitialized };

