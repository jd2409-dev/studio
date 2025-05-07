
'use client';

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles, User, Bot } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getTutorResponse, type AiTutorInput, type AiTutorOutput } from '@/ai/flows/ai-tutor-flow';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, type DocumentData, FirestoreError } from 'firebase/firestore';

interface ChatMessage {
  id?: string; // Firestore document ID
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Timestamp | Date; // Firestore Timestamp or Date object for optimistic updates
}

// Ensure the page is dynamically rendered
export const dynamic = 'force-dynamic';

export default function AiTutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { toast } = useToast() || { toast: () => {} };
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      requestAnimationFrame(() => {
        const viewport = scrollAreaRef.current?.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!user) {
      setMessages([]); // Clear messages if user logs out
      setIsLoadingHistory(false);
      return;
    }

    ensureFirebaseInitialized();
    const messagesColRef = collection(db!, 'users', user.uid, 'tutorMessages');
    const q = query(messagesColRef, orderBy('timestamp', 'asc'));

    setIsLoadingHistory(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: ChatMessage[] = snapshot.docs.map(doc => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          role: data.role,
          content: data.content,
          timestamp: data.timestamp, // Keep as Firestore Timestamp or Date
        };
      });
      setMessages(fetchedMessages);
      setIsLoadingHistory(false);
    }, (error: FirestoreError) => {
      console.error("Error fetching chat history:", error);
      let errorDesc = "Could not load previous chat messages. " + error.message;
      if (error.code === 'permission-denied') {
        errorDesc = "Could not load chat history due to insufficient permissions. Please ensure Firestore rules are deployed correctly (see README). This often involves running `firebase deploy --only firestore:rules`.";
      }
      toast({
        title: "Error Loading History",
        description: errorDesc,
        variant: "destructive",
      });
      setIsLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const handleSendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const userMessageContent = input.trim();
    if (!userMessageContent || isLoading || !user) return;

    setIsLoading(true);
    setInput('');

    // Optimistically create the user message for the flow input
    const optimisticUserMessage: ChatMessage = { role: 'user', content: userMessageContent, timestamp: new Date() };
    // Construct history for the flow using current messages + optimistic user message
    const historyForFlow: AiTutorInput = { 
        history: [...messages, optimisticUserMessage].map(m => ({ role: m.role, content: m.content }))
    };

    try {
      // Save user message to Firestore
      const messagesColRef = collection(db!, 'users', user.uid, 'tutorMessages');
      await addDoc(messagesColRef, {
        role: 'user',
        content: userMessageContent,
        timestamp: serverTimestamp(),
      });

      // Get AI response
      const result: AiTutorOutput = await getTutorResponse(historyForFlow);

      if (!result?.response) {
        console.error("AI Tutor Error: No response content from AI for input:", JSON.stringify(historyForFlow));
        throw new Error("The AI tutor did not provide a response. Please try rephrasing your question.");
      }

      // Save AI message to Firestore
      await addDoc(messagesColRef, {
        role: 'assistant',
        content: result.response,
        timestamp: serverTimestamp(),
      });
      // UI will update via onSnapshot listener

    } catch (error: any) {
      console.error("Error during chat interaction:", error);
      let errorDesc = "An unexpected error occurred. Please try again.";
      if (error instanceof Error) {
        if (error.message.startsWith("AI Tutor encountered an error:") || error.message.includes("No output received from the AI model")) {
          errorDesc = "I'm having a little trouble right now. Could you try asking again in a moment?";
        } else if (error.message.includes("Firestore") || (error.code && error.code.startsWith('permission-denied'))) { // Check for FirestoreError codes
            if(error.code === 'permission-denied'){
                 errorDesc = "Could not save message due to insufficient permissions. Please ensure Firestore rules are deployed correctly (see README). This often involves running `firebase deploy --only firestore:rules`.";
            } else {
                errorDesc = "There was an issue saving your message to the database. Please try again.";
            }
        } else {
          errorDesc = error.message;
        }
      }
      
      toast({
        title: "Chat Error",
        description: errorDesc,
        variant: "destructive",
      });
      // If AI response failed, we might want to add a temporary error message to UI
      // For now, Firestore save errors for user message would also be caught here.
      // The onSnapshot listener will keep the UI consistent with DB.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 flex flex-col h-[calc(100vh-120px)] max-h-[calc(100vh-120px)]">
      <h1 className="text-3xl font-bold mb-2">AI Tutor</h1>
      <p className="text-muted-foreground mb-6">
        Ask questions, get explanations, and clarify concepts with your AI study partner. Chat history is saved.
      </p>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary h-5 w-5"/> Chat Session</CardTitle>
          {messages.length === 0 && !isLoadingHistory && <CardDescription>Start typing your question below.</CardDescription>}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
            <div className="space-y-4">
              {isLoadingHistory && (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading chat history...</p>
                </div>
              )}
              {!isLoadingHistory && messages.length === 0 && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                  <Bot className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                  Ask me anything about your studies!
                  <br />
                  For example: "Explain Newton's first law" or "What is photosynthesis?"
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id || `msg-${Math.random()}`} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && <Avatar className="h-8 w-8 flex-shrink-0 mt-1"><AvatarImage src="https://picsum.photos/seed/nexuslearn-bot/40/40" alt="AI Bot" data-ai-hint="bot avatar" /><AvatarFallback>AI</AvatarFallback></Avatar>}
                  <div className={`rounded-lg px-4 py-3 max-w-[75%] shadow-md ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && <Avatar className="h-8 w-8 flex-shrink-0 mt-1"><AvatarImage src="https://picsum.photos/seed/nexuslearn-user/40/40" alt="User" data-ai-hint="user avatar" /><AvatarFallback>U</AvatarFallback></Avatar>}
                </div>
              ))}
              {isLoading && !isLoadingHistory && ( // Show AI thinking indicator only if not loading history
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
                if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isLoadingHistory) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
              className="min-h-[48px] max-h-[150px] resize-none rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
              disabled={isLoading || isLoadingHistory || !user}
              aria-label="Chat message input"
            />
            <Button type="submit" size="icon" className="rounded-md h-12 w-12 shadow-md" disabled={isLoading || isLoadingHistory || !user || !input.trim()}>
              <Send className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}

