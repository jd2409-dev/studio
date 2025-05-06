
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, ListChecks, Calendar, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProgress, QuizResult, QuizQuestion } from '@/types/user';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ReflectionPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
            // Sort history from newest to oldest
            const sortedHistory = (data.quizHistory || []).sort((a, b) => {
                const dateA = typeof a.generatedDate === 'string' ? new Date(a.generatedDate) : (a.generatedDate as any)?.toDate();
                const dateB = typeof b.generatedDate === 'string' ? new Date(b.generatedDate) : (b.generatedDate as any)?.toDate();
                return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
            });
            setQuizHistory(sortedHistory);
          } else {
            console.log("No progress data found for reflection.");
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
      setIsLoading(false); // Stop loading if user is null after auth check
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
                // Handle Firestore Timestamp object
                date = new Date(dateInput.seconds * 1000);
            } else {
                return 'Invalid Date';
            }

            if (!isNaN(date.getTime())) {
                return format(date, 'PPP p'); // e.g., Jun 21, 2024 3:30 PM
            } else {
                return 'Invalid Date';
            }
        } catch (e) {
            console.error("Error formatting date:", e);
            return 'Invalid Date';
        }
    };

    const getQuestionStatusIcon = (question: QuizQuestion, userAnswer: string | undefined) => {
        const isCorrect = typeof userAnswer === 'string' && typeof question.correctAnswer === 'string'
            ? userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
            : userAnswer === question.correctAnswer;

        return isCorrect ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
            <XCircle className="h-4 w-4 text-destructive" />
        );
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
        Review your past quiz attempts, scores, and answers.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="text-secondary" /> Your Quiz Attempts</CardTitle>
          <CardDescription>Expand each entry to see detailed results.</CardDescription>
        </CardHeader>
        <CardContent>
          {quizHistory.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {quizHistory.map((quiz, index) => (
                <AccordionItem value={`quiz-${index}`} key={quiz.quizId || index} className="border rounded-md px-4 bg-background hover:bg-muted/30 transition-colors">
                  <AccordionTrigger className="py-4 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
                      <div className="flex items-center gap-2 mb-2 sm:mb-0">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatQuizDate(quiz.generatedDate)}</span>
                         {quiz.sourceContent && (
                            <Badge variant="outline" className="ml-2 hidden sm:inline-flex">
                                From: {quiz.sourceContent.substring(0, 30)}...
                            </Badge>
                        )}
                      </div>
                      <Badge variant={quiz.score / quiz.totalQuestions >= 0.7 ? "secondary" : "destructive"} className="w-fit">
                        Score: {quiz.score} / {quiz.totalQuestions} ({Math.round((quiz.score / quiz.totalQuestions) * 100)}%)
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-3">
                      {quiz.questions.map((q, qIndex) => (
                        <div key={qIndex} className="p-3 border rounded bg-muted/50">
                          <div className="flex justify-between items-start gap-2">
                             <p className="font-medium text-sm">{qIndex + 1}. {q.question}</p>
                             {getQuestionStatusIcon(q, quiz.userAnswers[qIndex])}
                          </div>
                          <p className="text-xs mt-1">
                            <span className="text-muted-foreground">Your Answer:</span> {quiz.userAnswers[qIndex] || <span className="italic">Not Answered</span>}
                          </p>
                          {/* Show correct answer only if user was wrong */}
                          {!(typeof quiz.userAnswers[qIndex] === 'string' && typeof q.correctAnswer === 'string'
                             ? quiz.userAnswers[qIndex]?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                             : quiz.userAnswers[qIndex] === q.correctAnswer) && (
                               <p className="text-xs mt-1 text-green-600 dark:text-green-400">
                                   Correct Answer: {q.correctAnswer}
                               </p>
                           )}
                           {q.type === 'multiple-choice' && q.answers && (
                               <div className="flex flex-wrap gap-2 mt-2">
                                {q.answers.map((ans, ansIdx) => (
                                    <Badge key={ansIdx} variant={ans === q.correctAnswer ? 'secondary' : 'outline'} className={cn(quiz.userAnswers[qIndex] === ans && ans !== q.correctAnswer && "bg-destructive/20 border-destructive text-destructive")}>
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
