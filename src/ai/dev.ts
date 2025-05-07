
import '@/ai/flows/quiz-generation.ts';
import '@/ai/flows/textbook-summarization.ts';
// Removed import for old tutor-flow.ts
import '@/ai/flows/quiz-reflection-flow.ts';
import '@/ai/flows/textbook-explainer-flow.ts';
// Note: The Server Action file (actions.ts) doesn't need to be imported here.
// Note: The new tutor flow logic in lib/genkit/tutor.ts doesn't need to be imported here either,
// as it's not defining a Genkit flow directly that needs registration at dev time.
