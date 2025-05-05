import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, doc, getDoc } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBTX8tLccPDzYhD2aTtBmSd3kZSH8w0bNo",
  authDomain: "nexuslearn-ai.firebaseapp.com",
  projectId: "nexuslearn-ai",
  storageBucket: "nexuslearn-ai.firebasestorage.app",
  messagingSenderId: "1078854310147",
  appId: "1:1078854310147:web:c707c28d20e526efb136"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// Enable Firestore Offline Persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.error("Persistence failed: Multiple tabs open.");
  } else if (err.code === "unimplemented") {
    console.error("Persistence not supported.");
  }
});

// Function for Google Sign-In
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("User Info:", result.user);
  } catch (error) {
    console.error("Google Sign-In Error:", error.message);
  }
};

// Function to Fetch Firestore Document (Handles Offline Mode)
const fetchDataWithRetry = async (collectionName, documentId) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
    } else {
      console.log("No such document!");
    }
  } catch (error) {
    console.error("Firestore Error:", error.message);

    // Retry fetching after 5 seconds if offline
    setTimeout(() => fetchDataWithRetry(collectionName, documentId), 5000);
  }
};

// Export everything for use in the app
export { auth, provider, db, signInWithGoogle, fetchDataWithRetry };
