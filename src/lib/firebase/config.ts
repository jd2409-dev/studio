
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage"; // Import Firebase Storage

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
let storage: FirebaseStorage | null = null; // Initialize with null
let firebaseInitializationError: Error | null = null; // Store initialization error

// Function to check if a config value looks like a placeholder
const isPlaceholder = (value: string | undefined): boolean => {
    return !value || value.includes('YOUR_') || value.includes('_HERE');
}

// Check if Firebase app is already initialized
if (!getApps().length) {
    // Validate essential configuration values
    const requiredKeys: (keyof typeof firebaseConfig)[] = [
        'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'
    ];
    const missingConfigKeys = requiredKeys.filter(key => !firebaseConfig[key]);
    const placeholderKeys = requiredKeys.filter(key => isPlaceholder(firebaseConfig[key]));

    if (missingConfigKeys.length > 0 || placeholderKeys.length > 0) {
        const errorMessages: string[] = [];
        if (missingConfigKeys.length > 0) {
             errorMessages.push(`Firebase configuration is missing environment variables for keys: ${missingConfigKeys.map(k => `NEXT_PUBLIC_FIREBASE_${k.toUpperCase()}`).join(', ')}.`);
        }
         if (placeholderKeys.length > 0) {
            errorMessages.push(`Firebase configuration contains placeholder values for keys: ${placeholderKeys.map(k => `NEXT_PUBLIC_FIREBASE_${k.toUpperCase()}`).join(', ')}.`);
         }
        errorMessages.push(`Please update your .env file with valid credentials from your Firebase project settings.`);

        const errorMessage = errorMessages.join(' ');
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!! FIREBASE CONFIGURATION ERROR !!!");
        console.error(errorMessage);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        firebaseInitializationError = new Error(errorMessage);
    } else {
        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            storage = getStorage(app); // Initialize Storage
            console.log("Firebase initialized successfully.");
        } catch (error: any) {
            console.error("Firebase initialization error:", error);
            firebaseInitializationError = error;
             // Ensure app, db, auth, storage remain null on error
            app = null;
            db = null;
            auth = null;
            storage = null;
        }
    }
} else {
    app = getApp(); // Get the existing app instance
    // Attempt to get Firestore, Auth and Storage instances, handle potential errors if app is invalid
    try {
       db = getFirestore(app);
       auth = getAuth(app);
       storage = getStorage(app); // Get Storage instance
    } catch (error: any) {
        console.error("Error getting Firebase services from existing app:", error);
        firebaseInitializationError = error;
        app = null; // Invalidate app if instances cannot be retrieved
        db = null;
        auth = null;
        storage = null;
    }
}

// Function to check initialization status and throw if failed
function ensureFirebaseInitialized() {
    if (firebaseInitializationError) {
        // Throw the specific initialization error for clarity
        throw new Error(`Firebase failed to initialize. Please check console logs and your .env file. Original error: ${firebaseInitializationError.message}`);
    }
    if (!app || !db || !auth || !storage) { // Check storage too
         throw new Error("Firebase is not initialized, but no specific error was recorded. This is unexpected.");
    }
}


// Export initialized instances, throwing an error if accessed when not initialized
// It's generally better to handle the lack of initialization gracefully where these are used,
// but this provides a fallback safety net. Consider checking `firebaseInitializationError`
// or the null status of `app`, `db`, `auth` in components/hooks before use.
export { app, db, auth, storage, firebaseInitializationError, ensureFirebaseInitialized }; // Export storage
