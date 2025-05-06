
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, ListChecks, Calendar, CheckCircle, XCircle, BrainCircuit, Sparkles } from 'lucide-react'; // Added BrainCircuit, Sparkles
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Import Button
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProgress, QuizResult, QuizQuestion } from '@/types/user';
import { generateQuizReflection, type QuizReflectionInput, type QuizReflectionOutput } from '@/ai/flows/quiz-reflection-flow'; // Import the new flow
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Interface for storing reflection state per quiz
interface ReflectionState {
    isLoading: boolean;
    feedback: string | null;
    error: string | null;
}

export default function ReflectionPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reflectionStates, setReflectionStates] = useState<{ [quizId: string]: ReflectionState }>({});

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
                const dateA = typeof a.generatedDate === 'string' ? new Date(a.generatedDate) : (a.generatedDate as any)?.toDate();
                const dateB = typeof b.generatedDate === 'string' ? new Date(b.generatedDate) : (b.generatedDate as any)?.toDate();
                return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
            });
            setQuizHistory(sortedHistory);
            // Initialize reflection states
            const initialStates: { [quizId: string]: ReflectionState } = {};
            sortedHistory.forEach(quiz => {
                if (quiz.quizId) { // Ensure quizId exists
                    initialStates[quiz.quizId] = { isLoading: false, feedback: null, error: null };
                }
            });
            setReflectionStates(initialStates);
          } else {
            setQuizHistory([]);
            setReflectionStates({});
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
            } else if (typeof dateInput === 'object' && 'seconds' in dateInput) {
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
        const isCorrect = typeof userAnswer === 'string' && typeof question.correctAnswer === 'string'
            ? userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
            : userAnswer === question.correctAnswer;
        return isCorrect ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />;
    };

    // Function to handle generating reflection for a specific quiz
    const handleGenerateReflection = async (quiz: QuizResult) => {
        if (!quiz.quizId) {
            toast({ title: "Error", description: "Quiz ID missing, cannot generate reflection.", variant: "destructive"});
            return;
        }

        // Set loading state for this specific quiz
        setReflectionStates(prev => ({
            ...prev,
            [quiz.quizId!]: { isLoading: true, feedback: null, error: null }
        }));

        try {
            // Prepare input for the flow
            const input: QuizReflectionInput = {
                questions: quiz.questions,
                userAnswers: quiz.userAnswers,
                score: quiz.score,
                totalQuestions: quiz.totalQuestions,
                difficulty: quiz.difficulty,
            };

            // Call the Genkit flow
            const result: QuizReflectionOutput = await generateQuizReflection(input);

            // Update state with the feedback
            setReflectionStates(prev => ({
                ...prev,
                [quiz.quizId!]: { isLoading: false, feedback: result.feedback, error: null }
            }));

        } catch (error: any) {
            console.error("Error generating quiz reflection:", error);
            const errorMsg = error instanceof Error ? error.message : "Failed to generate reflection.";
            // Update state with the error
            setReflectionStates(prev => ({
                ...prev,
                [quiz.quizId!]: { isLoading: false, feedback: null, error: errorMsg }
            }));
            toast({ title: "Reflection Error", description: errorMsg, variant: "destructive"});
        }
    };


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
        Review your past quiz attempts, scores, answers, and get AI-powered feedback.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="text-secondary" /> Your Quiz Attempts</CardTitle>
          <CardDescription>Expand each entry to see detailed results and generate feedback.</CardDescription>
        </CardHeader>
        <CardContent>
          {quizHistory.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {quizHistory.map((quiz) => (
                <AccordionItem value={`quiz-${quiz.quizId}`} key={quiz.quizId} className="border rounded-md px-4 bg-background hover:bg-muted/30 transition-colors">
                  <AccordionTrigger className="py-4 text-left hover:no-underline">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
                      <div className="flex items-center gap-2 mb-2 sm:mb-0">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatQuizDate(quiz.generatedDate)}</span>
                         {quiz.sourceContent && (
                            <Badge variant="outline" className="ml-2 hidden lg:inline-flex text-xs">
                                Based on: "{quiz.sourceContent.substring(0, 30)}..."
                            </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                         {quiz.difficulty && <Badge variant="secondary" className="capitalize">{quiz.difficulty}</Badge>}
                         <Badge variant={quiz.score / quiz.totalQuestions >= 0.7 ? "default" : "destructive"} className="w-fit">
                            Score: {quiz.score} / {quiz.totalQuestions} ({Math.round((quiz.score / quiz.totalQuestions) * 100)}%)
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
                             <p className="font-medium">{qIndex + 1}. {q.question}</p>
                             {getQuestionStatusIcon(q, quiz.userAnswers[qIndex])}
                          </div>
                          <p className="mt-1">
                            <span className="text-muted-foreground">Your Answer:</span> {quiz.userAnswers[qIndex] || <span className="italic">Not Answered</span>}
                          </p>
                          {!(typeof quiz.userAnswers[qIndex] === 'string' && typeof q.correctAnswer === 'string'
                             ? quiz.userAnswers[qIndex]?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                             : quiz.userAnswers[qIndex] === q.correctAnswer) && (
                               <p className="mt-1 text-green-600 dark:text-green-400">
                                   Correct Answer: {q.correctAnswer}
                               </p>
                           )}
                           {q.type === 'multiple-choice' && q.answers && (
                               <div className="flex flex-wrap gap-1 mt-1">
                                {q.answers.map((ans, ansIdx) => (
                                    <Badge key={ansIdx} variant={ans === q.correctAnswer ? 'secondary' : 'outline'} className={cn("text-[10px] px-1.5 py-0", quiz.userAnswers[qIndex] === ans && ans !== q.correctAnswer && "bg-destructive/20 border-destructive text-destructive")}>
                                        {ans}
                                    </Badge>
                                ))}
                               </div>
                           )}
                        </div>
                      ))}
                    </div>

                     {/* AI Reflection Section */}
                     <div className="border-t pt-4 mt-4">
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary" /> AI Feedback</h4>
                        {reflectionStates[quiz.quizId!]?.isLoading ? (
                            <div className="flex items-center text-muted-foreground text-sm">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating feedback...
                            </div>
                        ) : reflectionStates[quiz.quizId!]?.error ? (
                            <p className="text-sm text-destructive">Error: {reflectionStates[quiz.quizId!]?.error}</p>
                        ) : reflectionStates[quiz.quizId!]?.feedback ? (
                            <p className="text-sm whitespace-pre-wrap bg-primary/5 p-3 rounded-md border border-primary/20">{reflectionStates[quiz.quizId!]?.feedback}</p>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGenerateReflection(quiz)}
                                disabled={reflectionStates[quiz.quizId!]?.isLoading}
                            >
                                <BrainCircuit className="mr-2 h-4 w-4" />
                                Generate Feedback
                            </Button>
                        )}
                     </div>

                  </AccordionContent>
                </AccordionItem>
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
