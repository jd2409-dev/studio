import { z } from "zod";
import { defineFlow } from "@genkitai/ai";
import { PromptTemplate } from "@genkitai/ai/prompt";

export const aiTutorInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
});

export const aiTutorOutputSchema = z.object({
  response: z.string()
});

export type AiTutorInput = z.infer<typeof aiTutorInputSchema>;
export type AiTutorOutput = z.infer<typeof aiTutorOutputSchema>;

export const getTutorResponse = defineFlow({
  name: 'ai-tutor',
  inputSchema: aiTutorInputSchema,
  outputSchema: aiTutorOutputSchema,
  description: 'Responds to user queries with helpful information.',
  prompt: new PromptTemplate<{ history: { role: string, content: string }[] }>(`
  You are an AI tutor designed to help students learn.
  You will be given a chat history between the student (user) and yourself.
  Your job is to provide helpful and informative answers that aid the student in understanding the concepts they ask about.

  Here is the chat history:
  {{#each history}}
    {{#if (eq role "user")}}
      Student: {{content}}
    {{else}}
      Tutor: {{content}}
    {{/if}}
  {{/each}}

  Now, respond to the student's latest question:`,
  {
    customize: (promptObject) => {
      promptObject.handlebarsOptions.knownHelpersOnly = false;
      promptObject.handlebarsOptions.helpers = {
        eq: function (a, b) {
          return a === b;
        }
      };
    }
  }),
  model: 'models/gemini-1.5-flash-001',
  temperature: 0.7,
});
