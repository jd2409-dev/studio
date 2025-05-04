
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore, enableIndexedDbPersistence, terminate } from "firebase/firestore"; // Import enableIndexedDbPersistence and terminate
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage"; // Import Firebase Storage

// Your web app's Firebase configuration
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
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;
let firebaseInitializationError: Error | null = null;
let persistenceEnabled = false; // Flag to track persistence status

// Function to check if a config value looks like a placeholder or is missing
const isInvalidConfigValue = (value: string | undefined): boolean => {
    return !value || value.includes('YOUR_') || value.includes('_HERE') || value.trim() === '';
}

// Check if Firebase app is already initialized - Client-side only initialization
if (typeof window !== 'undefined' && !getApps().length) {
    console.log("Attempting Firebase initialization on client...");

    const requiredKeys: (keyof typeof firebaseConfig)[] = [
        'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'
    ];
    const invalidKeys = requiredKeys.filter(key => isInvalidConfigValue(firebaseConfig[key]));

    if (invalidKeys.length > 0) {
        const envVarNames = invalidKeys.map(k => `NEXT_PUBLIC_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
        const errorMessage = `Firebase configuration contains placeholder or missing values for keys: ${envVarNames.join(', ')}. Please update your .env file with valid credentials from your Firebase project settings. Refer to README.md for setup instructions.`;
        console.warn(`Firebase Configuration Warning: ${errorMessage}`);
        firebaseInitializationError = new Error(errorMessage);
    } else {
        try {
            console.log("Firebase config appears valid, initializing app...");
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            storage = getStorage(app);
            db = getFirestore(app); // Initialize Firestore

            // Enable Offline Persistence
            enableIndexedDbPersistence(db)
              .then(() => {
                  persistenceEnabled = true;
                  console.log("Firestore offline persistence enabled successfully.");
              })
              .catch((err) => {
                // This can happen if multiple tabs are open or persistence is already enabled
                if (err.code == 'failed-precondition') {
                    console.warn("Firestore offline persistence failed: Multiple tabs open or already enabled. Firestore will work online.");
                    // Persistence might already be enabled in another tab, treat as enabled for functionality
                     persistenceEnabled = true;
                } else if (err.code == 'unimplemented') {
                    console.warn("Firestore offline persistence failed: Browser does not support IndexedDB. Firestore will work online.");
                    // Indicate persistence is not available
                    persistenceEnabled = false;
                } else {
                    console.error("Firestore offline persistence failed with error:", err);
                     persistenceEnabled = false; // Treat other errors as persistence not enabled
                }
                 // Note: Even if persistence fails, db instance is still valid for online use.
              });

            console.log("Firebase initialized successfully (Persistence setup initiated).");
        } catch (error: any) {
            console.error("Firebase initialization error during initializeApp():", error);
            let detailedErrorMessage = `Firebase initialization failed. Code: ${error.code}, Message: ${error.message}`;
            detailedErrorMessage += " Check browser console and network tab for more details.";
            firebaseInitializationError = new Error(detailedErrorMessage);
            app = null; db = null; auth = null; storage = null;
        }
    }
} else if (typeof window !== 'undefined' && getApps().length) {
    console.log("Firebase app already initialized, getting existing instance.");
    app = getApp();
    try {
       auth = getAuth(app);
       storage = getStorage(app);
       db = getFirestore(app); // Get existing Firestore instance
       // Assume persistence was handled by the initial setup or another tab
       // We don't call enableIndexedDbPersistence again here to avoid conflicts
       console.log("Retrieved existing Firebase services.");
       // Set persistenceEnabled flag based on whether we expect it to be available
       // This is an assumption, but safer than re-enabling. Check db.settings?
       persistenceEnabled = true; // Assume it was enabled or will be by another tab
    } catch (error: any) {
        console.error("Error getting Firebase services from existing app:", error);
        firebaseInitializationError = new Error(`Failed to get services from existing Firebase app: ${error.message}`);
        app = null; db = null; auth = null; storage = null;
        persistenceEnabled = false;
    }
}


// Function to check initialization status and throw if failed
function ensureFirebaseInitialized() {
    if (firebaseInitializationError) {
        throw new Error(`Firebase failed to initialize. Check console logs and your .env file. Original error: ${firebaseInitializationError.message}`);
    }
    if (!app || !db || !auth || !storage) {
         throw new Error("Firebase services (app, db, auth, storage) are not available. Initialization may have failed or was skipped.");
    }
    // Optionally, you could check the persistenceEnabled flag here if specific features *require* it
    // if (!persistenceEnabled) {
    //    console.warn("Firebase persistence is not enabled or supported.");
    // }
}


export { app, db, auth, storage, firebaseInitializationError, ensureFirebaseInitialized, persistenceEnabled };
