
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

// Function to check if a config value looks like a placeholder or is missing
const isInvalidConfigValue = (value: string | undefined): boolean => {
    // Check for undefined, empty string, or common placeholder patterns
    return !value || value.includes('YOUR_') || value.includes('_HERE') || value.trim() === '';
}

// Check if Firebase app is already initialized
if (typeof window !== 'undefined' && !getApps().length) { // Only run initialization on client-side
    console.log("Attempting Firebase initialization on client...");

    // Validate essential configuration values
    const requiredKeys: (keyof typeof firebaseConfig)[] = [
        'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'
    ];
    const invalidKeys = requiredKeys.filter(key => isInvalidConfigValue(firebaseConfig[key]));

    if (invalidKeys.length > 0) {
        // Construct a detailed error message listing the problematic keys
        const envVarNames = invalidKeys.map(k => `NEXT_PUBLIC_FIREBASE_${k.toUpperCase()}`);
        const errorMessage = `Firebase configuration contains placeholder or missing values for keys: ${envVarNames.join(', ')}. Please update your .env file with valid credentials from your Firebase project settings. Without valid credentials, Firebase services will not work. Refer to README.md for setup instructions.`;

        // Log a more subtle warning instead of loud errors that might trigger error reporting tools.
        // The AuthContext will handle showing a user-facing error.
        console.warn(`Firebase Configuration Warning: ${errorMessage}`);

        // Set the error state to be used by AuthContext
        firebaseInitializationError = new Error(errorMessage);
    } else {
        // If configuration seems valid, attempt initialization
        try {
            console.log("Firebase config appears valid, initializing app...");
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            storage = getStorage(app); // Initialize Storage
            console.log("Firebase initialized successfully.");
        } catch (error: any) {
            // Catch errors during the actual initializeApp() call
            console.error("Firebase initialization error during initializeApp():", error);
            let detailedErrorMessage = `Firebase initialization failed.`;
            if (error.code && error.message) {
                detailedErrorMessage += ` Code: ${error.code}, Message: ${error.message}`;
            } else {
                detailedErrorMessage += ` Error: ${error}`;
            }
            detailedErrorMessage += " This usually indicates incorrect values in your .env file even if they are not placeholders, or issues connecting to Firebase. Check browser console and network tab for more details.";
            firebaseInitializationError = new Error(detailedErrorMessage);
             // Ensure app, db, auth, storage remain null on error
            app = null;
            db = null;
            auth = null;
            storage = null;
        }
    }
} else if (getApps().length) {
    // If already initialized (e.g., due to HMR), get the existing instance
    console.log("Firebase app already initialized, getting existing instance.");
    app = getApp();
    try {
       db = getFirestore(app);
       auth = getAuth(app);
       storage = getStorage(app); // Get Storage instance
    } catch (error: any) {
        // This case might be less common but handle it defensively
        console.error("Error getting Firebase services from existing app:", error);
        firebaseInitializationError = new Error(`Failed to get services from existing Firebase app: ${error.message}`);
        app = null; // Invalidate app if instances cannot be retrieved
        db = null;
        auth = null;
        storage = null;
    }
}
// Note: Firebase initialization does not run on the server side in this setup.


// Function to check initialization status and throw if failed
function ensureFirebaseInitialized() {
    if (firebaseInitializationError) {
        // Throw the specific initialization error for clarity
        throw new Error(`Firebase failed to initialize. Check console logs and your .env file. Original error: ${firebaseInitializationError.message}`);
    }
    // Check specifically for the required services if initialization *didn't* error out previously
    if (!app || !db || !auth || !storage) {
         // This state might occur if initialization was skipped (e.g., on server) or failed silently
         // We prioritize the specific initializationError if it exists.
         throw new Error("Firebase services (app, db, auth, storage) are not available. Initialization may have failed or was skipped.");
    }
}


// Export initialized instances or null if failed/not applicable (server-side).
// It's crucial to check `firebaseInitializationError` or the null status of `app`, `db`, `auth`
// in components/hooks before use, especially on the client-side.
export { app, db, auth, storage, firebaseInitializationError, ensureFirebaseInitialized }; // Export storage
