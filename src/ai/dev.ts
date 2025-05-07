
import '@/ai/flows/quiz-generation.ts';
import '@/ai/flows/textbook-summarization.ts';
import '@/lib/genkit/tutor'; // Import the file containing runTutorPrompt
import '@/ai/flows/quiz-reflection-flow.ts';
import '@/ai/flows/textbook-explainer-flow.ts';
import '@/ai/flows/quickfind-flow.ts'; // Added import for the new QuickFind flow

// Note: The Server Action file (actions.ts) doesn't need to be imported here.
// Note: The tutor logic in lib/genkit/tutor.ts defines runTutorPrompt, not a flow for registration here.

console.log("Genkit development server starting with flows: Quiz Generation, Textbook Summarization, Quiz Reflection, Textbook Explainer, QuickFind, AI Tutor (via action)");
