
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Validate API Key existence
const googleApiKey = process.env.GOOGLE_GENAI_API_KEY;
if (!googleApiKey) {
  console.error("GOOGLE_GENAI_API_KEY environment variable is not set. AI features will not work.");
  // Optionally, throw an error to prevent startup if the key is absolutely required
  // throw new Error("Missing GOOGLE_GENAI_API_KEY environment variable.");
}

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      // Pass the validated key, or undefined if it's missing (Google AI plugin might handle undefined gracefully or error)
      apiKey: googleApiKey,
    }),
  ],
  // Consider setting a default model or making it configurable
  // model: 'googleai/gemini-2.0-flash', // Example default
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info', // Add log levels
  enableTracing: process.env.NODE_ENV === 'development', // Enable tracing in development
});

// Log successful initialization only if API key exists
if (googleApiKey) {
    console.log("Genkit initialized with Google AI plugin.");
} else {
     console.warn("Genkit initialized, but Google AI plugin might be non-functional due to missing API key.");
}
