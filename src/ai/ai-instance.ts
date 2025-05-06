
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai'; // Use correct import path

// Validate API Key existence
const googleApiKey = process.env.GOOGLE_GENAI_API_KEY;
if (!googleApiKey) {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("!!! MISSING GOOGLE_GENAI_API_KEY ERROR !!!");
  console.error("The GOOGLE_GENAI_API_KEY environment variable is not set.");
  console.error("AI features (like summarization and quiz generation) WILL NOT WORK.");
  console.error("Please create a .env file in the project root and add your key:");
  console.error("GOOGLE_GENAI_API_KEY=\"YOUR_API_KEY_HERE\"");
  console.error("You can get a key from Google AI Studio: https://aistudio.google.com/app/apikey");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  // Optionally, throw an error to prevent startup if the key is absolutely required
  // throw new Error("Missing GOOGLE_GENAI_API_KEY environment variable.");
}

export const ai = genkit({
  plugins: [
    googleAI({
      // Pass the validated key, or undefined if it's missing
      // The googleAI plugin should handle the error internally if the key is missing/invalid when called.
      apiKey: googleApiKey || "MISSING_API_KEY", // Pass a placeholder if missing to avoid undefined issues downstream
    }),
  ],
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enableTracing: process.env.NODE_ENV === 'development',
});

// Log successful initialization only if API key exists
if (googleApiKey) {
    console.log("Genkit initialized with Google AI plugin.");
} else {
     console.warn("Genkit initialized, but Google AI plugin is likely non-functional due to missing API key.");
}
