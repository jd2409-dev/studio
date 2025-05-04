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
    *   **WARNING:** Leaving placeholder values like `"YOUR_API_KEY_HERE"` will cause the application to fail, specifically preventing Firebase services (Authentication, Firestore, Storage) from working.

5.  **Configure Google AI API Key (Optional but Recommended):**
    *   If you plan to use the Genkit AI features (Summarization, Quiz Generation), you need a Google AI API key.
    *   Obtain a key from Google AI Studio: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
    *   Add the key to your `.env` file:
        ```dotenv
        # Google AI API Key - Replace with your actual key if using AI features
        GOOGLE_GENAI_API_KEY="YOUR_GOOGLE_GENAI_API_KEY_HERE"
        ```

6.  **Enable Authentication Methods:**
    *   In the Firebase Console, go to Authentication > Sign-in method.
    *   Enable the "Email/Password" provider.
    *   Enable the "Google" provider. Make sure to add your project's authorized domains if prompted (usually handled automatically for localhost during development).

7.  **Set up Firestore:**
    *   In the Firebase Console, go to Firestore Database.
    *   Click "Create database".
    *   Start in **test mode** for development (allows open access - **change security rules before production!**). Select a server location.
    *   Click "Enable".

8.  **Set up Firebase Storage:**
    *   In the Firebase Console, go to Storage.
    *   Click "Get started".
    *   Follow the prompts to set up Storage, using the default security rules for development (allows authenticated access - **review rules before production!**).

9.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

10. **Open [http://localhost:9002](http://localhost:9002)** (or the specified port) with your browser to see the result.

## Development

*   **Main Application Pages:** Located in `src/app/(app)/`
*   **Authentication Pages:** Located in `src/app/login/`
*   **UI Components:** Using `shadcn/ui`, located in `src/components/ui/`
*   **AI Flows (Genkit):** Located in `src/ai/flows/`
*   **Firebase Configuration:** `src/lib/firebase/config.ts`
*   **Authentication Context:** `src/context/AuthContext.tsx`
*   **Styling:** Uses Tailwind CSS and CSS variables defined in `src/app/globals.css`.

## Troubleshooting

*   **Firebase Configuration Errors / `auth/api-key-not-valid` / App Not Loading:** This is the most common issue. **Double-check that all `NEXT_PUBLIC_FIREBASE_...` variables in your `.env` file have been replaced with your actual credentials from your Firebase project settings.** Ensure there are no quotes left around the values if you copied them directly. Restart the development server (`npm run dev`) after modifying `.env`. The application has built-in checks and will show an error message if placeholders are detected.
*   **Authentication Errors:** Ensure the Email/Password and Google sign-in methods are enabled in the Firebase Authentication console. Check the browser console for specific Firebase error codes (e.g., `auth/user-not-found`, `auth/wrong-password`).
*   **Google Sign-In Errors (`auth/popup-closed-by-user`, `auth/account-exists-with-different-credential`):** Check the browser console for details. Ensure popups aren't blocked. If an account exists with the same email via a different method, try that method first.
*   **Genkit Errors:** Make sure the `GOOGLE_GENAI_API_KEY` is set correctly in your `.env` file if using AI features.
*   **Firestore/Storage Permission Errors:** Review your Firestore and Storage security rules in the Firebase console. The default rules for development are permissive but might need adjustment or may have been changed. For production, **always** configure secure rules.
