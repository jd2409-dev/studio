// No "use server" here

import { genkit, z } from 'genkit';
import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { firebase } from "@genkit-ai/firebase"; // Import firebase plugin if needed for other flows

// Check for API Key validity
const googleApiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!googleApiKey || googleApiKey === "YOUR_GOOGLE_GENAI_API_KEY_HERE" || googleApiKey.trim() === "") {
  const errorMessage =
`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!! CRITICAL: MISSING OR INVALID GOOGLE_GENAI_API_KEY ERROR !!!
The GOOGLE_GENAI_API_KEY environment variable is either not set, or set to a placeholder.
AI features (like summarization, quiz generation, and AI tutor) WILL NOT WORK.

To fix this:
1. Obtain a Google AI API key from Google AI Studio: https://aistudio.google.com/app/apikey
2. Create a .env file in the root of your project (if it doesn't exist).
3. Add the following line to your .env file, replacing YOUR_API_KEY_HERE with your actual key:
   GOOGLE_GENAI_API_KEY="YOUR_API_KEY_HERE"
4. Restart your development server.

If you've already done this, ensure the key is correct and has no extra spaces.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`;
  console.error(errorMessage);
  // Optionally throw an error to prevent initialization if the key is invalid
  // throw new Error("Missing or invalid GOOGLE_GENAI_API_KEY. Cannot initialize Genkit.");
} else {
    console.log("GOOGLE_GENAI_API_KEY detected. Initializing Genkit...");
}


// Configure Genkit instance
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: googleApiKey }),
    // firebase() // Include if you need Firebase integration in other flows
  ],
  model: gemini15Flash, // Default model if needed across flows
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enableTracing: process.env.NODE_ENV === 'development',
});

// Log successful initialization based on API key validity check passed
if (googleApiKey && googleApiKey !== "YOUR_GOOGLE_GENAI_API_KEY_HERE" && googleApiKey.trim() !== "") {
    console.log("Genkit initialized successfully with Google AI plugin.");
} else {
     console.warn("Genkit initialized, but Google AI plugin is likely non-functional due to missing or placeholder API key. AI features may fail.");
}


// Export common utilities if needed by flows
export { z, gemini15Flash };