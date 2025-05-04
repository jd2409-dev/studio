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
    *   Paste the Firebase configuration values into your `.env` file, matching the variable names:
        ```dotenv
        # Firebase Configuration - Replace with your actual project values
        NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY_HERE"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN_HERE"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID_HERE"
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET_HERE"
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID_HERE"
        NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID_HERE"
        # NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID_HERE" # Optional
        ```
    *   **IMPORTANT:** Ensure you replace `"YOUR_..._HERE"` with your actual credentials.

5.  **Configure Google AI API Key (Optional):**
    *   If you plan to use the Genkit AI features (Summarization, Quiz Generation), you need a Google AI API key.
    *   Obtain a key from Google AI Studio: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
    *   Add the key to your `.env` file:
        ```dotenv
        # Google AI API Key - Replace with your actual key
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
*   **Authentication Pages:** Located in `src/app/login/` (and potentially signup/password reset if added)
*   **UI Components:** Using `shadcn/ui`, located in `src/components/ui/`
*   **AI Flows (Genkit):** Located in `src/ai/flows/`
*   **Firebase Configuration:** `src/lib/firebase/config.ts`
*   **Authentication Context:** `src/context/AuthContext.tsx`
*   **Styling:** Uses Tailwind CSS and CSS variables defined in `src/app/globals.css`.

## Troubleshooting

*   **Firebase Configuration Errors:** Double-check that all `NEXT_PUBLIC_FIREBASE_...` variables in your `.env` file are correctly copied from your Firebase project settings and do not contain placeholder values. Restart the development server after modifying `.env`.
*   **Authentication Errors:** Ensure the Email/Password and Google sign-in methods are enabled in the Firebase Authentication console. Check the browser console for specific Firebase error codes.
*   **Genkit Errors:** Make sure the `GOOGLE_GENAI_API_KEY` is set correctly in your `.env` file if using AI features.
