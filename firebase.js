import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBTX8tLccPDzYhD2aTtBmSd3kZSH8w0bNo",
  authDomain: "nexuslearn-ai.firebaseapp.com",
  projectId: "nexuslearn-ai",
  storageBucket: "nexuslearn-ai.firebasestorage.app",
  messagingSenderId: "1078854310147",
  appId: "1:1078854310147:web:c707c28d20e52766efb136"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBTX8tLccPDzYhD2aTtBmSd3kZSH8w0bNo",
  authDomain: "nexuslearn-ai.firebaseapp.com",
  projectId: "nexuslearn-ai",
  storageBucket: "nexuslearn-ai.firebasestorage.app",
  messagingSenderId: "1078854310147",
  appId: "1:1078854310147:web:c707c28d20e526efb136"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };


