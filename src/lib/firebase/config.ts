
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

console.log("Firebase config module loading... typeof window:", typeof window);

// Check if Firebase app is already initialized - Client-side only initialization
if (typeof window !== 'undefined') {
    console.log("CLIENT_SIDE: Firebase initialization checks starting...");
    if (!getApps().length) {
        console.log("CLIENT_SIDE: No Firebase app initialized yet. Proceeding with initialization.");

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
            const errorMessage = `Firebase configuration contains placeholder or missing values for critical keys: ${errorMessages.join(', ')}. Please update your .env file with valid credentials from your Firebase project settings. Refer to README.md for setup instructions. App functionality will be severely limited.`;
            console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            console.error("!!! FIREBASE CONFIGURATION ERROR (CRITICAL) !!!");
            console.error(errorMessage);
            console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            firebaseInitializationError = new Error(errorMessage);
            // Explicitly set services to null if config is invalid
            app = null; db = null; auth = null; storage = null;
            persistenceEnabled = false;
        } else {
            try {
                console.log("CLIENT_SIDE: Firebase config appears valid. Attempting initializeApp()...");
                app = initializeApp(firebaseConfig);
                console.log("CLIENT_SIDE: initializeApp() successful. Getting Auth, Storage, Firestore instances...");
                auth = getAuth(app);
                storage = getStorage(app);
                db = getFirestore(app);
                console.log("CLIENT_SIDE: Firebase services (Auth, Storage, Firestore) obtained.");

                console.log("CLIENT_SIDE: Attempting to enable Firestore offline persistence...");
                enableIndexedDbPersistence(db)
                  .then(() => {
                      persistenceEnabled = true;
                      console.log("CLIENT_SIDE: Firestore offline persistence enabled successfully.");
                  })
                  .catch((err) => {
                    console.warn("CLIENT_SIDE: Firestore offline persistence setup warning/error:", err.code, err.message);
                    if (err.code === 'failed-precondition') {
                        // This means persistence is likely already enabled in another tab or couldn't be enabled now.
                        // For robustness, we might assume it's effectively enabled or will be.
                        persistenceEnabled = true; 
                        console.warn("CLIENT_SIDE: Persistence 'failed-precondition' likely means it's active in another tab or already set up.");
                    } else if (err.code === 'unimplemented') {
                        console.warn("CLIENT_SIDE: Firestore offline persistence is not supported in this browser environment.");
                        persistenceEnabled = false;
                    } else {
                         persistenceEnabled = false; // For other errors, assume it's not enabled.
                    }
                  });
                console.log("CLIENT_SIDE: Firebase core initialization process completed.");
            } catch (error: any) {
                const detailedErrorMessage = `Firebase Core Initialization Failed during app/service setup. Code: ${error.code || 'N/A'}, Message: ${error.message || 'Unknown error'}. Check browser console and network tab for more details. Ensure Firebase SDK versions are compatible.`;
                console.error("CLIENT_SIDE: Firebase initialization error:", detailedErrorMessage, error);
                firebaseInitializationError = new Error(detailedErrorMessage);
                app = null; db = null; auth = null; storage = null;
                persistenceEnabled = false;
            }
        }
    } else {
        console.log("CLIENT_SIDE: Firebase app already initialized. Getting existing instance and services.");
        app = getApp(); // Get the default app
        try {
           auth = getAuth(app);
           storage = getStorage(app);
           db = getFirestore(app);
           // If app exists, persistence might have been set up. We can't re-run enableIndexedDbPersistence easily
           // without checking if it's already active, which is complex. Assume it's handled.
           // A more robust way would be to check a flag set by the first initialization.
           // For now, if app exists, we assume persistence was attempted.
           // We can't *guarantee* persistenceEnabled is true here without more complex state management across initializations.
           // Let's assume if the app object exists, persistence was previously attempted.
           // The 'persistenceEnabled' flag primarily informs other parts of the app if the *attempt* to enable was made.
           console.log("CLIENT_SIDE: Retrieved existing Firebase services successfully.");
        } catch (error: any) {
            const serviceRetrievalErrorMessage = `Failed to get services (Auth, DB, Storage) from existing Firebase app: ${error.message}. This can happen if the app instance is corrupted or not fully initialized.`;
            console.error("CLIENT_SIDE: Error getting Firebase services from existing app:", serviceRetrievalErrorMessage, error);
            firebaseInitializationError = new Error(serviceRetrievalErrorMessage);
            // Nullify services to reflect the error state
            app = null; db = null; auth = null; storage = null;
            persistenceEnabled = false;
        }
    }
} else {
    console.log("SERVER_SIDE: Firebase initialization skipped (will run on client).");
}

console.log("Firebase config.ts final state check:");
console.log("  App initialized:", !!app);
console.log("  Auth service:", !!auth);
console.log("  Firestore service:", !!db);
console.log("  Storage service:", !!storage);
console.log("  Initialization Error:", firebaseInitializationError ? firebaseInitializationError.message : "No explicit error");
console.log("  Persistence Enabled Attempted/Successful (Flag):", persistenceEnabled);


// Function to check initialization status and throw if failed
function ensureFirebaseInitialized() {
    if (firebaseInitializationError) {
        console.error("ensureFirebaseInitialized check failed due to firebaseInitializationError:", firebaseInitializationError.message);
        throw new Error(`Firebase critical initialization failure. Check console logs and your .env file. Original error: ${firebaseInitializationError.message}`);
    }
    if (!app || !db || !auth || !storage) {
        const missingServices = [
            !app ? "app" : null,
            !db ? "db" : null,
            !auth ? "auth" : null,
            !storage ? "storage" : null,
        ].filter(Boolean).join(', ');
         const serviceErrorMessage = `Firebase services (${missingServices}) are not available. Initialization may have failed, been skipped on the server, or encountered an issue on the client.`;
         console.error("ensureFirebaseInitialized check failed:", serviceErrorMessage);
         throw new Error(serviceErrorMessage);
    }
}


export { app, db, auth, storage, firebaseInitializationError, ensureFirebaseInitialized, persistenceEnabled };

