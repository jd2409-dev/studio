
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

console.log("Firebase config module loaded. typeof window:", typeof window);

// Check if Firebase app is already initialized - Client-side only initialization
if (typeof window !== 'undefined') {
    console.log("Running Firebase initialization checks on the client...");
    if (!getApps().length) {
        console.log("No Firebase app initialized yet. Proceeding with initialization.");

        const requiredKeys: (keyof typeof firebaseConfig)[] = [
            'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'
        ];
        const errorMessages: string[] = [];

        requiredKeys.forEach(key => {
            if (isInvalidConfigValue(firebaseConfig[key])) {
                errorMessages.push(`NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
            }
        });

        if (errorMessages.length > 0) {
            const errorMessage = `Firebase configuration contains placeholder or missing values for keys: ${errorMessages.join(', ')}. Please update your .env file with valid credentials from your Firebase project settings. Refer to README.md for setup instructions.`;
            console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            console.error("!!! FIREBASE CONFIGURATION ERROR !!!");
            console.error(errorMessage);
            console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            firebaseInitializationError = new Error(errorMessage);
            // Explicitly set services to null if config is invalid
            app = null; db = null; auth = null; storage = null;
        } else {
            try {
                console.log("Firebase config appears valid, calling initializeApp()...");
                app = initializeApp(firebaseConfig);
                console.log("initializeApp() successful. Getting Auth, Storage, Firestore.");
                auth = getAuth(app);
                storage = getStorage(app);
                db = getFirestore(app);

                console.log("Firebase services obtained. Attempting to enable Firestore offline persistence...");
                enableIndexedDbPersistence(db)
                  .then(() => {
                      persistenceEnabled = true;
                      console.log("Firestore offline persistence enabled successfully.");
                  })
                  .catch((err) => {
                    console.warn("Firestore offline persistence setup warning/error:", err.code, err.message);
                    if (err.code == 'failed-precondition') {
                        persistenceEnabled = true; // Assume already enabled or handled by another tab
                    } else {
                        persistenceEnabled = false;
                    }
                  });
                console.log("Firebase core initialization successful.");
            } catch (error: any) {
                console.error("Firebase initialization error during initializeApp() or service retrieval:", error);
                let detailedErrorMessage = `Firebase Core Initialization Failed. Code: ${error.code || 'N/A'}, Message: ${error.message || 'Unknown error'}. Check browser console and network tab.`;
                firebaseInitializationError = new Error(detailedErrorMessage);
                app = null; db = null; auth = null; storage = null;
            }
        }
    } else {
        console.log("Firebase app already initialized. Getting existing instance and services.");
        app = getApp();
        try {
           auth = getAuth(app);
           storage = getStorage(app);
           db = getFirestore(app);
           persistenceEnabled = true; // Assume persistence was handled if app already exists
           console.log("Retrieved existing Firebase services successfully.");
        } catch (error: any) {
            console.error("Error getting Firebase services from existing app:", error);
            firebaseInitializationError = new Error(`Failed to get services from existing Firebase app: ${error.message}`);
            app = null; db = null; auth = null; storage = null;
            persistenceEnabled = false;
        }
    }
} else {
    console.log("Not on client, Firebase initialization skipped for now (will run on client).");
}

console.log("Firebase config.ts final state:");
console.log("  App initialized:", !!app);
console.log("  Auth service:", !!auth);
console.log("  Firestore service:", !!db);
console.log("  Storage service:", !!storage);
console.log("  Initialization Error:", firebaseInitializationError ? firebaseInitializationError.message : "No");
console.log("  Persistence Enabled Flag:", persistenceEnabled);


// Function to check initialization status and throw if failed
function ensureFirebaseInitialized() {
    if (firebaseInitializationError) {
        throw new Error(`Firebase failed to initialize. Check console logs and your .env file. Original error: ${firebaseInitializationError.message}`);
    }
    if (!app || !db || !auth || !storage) {
         throw new Error("Firebase services (app, db, auth, storage) are not available. Initialization may have failed or was skipped on the server, or encountered an issue on the client.");
    }
}


export { app, db, auth, storage, firebaseInitializationError, ensureFirebaseInitialized, persistenceEnabled };
