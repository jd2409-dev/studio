
'use client';

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles, User, Bot } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getTutorResponse, type AiTutorInput, type AiTutorOutput } from '@/ai/flows/ai-tutor-flow'; // Import the actual flow

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiTutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref for scroll area viewport

   // Scroll to bottom whenever messages change
  useEffect(() => {
      if (scrollAreaRef.current) {
          // Use setTimeout to ensure the scroll happens after the DOM update
          setTimeout(() => {
              const viewport = scrollAreaRef.current?.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
              if (viewport) {
                  viewport.scrollTop = viewport.scrollHeight;
              }
          }, 0);
      }
  }, [messages]);


  const handleSendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const userMessage = input.trim();
    if (!userMessage || isLoading) return;

    setIsLoading(true);
    setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      // Call the actual Genkit flow
      const flowInput: AiTutorInput = { history: newMessages };
      const result: AiTutorOutput = await getTutorResponse(flowInput);

      const aiResponse: ChatMessage = { role: 'assistant', content: result.response };
      setMessages([...newMessages, aiResponse]);

    } catch (error) {
      console.error("Error getting tutor response:", error);
      let errorDesc = "Sorry, I couldn't process your request. Please try again.";
      if (error instanceof Error) {
          errorDesc = error.message || errorDesc;
      }
      toast({
        title: "Error",
        description: errorDesc,
        variant: "destructive",
      });
       // Add an error message to the chat
       setMessages([...newMessages, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 flex flex-col h-[calc(100vh-120px)] max-h-[calc(100vh-120px)]">
      <h1 className="text-3xl font-bold mb-2">AI Tutor</h1>
      <p className="text-muted-foreground mb-6">
        Ask questions, get explanations, and clarify concepts with your AI study partner.
      </p>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary h-5 w-5"/> Chat Session</CardTitle>
           {messages.length === 0 && (
              <CardDescription>Start typing your question below.</CardDescription>
           )}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.length === 0 && !isLoading && (
                    <div className="text-center text-muted-foreground py-10">
                        Ask me anything about your studies!
                    </div>
                )}
                {messages.map((message, index) => (
                  <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'assistant' && <Bot className="h-6 w-6 text-primary flex-shrink-0 mt-1" />}
                    <div className={`rounded-lg px-4 py-2 max-w-[75%] shadow-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                     {message.role === 'user' && <User className="h-6 w-6 flex-shrink-0 mt-1" />}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-3">
                     <Bot className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                     <div className="rounded-lg px-4 py-2 bg-muted shadow-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
        </CardContent>
         <CardFooter className="border-t p-4">
             <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
               <Textarea
                 placeholder="Type your question here..."
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                     e.preventDefault();
                     handleSendMessage();
                   }
                 }}
                 rows={1}
                 className="min-h-[40px] max-h-[150px] resize-none"
                 disabled={isLoading}
                 aria-label="Chat message input"
               />
               <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                 <Send className="h-4 w-4" />
                 <span className="sr-only">Send message</span>
               </Button>
             </form>
         </CardFooter>
      </Card>
    </div>
  );
}
