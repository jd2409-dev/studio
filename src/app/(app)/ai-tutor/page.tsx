'use client';

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles, Bot } from 'lucide-react'; // Removed User icon as it's not used directly here
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
// Import the action function and types (types are safe to import)
import { getTutorResponse } from '@/app/ai-tutor/actions';
import type { AiTutorInput, AiTutorOutput } from '@/ai/flows/tutor-flow'; // Import types from the flow definition file
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, type DocumentData, FirestoreError } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components

interface ChatMessage {
  id?: string; // Firestore document ID
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Timestamp | Date; // Firestore Timestamp or Date object for optimistic updates
}

// Ensure the page is dynamically rendered as it uses server actions and fetches data dynamically
export const dynamic = 'force-dynamic';

export default function AiTutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { toast } = useToast() || { toast: () => {} };
  const { user, loading: authLoading } = useAuth(); // Get user state
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
    // If auth is still loading, wait
    if (authLoading) {
        setIsLoadingHistory(true);
        return;
    }
    // If auth is done and no user, clear messages and stop loading history
    if (!user) {
        setMessages([]); // Clear messages if user logs out
        setIsLoadingHistory(false);
        return;
    }

    // Proceed if user exists and auth is loaded
    let unsubscribe: () => void = () => {};
    try {
        ensureFirebaseInitialized(); // Ensure Firebase is ready
        const messagesColRef = collection(db!, 'users', user.uid, 'tutorMessages');
        const q = query(messagesColRef, orderBy('timestamp', 'asc'));

        setIsLoadingHistory(true); // Start loading history specifically for this user
        unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedMessages: ChatMessage[] = snapshot.docs.map(doc => {
            const data = doc.data() as DocumentData;
            // Basic validation for essential fields
             if (!data.role || !data.content) {
                console.warn("Skipping invalid message from Firestore:", doc.id, data);
                return null; // Skip invalid messages
             }
            return {
              id: doc.id,
              role: data.role === 'user' ? 'user' : 'assistant', // Ensure valid role
              content: String(data.content), // Ensure content is string
              timestamp: data.timestamp, // Keep as Firestore Timestamp or Date
            };
          }).filter((msg): msg is ChatMessage => msg !== null); // Filter out null (invalid) messages

          setMessages(fetchedMessages);
          setIsLoadingHistory(false); // Stop loading history after fetch/update
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


    // Cleanup function
    return () => {
        // console.log("Unsubscribing from Firestore chat history.");
        unsubscribe();
    };
  }, [user, authLoading, toast]); // Dependency array includes user and authLoading


  const handleSendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const userMessageContent = input.trim();
    if (!userMessageContent || isLoading || !user || isLoadingHistory) {
        // Prevent sending if loading history, AI is processing, no user, or empty input
        return;
    }

    setIsLoading(true);
    setInput('');

    // Optimistically create the user message for the flow input
    const optimisticUserMessage: ChatMessage = { role: 'user', content: userMessageContent, timestamp: new Date() };
    // Construct history for the flow using current messages + optimistic user message
    const historyForFlow: AiTutorInput = {
        history: [...messages, optimisticUserMessage].map(m => ({ role: m.role, content: m.content }))
    };

    let userMessageDocId: string | null = null;

    try {
      ensureFirebaseInitialized(); // Ensure firebase is ready
      // Save user message to Firestore
      const messagesColRef = collection(db!, 'users', user.uid, 'tutorMessages');
      const userMessageRef = await addDoc(messagesColRef, {
        role: 'user',
        content: userMessageContent,
        timestamp: serverTimestamp(),
      });
      userMessageDocId = userMessageRef.id; // Store ID in case we need to show an error state later

      // --- Call the Server Action ---
      const result: AiTutorOutput = await getTutorResponse(historyForFlow);
      // --- Server Action Call End ---

      // Check if the result contains an error message from the flow/action itself
      if (!result || result.response.startsWith("Sorry,") || result.response.startsWith("I cannot provide a response") || result.response.startsWith("AI Tutor Error:")) {
         const errorMessage = result?.response || "AI Tutor returned an empty or invalid response.";
         console.error("AI Tutor Error Response Received:", errorMessage);
         // Throw an error so it's caught by the catch block and displayed as a toast
         throw new Error(errorMessage);
      }

      // Ensure we have a valid string response
      if (typeof result.response !== 'string') {
        console.error("AI Tutor Error: No valid response content from AI action for input:", JSON.stringify(historyForFlow), "Result:", result);
        throw new Error("The AI tutor did not provide a valid response. Please try rephrasing your question.");
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
         // Use the specific error message thrown by the action or flow
         errorDesc = error.message;

         // Customize title based on error type if needed
          if (error.message.startsWith("AI Tutor Error:")) {
             errorTitle = "AI Tutor Error";
             errorDesc = error.message.replace("AI Tutor Error:", "").trim(); // Clean up prefix
          } else if (error.message.startsWith("Invalid input:")) {
              errorTitle = "Input Error";
               errorDesc = error.message.replace("Invalid input:", "").trim();
          } else if (error.code && error.code.startsWith('permission-denied')) { // Check for FirestoreError codes during save
              errorTitle = "Database Error";
              errorDesc = "Could not save message due to insufficient permissions. Please ensure Firestore rules are deployed correctly (see README). Command: `firebase deploy --only firestore:rules`.";
          } else if (error.code === 'unavailable') {
               errorTitle = "Network Error";
               errorDesc = "Could not save message. Please check your connection and try again.";
          } else if (error.message.startsWith("AI Tutor internal template error:")) {
             errorTitle = "AI Tutor Template Error";
             errorDesc = error.message.replace("AI Tutor internal template error:", "").trim() + " Please contact support.";
          }
      }

      toast({
        title: errorTitle,
        description: errorDesc,
        variant: "destructive",
      });
      // Consider adding a temporary error indicator to the UI if needed,
      // though the toast provides feedback.
      // Example: could update the user message in Firestore with an error flag,
      // but that adds complexity.
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
              {messages.map((message, index) => ( // Use index as key if message.id is not always available (e.g., optimistic)
                <div key={message.id || `msg-${index}`} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && <Avatar className="h-8 w-8 flex-shrink-0 mt-1"><AvatarImage src="https://picsum.photos/seed/nexuslearn-bot/40/40" alt="AI Bot" data-ai-hint="bot avatar" /><AvatarFallback>AI</AvatarFallback></Avatar>}
                  <div className={`rounded-lg px-4 py-3 max-w-[75%] shadow-md ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && <Avatar className="h-8 w-8 flex-shrink-0 mt-1"><AvatarImage src={user?.photoURL || `https://avatar.vercel.sh/${user?.email}.png`} alt="User" data-ai-hint="user avatar" /><AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback></Avatar>}
                </div>
              ))}
              {isLoading && !isLoadingHistory && ( // Show AI thinking indicator only if not loading history and AI is processing
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
                if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isLoadingHistory && user) {
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
