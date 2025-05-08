'use client';

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles, Bot, AlertTriangle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getTutorResponse } from '@/app/ai-tutor/actions'; // Server Action
import type { AiTutorInput, AiTutorOutput } from '@/lib/genkit/tutor';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, type DocumentData, FirestoreError } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Timestamp | Date;
}

export const dynamic = 'force-dynamic';

export default function AiTutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading state for AI response
  const [isLoadingHistory, setIsLoadingHistory] = useState(true); // Loading state for chat history
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
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

  // Fetch/subscribe to chat history
  useEffect(() => {
    if (authLoading) {
      setIsLoadingHistory(true);
      return;
    }
    if (!user) {
      setMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    let unsubscribe: () => void = () => {};
    try {
      ensureFirebaseInitialized();
      const messagesColRef = collection(db!, 'users', user.uid, 'tutorMessages');
      const q = query(messagesColRef, orderBy('timestamp', 'asc'));

      setIsLoadingHistory(true);
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages: ChatMessage[] = snapshot.docs.map(doc => {
          const data = doc.data() as DocumentData;
          if (!data.role || !data.content) {
            console.warn("Skipping invalid message from Firestore:", doc.id, data);
            return null;
          }
          return {
            id: doc.id,
            role: data.role === 'user' ? 'user' : 'assistant',
            content: String(data.content),
            timestamp: data.timestamp,
          };
        }).filter((msg): msg is ChatMessage => msg !== null);

        setMessages(fetchedMessages);
        setIsLoadingHistory(false);
      }, (error: FirestoreError) => {
        console.error("Error fetching chat history:", error);
        let errorDesc = "Could not load previous chat messages. " + error.message;
        if (error.code === 'permission-denied') {
          errorDesc = "Could not load chat history due to insufficient permissions. Ensure Firestore rules are deployed correctly (see README). Command: `firebase deploy --only firestore:rules`.";
        } else if (error.code === 'unauthenticated') {
          errorDesc = "You must be logged in to view chat history.";
        } else if (error.code === 'unavailable') {
          errorDesc = "Could not reach the database. Please check your connection.";
        }
        toast({
          title: "Error Loading History",
          description: errorDesc,
          variant: "destructive",
        });
        setIsLoadingHistory(false);
      });
    } catch (initError: any) {
      console.error("Firestore initialization error in AI Tutor:", initError);
      toast({
        title: "Database Error",
        description: "Could not connect to the chat history database. Please refresh.",
        variant: "destructive",
      });
      setIsLoadingHistory(false);
    }

    return () => {
      unsubscribe();
    };
  }, [user, authLoading, toast]);

  const handleSendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const userMessageContent = input.trim();
    if (!userMessageContent || isLoading || !user || isLoadingHistory) {
      return;
    }

    setIsLoading(true); // Start loading indicator *before* async operations
    setInput('');

    const optimisticUserMessage: ChatMessage = { role: 'user', content: userMessageContent, timestamp: new Date() };
    const historyForFlow: AiTutorInput = {
      history: [...messages, optimisticUserMessage].map(m => ({ role: m.role, content: m.content }))
    };

    let userMessageDocId: string | null = null;

    try {
      ensureFirebaseInitialized();
      const messagesColRef = collection(db!, 'users', user.uid, 'tutorMessages');

      // Save user message first (this can happen while AI processes)
      const userMessageRef = await addDoc(messagesColRef, {
        role: 'user',
        content: userMessageContent,
        timestamp: serverTimestamp(),
      });
      userMessageDocId = userMessageRef.id;

      // --- Call the Server Action ---
      console.log("Calling getTutorResponse Server Action...");
      const result: AiTutorOutput = await getTutorResponse(historyForFlow);
      console.log("Server Action returned:", result);
      // --- Server Action Call End ---

      if (!result || !result.response || typeof result.response !== 'string') {
        console.error("AI Tutor Error: No valid response content from AI action:", result);
        throw new Error("The AI tutor did not provide a valid response.");
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
      let errorTitle = "Chat Error";
      let errorDesc = "An unexpected error occurred. Please try again.";

      if (error instanceof Error) {
          errorDesc = error.message; // Use the specific error message

           // Check for specific prefixes or error content
          if (error.message.startsWith("AI Tutor Error:")) {
               errorTitle = "AI Tutor Error";
               errorDesc = error.message.replace("AI Tutor Error:", "").trim();
           } else if (error.message.startsWith("Invalid input:")) {
               errorTitle = "Input Error";
               errorDesc = error.message.replace("Invalid input:", "").trim();
          } else if (error.message.includes("internal template issue")) {
               errorTitle = "AI Processing Error";
               // Use the user-friendly message thrown by the action
           } else if (error.code === 'permission-denied') {
               errorTitle = "Database Error";
               errorDesc = "Could not save message due to insufficient permissions. Check Firestore rules.";
           } else if (error.code === 'unavailable') {
               errorTitle = "Network Error";
               errorDesc = "Could not save message. Check connection.";
           }
      }

      toast({
        title: errorTitle,
        description: errorDesc,
        variant: "destructive",
      });

    } finally {
      setIsLoading(false); // Stop loading indicator regardless of success or failure
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
                <div className="flex items-center justify-center h-full py-10">
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
              {messages.map((message, index) => (
                <div key={message.id || `msg-${index}`} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && <Avatar className="h-8 w-8 flex-shrink-0 mt-1"><AvatarImage src="https://picsum.photos/seed/nexuslearn-bot/40/40" alt="AI Bot" data-ai-hint="bot avatar" /><AvatarFallback>AI</AvatarFallback></Avatar>}
                  <div className={`rounded-lg px-4 py-3 max-w-[75%] shadow-md ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && <Avatar className="h-8 w-8 flex-shrink-0 mt-1"><AvatarImage src={user?.photoURL || `https://avatar.vercel.sh/${user?.email}.png`} alt="User" data-ai-hint="user avatar" /><AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback></Avatar>}
                </div>
              ))}
              {isLoading && !isLoadingHistory && ( // Show AI thinking indicator
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
              placeholder={isLoadingHistory ? "Loading history..." : (!user ? "Please log in to chat" : "Type your question here...")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Send on Enter, unless Shift is pressed
                if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isLoadingHistory && user && input.trim()) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
              className="min-h-[48px] max-h-[150px] resize-none rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
              disabled={isLoading || isLoadingHistory || !user || authLoading} // Disable input while loading anything or not logged in
              aria-label="Chat message input"
            />
            <Button
                type="submit"
                size="icon"
                className="rounded-md h-12 w-12 shadow-md flex-shrink-0" // Added flex-shrink-0
                disabled={isLoading || isLoadingHistory || !user || !input.trim() || authLoading} // Comprehensive disable check
                aria-label="Send message"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}

    