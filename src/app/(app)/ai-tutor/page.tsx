'use client';

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles, User, Bot } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getTutorResponse, type AiTutorInput, type AiTutorOutput } from '@/ai/flows/ai-tutor-flow';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"; // Import Avatar
// Removed Handlebars import as helper registration is now handled in the flow

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Removed global Handlebars.registerHelper("eq", ...)

export default function AiTutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast() || { toast: () => {} }; // Ensures `toast` always exists, useful if ToastProvider might not be ready
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        const viewport = scrollAreaRef.current?.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      });
    }
  }, [messages]);

  const handleSendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const userMessage = input.trim();
    if (!userMessage || isLoading) return;

    setIsLoading(true);
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    
    setMessages(newMessages);

    try {
      const flowInput: AiTutorInput = { history: newMessages };
      const result: AiTutorOutput = await getTutorResponse(flowInput);

      if (!result?.response) throw new Error("Unexpected AI response format. The AI did not provide a response.");

      setMessages([...newMessages, { role: 'assistant', content: result.response }]);
    } catch (error) {
      console.error("Error getting tutor response:", error);
      const errorDesc = error instanceof Error ? error.message : "An unexpected error occurred while contacting the AI tutor.";
      
      toast({
        title: "AI Tutor Error",
        description: errorDesc,
        variant: "destructive",
      });

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

      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary h-5 w-5"/> Chat Session</CardTitle>
          {messages.length === 0 && <CardDescription>Start typing your question below.</CardDescription>}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                  <Bot className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                  Ask me anything about your studies!
                  <br />
                  For example: "Explain Newton's first law" or "What is photosynthesis?"
                </div>
              )}
              {messages.map((message, index) => (
                <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && <Avatar className="h-8 w-8 flex-shrink-0 mt-1"><AvatarImage src="https://picsum.photos/seed/nexuslearn-bot/40/40" alt="AI Bot" data-ai-hint="bot avatar" /><AvatarFallback>AI</AvatarFallback></Avatar>}
                  <div className={`rounded-lg px-4 py-3 max-w-[75%] shadow-md ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && <Avatar className="h-8 w-8 flex-shrink-0 mt-1"><AvatarImage src="https://picsum.photos/seed/nexuslearn-user/40/40" alt="User" data-ai-hint="user avatar" /><AvatarFallback>U</AvatarFallback></Avatar>}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0 mt-1"><AvatarImage src="https://picsum.photos/seed/nexuslearn-bot-loading/40/40" alt="AI Bot" data-ai-hint="bot avatar" /><AvatarFallback>AI</AvatarFallback></Avatar>
                  <div className="rounded-lg px-4 py-3 bg-muted shadow-md">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="border-t p-4 bg-background">
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
              className="min-h-[48px] max-h-[150px] resize-none rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
              disabled={isLoading}
              aria-label="Chat message input"
            />
            <Button type="submit" size="icon" className="rounded-md h-12 w-12 shadow-md" disabled={isLoading || !input.trim()}>
              <Send className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
