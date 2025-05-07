// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore, enableIndexedDbPersistence, terminate, initializeFirestore } from "firebase/firestore"; // Import enableIndexedDbPersistence and terminate
import { getAuth, type Auth, initializeAuth, browserLocalPersistence, indexedDBLocalPersistence } from "firebase/auth";
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

// State variables for Firebase services and status
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;
let firebaseInitializationError: Error | null = null;
let persistenceEnabled = false; // Flag to track persistence status

// Function to check if a config value looks like a placeholder or is missing/empty
const isInvalidConfigValue = (value: string | undefined): boolean => {
    return !value || value.includes('YOUR_') || value.includes('_HERE') || value.trim() === '';
}

// Centralized Initialization Logic (runs only once)
function initializeFirebaseServices() {
    console.log("Attempting Firebase Initialization...");

    // 1. Validate Configuration
    const requiredKeys: (keyof typeof firebaseConfig)[] = [
        'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'
    ];
    const missingOrInvalidKeys: string[] = [];
    requiredKeys.forEach(key => {
        if (isInvalidConfigValue(firebaseConfig[key])) {
            missingOrInvalidKeys.push(`NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
        }
    });

    if (missingOrInvalidKeys.length > 0) {
        const configErrorMessage = `Firebase configuration contains placeholder or missing values for keys: ${missingOrInvalidKeys.join(', ')}. Please update your .env file with valid credentials from your Firebase project settings and restart the application. Refer to README.md.`;
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!! FIREBASE CONFIGURATION ERROR (CRITICAL) !!!");
        console.error(configErrorMessage);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        firebaseInitializationError = new Error(configErrorMessage);
        // Explicitly set services to null
        app = null; db = null; auth = null; storage = null; persistenceEnabled = false;
        return; // Stop initialization
    }

    // 2. Initialize Firebase App
    try {
        console.log("Firebase config validated. Initializing app...");
        app = initializeApp(firebaseConfig);
        console.log("initializeApp() successful.");
    } catch (error: any) {
        const appInitErrorMessage = `Firebase App Initialization Failed. Code: ${error.code || 'N/A'}, Message: ${error.message || 'Unknown error'}. Check your Firebase config values and network connection.`;
        console.error("!!! FIREBASE APP INITIALIZATION ERROR !!!", appInitErrorMessage, error);
        firebaseInitializationError = new Error(appInitErrorMessage);
        app = null; db = null; auth = null; storage = null; persistenceEnabled = false;
        return; // Stop initialization
    }

    // 3. Initialize Services (Auth, Firestore, Storage)
    try {
        console.log("Initializing Auth...");
         // Prefer IndexedDB persistence for Auth if available
        auth = initializeAuth(app, {
            persistence: [indexedDBLocalPersistence, browserLocalPersistence]
        });
        console.log("Auth initialized.");

        console.log("Initializing Firestore...");
        // Use initializeFirestore for better control, especially with persistence
        db = initializeFirestore(app, {
             // Optional: configure cache size, etc.
             // cacheSizeBytes: 100 * 1024 * 1024 // e.g., 100 MB
        });
        console.log("Firestore initialized.");

        console.log("Initializing Storage...");
        storage = getStorage(app);
        console.log("Storage initialized.");

        console.log("Firebase services initialized successfully.");

        // 4. Enable Firestore Persistence (best effort)
        console.log("Attempting to enable Firestore offline persistence...");
        enableIndexedDbPersistence(db)
          .then(() => {
              persistenceEnabled = true;
              console.log("Firestore offline persistence enabled successfully.");
          })
          .catch((err) => {
            console.warn("Firestore offline persistence setup warning/error:", err.code, err.message);
            if (err.code === 'failed-precondition') {
                // This often means it's enabled in another tab. Assume it's effectively enabled.
                persistenceEnabled = true; // Set flag even on precondition failure
                console.warn("Persistence 'failed-precondition' - likely active in another tab or already set.");
            } else if (err.code === 'unimplemented') {
                console.warn("Firestore offline persistence is not supported in this browser environment.");
                persistenceEnabled = false;
            } else {
                 persistenceEnabled = false; // For other errors, assume it's not enabled.
            }
          });

    } catch (serviceError: any) {
        const serviceInitErrorMessage = `Firebase Service Initialization Failed (Auth, Firestore, or Storage). Code: ${serviceError.code || 'N/A'}, Message: ${serviceError.message || 'Unknown error'}. Check browser console and network tab.`;
        console.error("!!! FIREBASE SERVICE INITIALIZATION ERROR !!!", serviceInitErrorMessage, serviceError);
        firebaseInitializationError = new Error(serviceInitErrorMessage);
        // Nullify potentially partially initialized services
        auth = null; db = null; storage = null; persistenceEnabled = false;
    }
}

// --- Execution ---
// This block ensures initialization happens only once, either on first import client-side
// or if getApps().length is 0 (though the latter check might be redundant with the outer typeof window)
if (typeof window !== 'undefined') {
    if (!getApps().length) {
        initializeFirebaseServices();
    } else {
        console.log("Firebase app already initialized. Getting existing instance and services.");
        app = getApp(); // Get the default app
        // Get existing services - these should exist if app exists, but add checks
        try {
            auth = getAuth(app);
            db = getFirestore(app);
            storage = getStorage(app);
            // Can't re-check persistence easily here, assume it was handled
            console.log("Retrieved existing Firebase services.");
         } catch (retrievalError: any) {
             const retrievalErrorMessage = `Failed to retrieve services from existing Firebase app: ${retrievalError.message}. App might be in a corrupted state.`;
             console.error("!!! FIREBASE SERVICE RETRIEVAL ERROR !!!", retrievalErrorMessage, retrievalError);
             firebaseInitializationError = new Error(retrievalErrorMessage);
             auth = null; db = null; storage = null; persistenceEnabled = false;
         }
    }
} else {
    console.log("SERVER_SIDE: Firebase initialization skipped.");
}


// Final state log after initialization attempt
console.log("--- Firebase Initialization Final State ---");
console.log("  App Instance:", app ? 'Initialized' : 'Failed/Null');
console.log("  Auth Service:", auth ? 'Initialized' : 'Failed/Null');
console.log("  Firestore Service:", db ? 'Initialized' : 'Failed/Null');
console.log("  Storage Service:", storage ? 'Initialized' : 'Failed/Null');
console.log("  Initialization Error:", firebaseInitializationError ? firebaseInitializationError.message : "None");
console.log("-----------------------------------------");


// Function to check initialization status and throw if failed
function ensureFirebaseInitialized() {
    if (firebaseInitializationError) {
        console.error("ensureFirebaseInitialized check failed due to firebaseInitializationError:", firebaseInitializationError.message);
        // Throw the original error for better context
        throw firebaseInitializationError;
    }
    // Check if all essential services are available
    if (!app || !db || !auth || !storage) {
        const missingServices = [
            !app ? "app" : null,
            !db ? "db" : null,
            !auth ? "auth" : null,
            !storage ? "storage" : null,
        ].filter(Boolean).join(', ');
         const serviceErrorMessage = `Firebase services (${missingServices}) are not available. Initialization may have failed or is incomplete. Check previous console logs for errors.`;
         console.error("ensureFirebaseInitialized check failed:", serviceErrorMessage);
         // Create a new error to indicate this specific check failure
         throw new Error(serviceErrorMessage);
    }
     // If we reach here, basic initialization seems okay
     // console.log("ensureFirebaseInitialized: Check passed. Services appear available.");
}


export { app, db, auth, storage, firebaseInitializationError, ensureFirebaseInitialized, persistenceEnabled };

