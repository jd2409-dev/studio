
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, ListChecks, Calendar, CheckCircle, XCircle, Sparkles, GraduationCap } from 'lucide-react'; // Removed BrainCircuit
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Keep Button for potential future use, but remove specific feedback button usage
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProgress, QuizResult, QuizQuestion } from '@/types/user';
// Removed import for generateQuizReflection flow
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Removed ReflectionState interface and related state

export default function ReflectionPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Removed reflectionStates state

  // Fetch user progress data (specifically quiz history)
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setIsLoading(true);
        ensureFirebaseInitialized();
        const progressDocRef = doc(db!, 'userProgress', user.uid);
        try {
          const progressSnap = await getDoc(progressDocRef);
          if (progressSnap.exists()) {
            const data = progressSnap.data() as UserProgress;
            const sortedHistory = (data.quizHistory || []).sort((a, b) => {
                // Handle potential Date/Timestamp/string variations
                const dateA = a.generatedDate ? (typeof a.generatedDate === 'string' ? new Date(a.generatedDate) : (a.generatedDate as any)?.toDate ? (a.generatedDate as any).toDate() : a.generatedDate) : new Date(0);
                const dateB = b.generatedDate ? (typeof b.generatedDate === 'string' ? new Date(b.generatedDate) : (b.generatedDate as any)?.toDate ? (b.generatedDate as any).toDate() : b.generatedDate) : new Date(0);
                // Ensure we have valid Date objects for comparison
                const timeA = dateA instanceof Date ? dateA.getTime() : 0;
                const timeB = dateB instanceof Date ? dateB.getTime() : 0;
                return timeB - timeA; // Sort descending (newest first)
            });
            setQuizHistory(sortedHistory);
            // Removed initialization of reflection states
          } else {
            setQuizHistory([]);
          }
        } catch (error: any) {
          console.error("Error fetching reflection data:", error);
           let errorDesc = "Could not load quiz history.";
           if (error.code === 'permission-denied') {
                errorDesc = "Permission denied. Check Firestore rules.";
           }
          toast({ title: "Error", description: errorDesc, variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [user, authLoading, toast]);

   const formatQuizDate = (dateInput: Date | string | { seconds: number, nanoseconds: number } | undefined) => {
        if (!dateInput) return 'Unknown Date';
        try {
            let date: Date;
            if (typeof dateInput === 'string') {
                date = new Date(dateInput);
            } else if (dateInput instanceof Date) {
                date = dateInput;
            } else if (typeof dateInput === 'object' && dateInput !== null && 'seconds' in dateInput) {
                date = new Date(dateInput.seconds * 1000);
            } else {
                return 'Invalid Date';
            }
            return !isNaN(date.getTime()) ? format(date, 'PPP p') : 'Invalid Date';
        } catch (e) {
            console.error("Error formatting date:", e);
            return 'Invalid Date';
        }
    };

    const getQuestionStatusIcon = (question: QuizQuestion, userAnswer: string | undefined) => {
        // Case-insensitive comparison for strings, direct comparison otherwise
         const isCorrect = typeof userAnswer === 'string' && typeof question.correctAnswer === 'string'
            ? userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
            : userAnswer === question.correctAnswer; // Fallback for non-string or undefined

        // More robust check for correctness if types might be inconsistent
        // const correctAnswerStr = String(question.correctAnswer ?? '').trim().toLowerCase();
        // const userAnswerStr = String(userAnswer ?? '').trim().toLowerCase();
        // const isCorrect = correctAnswerStr === userAnswerStr;

        return isCorrect ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />;
    };

    // Removed handleGenerateReflection function

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Reflection: Quiz History</h1>
      <p className="text-muted-foreground mb-8">
        Review your past quiz attempts, scores, and answers. {/* Removed mention of feedback */}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="text-secondary" /> Your Quiz Attempts</CardTitle>
          <CardDescription>Expand each entry to see detailed results.</CardDescription> {/* Adjusted description */}
        </CardHeader>
        <CardContent>
          {quizHistory.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {quizHistory.map((quiz) => (
                 // Ensure quiz.quizId exists before rendering the item
                 quiz.quizId ? (
                    <AccordionItem value={`quiz-${quiz.quizId}`} key={quiz.quizId} className="border rounded-md px-4 bg-background hover:bg-muted/30 transition-colors">
                    <AccordionTrigger className="py-4 text-left hover:no-underline">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{formatQuizDate(quiz.generatedDate)}</span>
                            </div>
                            {quiz.sourceContent && (
                                <Badge variant="outline" className="hidden md:inline-flex text-xs">
                                    Based on: "{quiz.sourceContent.substring(0, 30)}..."
                                </Badge>
                            )}
                            {quiz.grade && (
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                    <GraduationCap className="h-3 w-3"/> Grade {quiz.grade}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {quiz.difficulty && <Badge variant="secondary" className="capitalize">{quiz.difficulty}</Badge>}
                            <Badge variant={quiz.score / quiz.totalQuestions >= 0.7 ? "default" : "destructive"} className="w-fit">
                                Score: {quiz.score} / {quiz.totalQuestions} ({quiz.totalQuestions > 0 ? Math.round((quiz.score / quiz.totalQuestions) * 100) : 0}%)
                            </Badge>
                        </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-4">
                        {/* Quiz Questions Details */}
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        <h4 className="font-semibold text-sm mb-2">Questions & Answers:</h4>
                        {quiz.questions.map((q, qIndex) => (
                            <div key={qIndex} className="p-3 border rounded bg-muted/50 text-xs">
                            <div className="flex justify-between items-start gap-2">
                                <p className="font-medium flex-1">{qIndex + 1}. {q.question}</p>
                                {getQuestionStatusIcon(q, quiz.userAnswers[qIndex])}
                            </div>
                            <p className="mt-1">
                                <span className="text-muted-foreground">Your Answer:</span> {quiz.userAnswers[qIndex] !== undefined && quiz.userAnswers[qIndex] !== null && quiz.userAnswers[qIndex] !== '' ? quiz.userAnswers[qIndex] : <span className="italic">Not Answered</span>}
                            </p>
                            {/* Check if the answer was incorrect before showing the correct one */}
                            {!(typeof quiz.userAnswers[qIndex] === 'string' && typeof q.correctAnswer === 'string'
                                ? quiz.userAnswers[qIndex]?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                                : quiz.userAnswers[qIndex] === q.correctAnswer
                            ) && (
                                <p className="mt-1 text-green-600 dark:text-green-400">
                                    Correct Answer: {q.correctAnswer}
                                </p>
                            )}
                            {/* Display options for multiple choice */}
                            {q.type === 'multiple-choice' && q.answers && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {q.answers.map((ans, ansIdx) => (
                                        <Badge
                                            key={ansIdx}
                                            variant={ans === q.correctAnswer ? 'secondary' : 'outline'}
                                            className={cn(
                                                "text-[10px] px-1.5 py-0",
                                                // Highlight the user's incorrect selection red
                                                quiz.userAnswers[qIndex] === ans && ans !== q.correctAnswer && "bg-destructive/20 border-destructive text-destructive"
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

                        {/* Removed AI Reflection Section */}

                    </AccordionContent>
                    </AccordionItem>
                ) : null // Skip rendering if quizId is missing
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
