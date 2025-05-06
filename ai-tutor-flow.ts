 context, politely steer the conversation back to educational topics.
If a question is unclear or ambiguous, ask for
I'll make the necessary changes to integrate Genkit for the AI Tutor feature and ensure the chat history is stored and retrieved using Cloud Firestore. This will involve updating the `ai-tutor-flow.ts` to use Genkit's `defineFlow` and `definePrompt` and modifying the `ai-tutor/page.tsx` to interact with Firestore for chat messages.

Here are the changes:
clarification before attempting to answer.
Utilize the provided conversation history to maintain context and provide relevant follow-up responses.
Aim for comprehensive yet easy-to-understand explanations. Use examples, analogies, or step-by-step breakdowns where appropriate.
Avoid giving direct answers to homework or test questions; instead, guide the student to discover the answer themselves by explaining underlying concepts or asking probing questions.
Your tone should be supportive and motivational at all times.

Conversation History:
{{#each history}}
  {{#if (eq role "user")}}
User: {{{content}}}
  {{else}}
Tutor: {{{content}}}
  {{/if}}
{{/each}}
Tutor, provide your response:
`;

export const aiTutorFlow = defineFlow(
  {
    name: 'nexusLearnAiTutorFlow',
    inputSchema: AiTutorInputSchema,
    outputSchema: AiTutorOutputSchema,
  },
  async (input) => {
    console.log("AI Tutor Flow: Received input - History length:", input.history.length);
    if (input.history.length > 0) {
        console.log("AI Tutor Flow: Last user message:", input.history[input.history.length-1].content);
    }
    
    // Create a new prompt template instance
    const promptTemplate = new PromptTemplate({
        template: aiTutorPromptTemplate,
        inputSchema: AiTutorInputSchema,
    });

    // Render the prompt with the input data
    const renderedPrompt = await promptTemplate.render(input);

    try {
      // Generate the response using the Gemini model
      const response = await ai.generate({
        model: gemini15Flash, // Use the specific model
        prompt: renderedPrompt.prompt,
        output: {
          format: 'text', // Ensure output is text
        },
        config: {
          temperature: 0.7,
        },
      });

      const responseText = response.text;

      // Ensure responseText is not null or undefined before returning
      if (responseText === undefined || responseText === null) {
        console.error("AI Tutor generation failed: No response text received from the AI model. Input:", JSON.stringify(input));
        throw new Error("AI Tutor generation failed: No output received from the AI model.");
      }
      console.log("AI Tutor Flow: Response generated - ", responseText.substring(0, 100) + "...");
      return { response: responseText };
    } catch (error: any) {
        console.error(`Error in aiTutorFlow:`, error.message, error.stack, "Input:", JSON.stringify(input));
        throw new Error(`AI Tutor encountered an error: ${error.message}`);
    }
  }
);
