
# NexusLearn AI (Powered by Firebase Studio)

This is a Next.js starter application featuring AI-powered learning tools, built within Firebase Studio.

## Features

*   AI Textbook Summarization
*   AI Textbook Explainer (Text, Audio Script, Mind Map)
*   **QuickFind Document Search** (Search within uploaded PDFs)
*   AI Quiz Generation (with Difficulty & Grade Level options)
*   AI Tutor Chatbot
*   Quiz Reflection
*   Study Planner
*   Performance Analytics Dashboard
*   Student Profile Management
*   Firebase Authentication (Email/Password, Google Sign-In)
*   Firestore for User Data Storage (Progress, History, Settings)
*   Firebase Storage for File Uploads (Optional for Textbooks, Avatars)
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

5.  **Configure Google AI API Key (REQUIRED for AI features):**
    *   You need a Google AI API key for Genkit AI features (Summarization, Quiz Generation, Explainer, QuickFind, Tutor).
    *   Obtain a key from Google AI Studio: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
    *   Add the key to your `.env` file:
        ```dotenv
        # Google AI API Key - Replace with your actual key
        GOOGLE_GENAI_API_KEY="YOUR_GOOGLE_GENAI_API_KEY_HERE"
        ```
     *   **WARNING:** Leaving the placeholder value `"YOUR_GOOGLE_GENAI_API_KEY_HERE"` will cause all AI features to fail.

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
    *   Firebase Storage is used for the "Upload Textbook" and "QuickFind" features, and potentially for profile avatars if you choose not to use Data URIs.
    *   In the Firebase Console, go to **Storage**.
    *   Click "Get started".
    *   Follow the prompts to set up Storage, using the **production** default security rules (secure by default - requires rules). Select a server location.

9.  **Deploy Security Rules (CRITICAL for Fixing Permission Errors):**
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
    *   <br/>
    *   **🚨 VERY IMPORTANT:** **Failure to deploy these rules WILL cause `permission-denied` or "Missing or insufficient permissions" errors** when the application tries to read or write data (e.g., loading the dashboard, saving profile information, saving AI Tutor chat messages, **uploading/accessing files for QuickFind or Upload Textbook features**). Seeing messages like **"Error Loading Data," "Could not load dashboard data due to insufficient permissions,"** errors related to saving chat history for the **AI Tutor**, or **file upload/access failures** is a strong indicator that **rules have not been deployed or are incorrect.**
    *   **Whenever new features are added that interact with Firestore (like the AI Tutor chat history at `users/{userId}/tutorMessages`) or Storage (like `quickfind_uploads/{userId}`), you may need to update and re-deploy your `firestore.rules` or `storage.rules` files.**
    *   <br/>
    *   The provided rules in `firestore.rules` and `storage.rules` are designed for development and allow any *authenticated* user to access their *own* data (documents under `/users/{userId}`, `/userProgress/{userId}`, or files under appropriate user-specific paths like `user_avatars/{userId}`, `user_uploads/{userId}`, `quickfind_uploads/{userId}` where `{userId}` matches their logged-in ID). This includes subcollections like `tutorMessages` under `/users/{userId}`.
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
*   **Genkit Errors / AI Features Failing:**
    *   Ensure the `GOOGLE_GENAI_API_KEY` is set correctly (no placeholders) in your `.env` file. Restart the dev server after changes.
    *   Check the server console (where `npm run dev` is running) for more detailed Genkit/AI flow error messages. Look for logs mentioning specific flows (`generateQuizFlow`, `aiTutorFlow`, `quickFindFlow`, etc.).
    *   Errors like `Generation blocked` often mean the content provided to the AI (e.g., textbook content, chat message) triggered safety filters. Try different content.
    *   Errors mentioning "API key not valid" or connection issues usually point to problems with the `GOOGLE_GENAI_API_KEY` or network connectivity to Google AI services.
*   **Firestore/Storage Permission Errors (`permission-denied` or `Missing or insufficient permissions`) / Dashboard shows "Error Loading" / AI Tutor chat not saving / File Uploads Fail:**
    *   This *almost always* means your Firestore or Firebase Storage security rules are either blocking the action because they are too restrictive, OR **they haven't been deployed correctly.** Seeing "Error Loading" on the dashboard, issues with AI Tutor chat history, or file upload failures (especially for QuickFind or Upload Textbook) are strong indicators of this issue.
    *   **FIX FOR DEVELOPMENT:**
        1.  Ensure you have `firestore.rules` and `storage.rules` files in your project root (these should be included).
        2.  **Deploy the rules using the Firebase CLI:** Run `firebase deploy --only firestore:rules` **AND** `firebase deploy --only storage` after logging in with `firebase login` and selecting your project with `firebase use <your-project-id>`. **This is the most critical step to fix permission errors.**
        3.  The provided development rules (`firestore.rules`, `storage.rules`) allow any authenticated user access to their *own* data (e.g., documents under `/users/{userId}` or `/userProgress/{userId}` or their subcollections like `/users/{userId}/tutorMessages/{messageId}`; files under `/user_uploads/{userId}` or `/quickfind_uploads/{userId}`). **If you don't deploy these rules, the default production rules (secure by default, deny all access) will likely be active, causing permission errors.**
        4.  If you started Firestore in **test mode** (`allow read, write: if true;`), it allows *anyone* access, which is highly insecure but might bypass permission errors during initial setup. It's strongly recommended to use production mode and deploy the provided development rules instead.
    *   **VERY IMPORTANT FOR PRODUCTION:** The development rules are a starting point. Before deploying to production, you **MUST** write more specific rules based on your application's needs. For example, you might want to allow users to read public data but only write to their own documents. Use the Firebase Console Rules Simulator to test your production rules thoroughly.
*   **AI Tutor `knownHelpersOnly` Error:** If you encounter errors mentioning "unknown helper eq", ensure the `handlebarsOptions` in `src/lib/genkit/tutor.ts` correctly includes the helper definition OR `knownHelpersOnly` is set to `false`.

```