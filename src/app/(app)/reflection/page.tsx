'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, ListChecks, Calendar, CheckCircle, XCircle, Sparkles, GraduationCap, AlertTriangle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
// Button might be used later for re-generating feedback if added back
// import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProgress, QuizResult, QuizQuestion } from '@/types/user';
// Import specific date-fns functions
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Added AlertTitle


export default function ReflectionPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Use this for page loading
  const [fetchError, setFetchError] = useState<string | null>(null); // Store fetch error

  // Fetch user progress data (specifically quiz history)
  useEffect(() => {
      // Start loading if auth is not finished or no user yet
      if (authLoading || !user) {
           setIsLoading(true);
           return; // Wait for auth
      }

      // Proceed with fetch if user exists
      const fetchData = async () => {
        // setIsLoading(true); // Already true or set above
        setFetchError(null); // Reset error on new fetch
        try {
          ensureFirebaseInitialized();
          const progressDocRef = doc(db!, 'userProgress', user.uid);
          const progressSnap = await getDoc(progressDocRef);

          if (progressSnap.exists()) {
            const data = progressSnap.data() as UserProgress;
                const history = data.quizHistory || [];
                // Sort history reliably, handling different date types
                const sortedHistory = history.sort((a, b) => {
                    const timeA = convertToTimestamp(a.generatedDate);
                    const timeB = convertToTimestamp(b.generatedDate);
                    return timeB - timeA; // Sort descending (newest first)
                });
                setQuizHistory(sortedHistory);
            } else {
                console.log("No progress data found for reflection.");
                setQuizHistory([]); // Set empty array if no data
            }
        } catch (error: any) {
            console.error("Error fetching reflection data:", error);
            let errorDesc = "Could not load quiz history.";
            if (error.code === 'permission-denied') {
                errorDesc = "Permission denied fetching reflection data. Check Firestore rules.";
                 console.error("Firestore permission denied. Check your security rules in firestore.rules and ensure they are deployed.");
            } else if (error.code === 'unavailable') {
                 errorDesc = "Network error fetching reflection data. Please check your connection.";
            }
            setFetchError(errorDesc);
            toast({ title: "Error", description: errorDesc, variant: "destructive" });
        } finally {
          setIsLoading(false); // Stop loading after fetch attempt
        }
      };
      fetchData();
  }, [user, authLoading, toast]); // Dependencies


   // Helper function to convert various date formats to a comparable timestamp
   const convertToTimestamp = (dateInput: Date | string | { seconds: number, nanoseconds: number } | undefined): number => {
       if (!dateInput) return 0; // Treat missing dates as oldest
       try {
           if (dateInput instanceof Date) return dateInput.getTime();
           if (typeof dateInput === 'string') {
               const parsed = parseISO(dateInput);
               return isValid(parsed) ? parsed.getTime() : 0;
           }
           if (typeof dateInput === 'object' && 'seconds' in dateInput) {
               return dateInput.seconds * 1000;
           }
           return 0; // Fallback for unexpected types
       } catch {
           return 0; // Fallback on parsing error
       }
   };


   const formatQuizDate = (dateInput: Date | string | { seconds: number, nanoseconds: number } | undefined) => {
        if (!dateInput) return 'Unknown Date';
        try {
            let date: Date | null = null;
            if (dateInput instanceof Date) {
                date = dateInput;
            } else if (typeof dateInput === 'string') {
                date = parseISO(dateInput); // Handles ISO strings directly
            } else if (typeof dateInput === 'object' && dateInput !== null && 'seconds' in dateInput) {
                date = new Date(dateInput.seconds * 1000); // Handles Firestore Timestamps
            }

            // Check if the resulting date is valid before formatting
            return date && isValid(date) ? format(date, 'PPP p') : 'Invalid Date';
        } catch (e) {
            console.error("Error formatting date:", dateInput, e);
            return 'Error Formatting Date';
        }
    };

    const getQuestionStatusIcon = (question: QuizQuestion, userAnswer: string | undefined) => {
        // Case-insensitive comparison for strings, strict comparison otherwise
         const correctAnswerStr = String(question.correctAnswer ?? '').trim().toLowerCase();
         const selectedAnswerStr = String(userAnswer ?? '').trim().toLowerCase();
         const isCorrect = selectedAnswerStr === correctAnswerStr;

        return isCorrect ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />;
    };

  // Consolidated Loading State
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading reflections...</p>
      </div>
    );
  }

  // Handle fetch error state
   if (fetchError) {
       return (
          <div className="container mx-auto py-8 text-center">
             <h1 className="text-3xl font-bold mb-6">Reflection: Quiz History</h1>
             <Alert variant="destructive" className="max-w-md mx-auto">
               <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Data</AlertTitle>
               <AlertDescription>{fetchError}</AlertDescription>
             </Alert>
          </div>
       );
   }

    // Handle no user state (should be redirected, but handle defensively)
    if (!user) {
        return (
            <div className="container mx-auto py-8 text-center">
                <h1 className="text-3xl font-bold mb-6">Reflection: Quiz History</h1>
                 <Alert variant="destructive" className="max-w-md mx-auto">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Authentication Required</AlertTitle>
                    <AlertDescription>Please log in to view your reflections.</AlertDescription>
                 </Alert>
            </div>
        );
    }


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Reflection: Quiz History</h1>
      <p className="text-muted-foreground mb-8">
        Review your past quiz attempts, scores, and answers to identify areas for improvement.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="text-secondary" /> Your Quiz Attempts</CardTitle>
          <CardDescription>Expand each entry to see detailed results.</CardDescription>
        </CardHeader>
        <CardContent>
          {quizHistory.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {quizHistory.map((quiz) => (
                 // Ensure quiz.quizId exists before rendering the item
                 quiz.quizId ? (
                    <AccordionItem value={`quiz-${quiz.quizId}`} key={quiz.quizId} className="border border-border rounded-md px-4 bg-card hover:bg-muted/50 transition-colors shadow-sm">
                    <AccordionTrigger className="py-4 text-left hover:no-underline group">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <div className="flex items-center gap-1.5 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{formatQuizDate(quiz.generatedDate)}</span>
                            </div>
                            {/* Badge section */}
                             <div className="flex items-center gap-1.5 flex-wrap">
                                {quiz.difficulty && <Badge variant="secondary" className="capitalize text-xs">{quiz.difficulty}</Badge>}
                                {quiz.grade && (
                                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                        <GraduationCap className="h-3 w-3"/> Grade {quiz.grade}
                                    </Badge>
                                )}
                                <Badge variant={quiz.score / quiz.totalQuestions >= 0.7 ? "default" : "destructive"} className="text-xs w-fit">
                                    Score: {quiz.score} / {quiz.totalQuestions} ({quiz.totalQuestions > 0 ? Math.round((quiz.score / quiz.totalQuestions) * 100) : 0}%)
                                </Badge>
                             </div>
                        </div>
                        {/* Removed chevron duplication, AccordionTrigger provides one */}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-4">
                        {/* Quiz Source Context */}
                         {quiz.sourceContent && (
                             <div className="text-xs text-muted-foreground border-t pt-2">
                                 Quiz based on: "{quiz.sourceContent}"
                             </div>
                         )}
                        {/* Quiz Questions Details */}
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 border rounded-md p-3 bg-muted/20">
                        <h4 className="font-semibold text-sm mb-2 sticky top-0 bg-muted/20 py-1">Questions & Answers:</h4>
                        {quiz.questions.map((q, qIndex) => (
                            <div key={qIndex} className="p-3 border-b border-border/50 last:border-b-0 text-xs space-y-1">
                            <div className="flex justify-between items-start gap-2">
                                <p className="font-medium flex-1">{qIndex + 1}. {q.question}</p>
                                {getQuestionStatusIcon(q, quiz.userAnswers[qIndex])}
                            </div>
                            <p>
                                <span className="text-muted-foreground">Your Answer:</span> {quiz.userAnswers[qIndex] !== undefined && quiz.userAnswers[qIndex] !== null && String(quiz.userAnswers[qIndex]).trim() !== '' ? String(quiz.userAnswers[qIndex]) : <span className="italic text-muted-foreground/80">Not Answered</span>}
                            </p>
                            {/* Check if the answer was incorrect before showing the correct one */}
                            {!(String(quiz.userAnswers[qIndex] ?? '').trim().toLowerCase() === String(q.correctAnswer ?? '').trim().toLowerCase()) && (
                                <p className="text-green-600 dark:text-green-400">
                                    Correct Answer: {q.correctAnswer}
                                </p>
                            )}
                            {/* Display options for multiple choice */}
                            {q.type === 'multiple-choice' && q.answers && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {q.answers.map((ans, ansIdx) => (
                                        <Badge
                                            key={ansIdx}
                                            variant={'outline'} // Use outline for all options initially
                                            className={cn(
                                                "text-[10px] px-1.5 py-0 font-normal",
                                                // Highlight correct answer green
                                                ans === q.correctAnswer && "border-green-500 text-green-700 dark:border-green-600 dark:text-green-400",
                                                // Highlight user's incorrect selection red
                                                quiz.userAnswers[qIndex] === ans && ans !== q.correctAnswer && "bg-destructive/10 border-destructive text-destructive dark:bg-destructive/20"
                                            )}
                                        >
                                            {ans}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            </div>
                        ))}
                        </div>
                    </AccordionContent>
                    </AccordionItem>
                ) : null // Skip rendering if quizId is missing (shouldn't happen with proper data)
              ))}
            </Accordion>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              You haven't attempted any quizzes yet. Go to the Quiz Generation page to create one!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
