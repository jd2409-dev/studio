
# NexusLearn AI (Powered by Firebase Studio)

This is a Next.js starter application featuring AI-powered learning tools, built within Firebase Studio.

## Features

*   AI Textbook Summarization
*   AI Quiz Generation
*   Student Dashboard
*   Firebase Authentication (Email/Password, Google Sign-In)
*   Firestore for User Data Storage
*   Firebase Storage for File Uploads
*   Genkit Integration for AI Flows

## Getting Started

1.  **Clone the repository (if applicable):**
    ```bash
    git clone <your-repo-url>
    cd <your-repo-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Set up Firebase:**
    *   Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
    *   Add a Web App to your project.
    *   Go to Project settings > General > Your apps > Web app.
    *   Find the "SDK setup and configuration" section and select "Config".
    *   Copy the Firebase configuration values.

4.  **Configure Environment Variables:**
    *   Rename the `.env.example` file (if it exists) to `.env` or create a new `.env` file in the root of the project.
    *   **CRITICAL:** Paste the Firebase configuration values you copied from your project settings into your `.env` file. **You MUST replace the placeholder `"YOUR_..._HERE"` values with your actual credentials.**

        ```dotenv
        # Firebase Configuration - **** REPLACE WITH YOUR ACTUAL PROJECT VALUES ****
        NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY_HERE"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN_HERE"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID_HERE"
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET_HERE"
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID_HERE"
        NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID_HERE"
        # NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID_HERE" # Optional
        ```
    *   **WARNING:** Leaving placeholder values like `"YOUR_API_KEY_HERE"` will cause the application to fail, specifically preventing Firebase services (Authentication, Firestore, Storage) from working. The application has built-in checks and will show an error message if placeholders are detected.

5.  **Configure Google AI API Key (Optional but Recommended):**
    *   If you plan to use the Genkit AI features (Summarization, Quiz Generation), you need a Google AI API key.
    *   Obtain a key from Google AI Studio: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
    *   Add the key to your `.env` file:
        ```dotenv
        # Google AI API Key - Replace with your actual key if using AI features
        GOOGLE_GENAI_API_KEY="YOUR_GOOGLE_GENAI_API_KEY_HERE"
        ```

6.  **Enable Authentication Methods (IMPORTANT):**
    *   In the Firebase Console, go to **Authentication** > **Sign-in method**.
    *   **You MUST enable the "Email/Password" provider.** Click on it, toggle the switch to enable, and save. Failure to do this will result in `auth/configuration-not-found` errors when trying to sign up or log in with email.
    *   **You MUST enable the "Google" provider** for Google Sign-In to work. Click on it, toggle the switch to enable, select a project support email, and save.
    *   Go to **Authentication** > **Settings** > **Authorized domains**.
    *   **You MUST add the domains from which your app will be served.** For local development, add `localhost`. If deploying, add your deployment domain (e.g., `your-app-name.web.app`, `your-custom-domain.com`). Failure to authorize your domain will result in `auth/unauthorized-domain` errors.

7.  **Set up Firestore:**
    *   In the Firebase Console, go to Firestore Database.
    *   Click "Create database".
    *   Start in **production mode** (secure by default - requires rules). Select a server location.
    *   Click "Enable".

8.  **Set up Firebase Storage:**
    *   In the Firebase Console, go to Storage.
    *   Click "Get started".
    *   Follow the prompts to set up Storage, using the **production** default security rules (secure by default - requires rules).

9.  **Deploy Security Rules (CRITICAL for Development & Fixing Permissions):**
    *   You need the Firebase CLI installed (`npm install -g firebase-tools`).
    *   Log in to Firebase: `firebase login`
    *   Select your Firebase project: `firebase use <your-project-id>`
    *   **Deploy the Firestore rules** (found in `firestore.rules`):
        ```bash
        firebase deploy --only firestore:rules
        ```
    *   **Deploy the Storage rules** (found in `storage.rules`):
        ```bash
        firebase deploy --only storage
        ```
    *   The provided rules in `firestore.rules` and `storage.rules` allow any *authenticated* user to access their *own* data (`users/{userId}`, `userProgress/{userId}`, `user_avatars/{userId}`, `user_uploads/{userId}`), which is suitable for development. **Failure to deploy these rules WILL result in `permission-denied` errors when trying to access Firestore or Storage.**
    *   **Review and tighten these rules before going to production.**

10. **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

11. **Open [http://localhost:9002](http://localhost:9002)** (or the specified port) with your browser to see the result.

## Development

*   **Main Application Pages:** Located in `src/app/(app)/`
*   **Authentication Pages:** Located in `src/app/login/`
*   **UI Components:** Using `shadcn/ui`, located in `src/components/ui/`
*   **AI Flows (Genkit):** Located in `src/ai/flows/`
*   **Firebase Configuration:** `src/lib/firebase/config.ts`
*   **Authentication Context:** `src/context/AuthContext.tsx`
*   **Styling:** Uses Tailwind CSS and CSS variables defined in `src/app/globals.css`.
*   **Firestore Rules:** `firestore.rules` (Must be deployed)
*   **Storage Rules:** `storage.rules` (Must be deployed)

## Troubleshooting

*   **Firebase Configuration Errors / `auth/api-key-not-valid` / App Not Loading:** This is the most common issue. **Double-check that all `NEXT_PUBLIC_FIREBASE_...` variables in your `.env` file have been replaced with your actual credentials from your Firebase project settings.** Ensure there are no quotes left around the values if you copied them directly. Restart the development server (`npm run dev`) after modifying `.env`. The application has built-in checks and will show an error message if placeholders are detected.
*   **Authentication Errors (`auth/configuration-not-found`):** This specifically means you haven't enabled the required sign-in provider in the Firebase console. Go to Authentication > Sign-in method and **enable both Email/Password and Google providers**.
*   **Authentication Errors (`auth/unauthorized-domain`):** This means the domain you are running the app from (e.g., `localhost` for development) is not listed in the Firebase console under Authentication > Settings > Authorized domains. **You must add `localhost` (and any deployment domains) to this list.**
*   **Other Authentication Errors:** Check the browser console for specific Firebase error codes (e.g., `auth/invalid-credential`, `auth/user-disabled`).
*   **Google Sign-In Errors (`auth/popup-closed-by-user`, `auth/account-exists-with-different-credential`):** Check the browser console for details. Ensure popups aren't blocked. If an account exists with the same email via a different method, try that method first. **Also ensure the Google provider is enabled and `localhost` is in the authorized domains list in the Firebase Authentication settings.**
*   **Genkit Errors:** Make sure the `GOOGLE_GENAI_API_KEY` is set correctly in your `.env` file if using AI features.
*   **Firestore/Storage Permission Errors (`permission-denied` or `Missing or insufficient permissions`):**
    *   This *almost always* means your Firestore or Firebase Storage security rules are either blocking the action because they are too restrictive, OR **they haven't been deployed correctly**.
    *   **FIX FOR DEVELOPMENT:**
        1.  Ensure you have `firestore.rules` and `storage.rules` files in your project root (these should be included).
        2.  **Deploy the rules using the Firebase CLI:** Run `firebase deploy --only firestore:rules` and `firebase deploy --only storage` (after logging in with `firebase login` and selecting your project with `firebase use <your-project-id>`).
        3.  The provided development rules allow any authenticated user access to their *own* data (e.g., documents under `/users/{userId}` where `userId` matches their authenticated ID). **If you don't deploy these rules, the default production rules (secure by default, deny all access) will likely be active, causing permission errors.**
        4.  If you started Firestore in **test mode** (`allow read, write: if true;`), it allows *anyone* access, which is highly insecure but might bypass permission errors during initial setup. It's strongly recommended to use production mode and deploy the provided development rules instead.
    *   **VERY IMPORTANT FOR PRODUCTION:** The development rules (`allow ... : if request.auth != null && request.auth.uid == userId;`) are a starting point. Before deploying to production, you **MUST** write more specific rules based on your application's needs. For example, you might want to allow users to read public data but only write to their own documents. Use the Firebase Console Rules Simulator to test your production rules thoroughly.


```