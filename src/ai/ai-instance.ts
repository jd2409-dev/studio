import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai'; 

// Validate API Key existence
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
  // To make it more obvious during development, we can throw an error
  // or let Genkit handle it when a call is made. For now, logging is clear.
  // throw new Error("Missing or invalid GOOGLE_GENAI_API_KEY. See console for details.");
}

export const ai = genkit({
  plugins: [
    googleAI({
      // Pass the API key. Genkit's googleAI plugin will handle validation if the key is syntactically
      // present but invalid when an API call is made.
      // If googleApiKey is undefined (due to placeholder or missing), it will be passed as such.
      apiKey: googleApiKey,
    }),
  ],
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enableTracing: process.env.NODE_ENV === 'development',
});

// Log successful initialization only if API key seems valid (not a placeholder)
if (googleApiKey && googleApiKey !== "YOUR_GOOGLE_GENAI_API_KEY_HERE" && googleApiKey.trim() !== "") {
    console.log("Genkit initialized with Google AI plugin using provided API key.");
} else {
     console.warn("Genkit initialized, but Google AI plugin is likely non-functional due to missing or placeholder API key. AI features will fail.");
}