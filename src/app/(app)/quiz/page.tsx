'use client';

import { useState, type FormEvent, useEffect } from 'react'; // Added useEffect
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { Loader2, Wand2, Check, X, AlertTriangle, BookCopy, HelpCircle } from 'lucide-react'; // Added BookCopy, HelpCircle
import { generateQuiz, type GenerateQuizInput, type GenerateQuizOutput } from '@/ai/flows/quiz-generation';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config'; // Import db and helper
import { doc, updateDoc, arrayUnion, Timestamp, runTransaction, getDoc } from 'firebase/firestore'; // Correct import for runTransaction and getDoc
import type { QuizResult, QuizQuestion, UserProgress } from '@/types/user'; // Import QuizResult type and UserProgress
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link'; // Import Link

type QuizState = {
    quizId: string; // Unique ID for this quiz instance
    questionIndex: number;
    selectedAnswers: (string | undefined)[];
    submitted: boolean;
    startTime: number; // Timestamp when quiz started
};

type DifficultyLevel = 'easy' | 'medium' | 'hard'; // Define difficulty type

// Ensure the page is dynamically rendered as it might rely on user-specific data implicitly
export const dynamic = 'force-dynamic';

export default function QuizGenerationPage() {
  const [textbookContent, setTextbookContent] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5); // Ensure state is number
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium'); // State for difficulty
  const [grade, setGrade] = useState<string>('none'); // State for grade level (use 'none' for default/empty)
  const [quizData, setQuizData] = useState<GenerateQuizOutput | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [isLoading, setIsLoading] = useState(false); // State for generation loading
  const [isSubmitting, setIsSubmitting] = useState(false); // State for submission process
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth(); // Get user and loading status

  // Reset quiz if user logs out while quiz is active
   useEffect(() => {
       if (!authLoading && !user && quizState) {
           setQuizData(null);
           setQuizState(null);
           setTextbookContent(''); // Optionally clear content
           toast({ title: "Session Ended", description: "You have been logged out. The active quiz was cancelled." });
       }
   }, [user, authLoading, quizState, toast]);


  const handleGenerateQuiz = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
        toast({
            title: "Authentication Required",
            description: "Please log in to generate a quiz.",
            variant: "destructive",
        });
        return;
    }
    if (!textbookContent.trim()) {
      toast({ title: "Input Required", description: "Please paste some textbook content first.", variant: "destructive" });
      return;
    }
    if (isNaN(questionCount) || questionCount < 1 || questionCount > 20) {
       toast({ title: "Invalid Input", description: "Please enter a valid number of questions between 1 and 20.", variant: "destructive" });
       return;
     }

    setIsLoading(true); // Start loading indicator
    setQuizData(null);
    setQuizState(null);

    try {
      const input: GenerateQuizInput = {
          textbookContent,
          questionCount,
          difficulty,
          // Pass grade only if it's selected (not 'none')
          grade: grade && grade !== 'none' ? grade : undefined,
      };
      console.log("Generating quiz with input:", input);
      const result = await generateQuiz(input);

      // Ensure questions array is valid
      const questionsWithPossibleSubject = result.quiz?.map(q => ({ ...q })) || [];

      if (!result.quiz || questionsWithPossibleSubject.length === 0) {
         console.error("Quiz generation returned no questions. Result:", result);
         throw new Error("Quiz generation failed: The AI model did not return any questions.");
      }

      console.log(`Quiz generated with ${questionsWithPossibleSubject.length} questions.`);
      setQuizData({ quiz: questionsWithPossibleSubject });
      setQuizState({
        quizId: `quiz-${Date.now()}-${user.uid.substring(0, 5)}`, // More robust ID
        questionIndex: 0,
        selectedAnswers: new Array(questionsWithPossibleSubject.length).fill(undefined),
        submitted: false,
        startTime: Date.now(),
      });
      toast({
        title: "Quiz Generated",
        description: `Quiz ready! Difficulty: ${difficulty}${grade && grade !== 'none' ? `, Grade: ${grade}` : ''}.`,
      });
    } catch (error: any) {
        console.error("Error generating quiz:", error.message, error.stack);
        let errorDesc = "Failed to generate quiz. Please try again.";
        if (error instanceof Error && error.message) {
           // Extract user-friendly message if possible
           if (error.message.startsWith("Quiz generation failed:") || error.message.startsWith("Invalid input")) {
                errorDesc = error.message;
           } else if (error.message.includes("blocked")) {
               errorDesc = "Quiz generation was blocked, possibly due to the content provided or safety filters.";
           } else {
                errorDesc = `An unexpected error occurred: ${error.message.substring(0, 100)}${error.message.length > 100 ? '...' : ''}`;
           }
        }
        toast({ title: "Error Generating Quiz", description: errorDesc, variant: "destructive" });
    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

 const handleAnswerChange = (answer: string) => {
     if (!quizState || quizState.submitted) return;
     const newSelectedAnswers = [...quizState.selectedAnswers];
     newSelectedAnswers[quizState.questionIndex] = answer;
     setQuizState({ ...quizState, selectedAnswers: newSelectedAnswers });
 };

 const handleShortAnswerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     if (!quizState || quizState.submitted) return;
     const newSelectedAnswers = [...quizState.selectedAnswers];
     newSelectedAnswers[quizState.questionIndex] = event.target.value;
     setQuizState({ ...quizState, selectedAnswers: newSelectedAnswers });
 };

  const handleNextQuestion = () => {
    if (!quizState || !quizData) return;
    if (quizState.questionIndex < quizData.quiz.length - 1) {
      setQuizState({ ...quizState, questionIndex: quizState.questionIndex + 1 });
    }
  };

  const handlePreviousQuestion = () => {
    if (!quizState) return;
    if (quizState.questionIndex > 0) {
      setQuizState({ ...quizState, questionIndex: quizState.questionIndex - 1 });
    }
  };

  const handleSubmitQuiz = async () => {
      if (!quizState || !quizData || !user || quizState.submitted) { // Prevent re-submission
          console.warn("Submit quiz aborted:", { quizState, quizData, userExists: !!user, submitted: quizState?.submitted });
          toast({ title: "Error", description: "Cannot submit quiz. User not logged in, quiz data missing, or already submitted.", variant: "destructive" });
          return;
      }
      const allAnswered = quizState.selectedAnswers.every(answer => answer !== undefined && String(answer).trim() !== '');
      if(!allAnswered && !window.confirm("You haven't answered all questions. Submit anyway?")) {
          return;
      }

      setIsSubmitting(true); // Start submitting indicator

      const finalScore = calculateScore();
      const quizResult: QuizResult = {
          quizId: quizState.quizId,
          generatedDate: Timestamp.now(), // Use Firestore Timestamp for server time
          sourceContent: textbookContent.substring(0, 500) + (textbookContent.length > 500 ? '...' : ''),
          questions: quizData.quiz,
          userAnswers: quizState.selectedAnswers,
          score: finalScore,
          totalQuestions: quizData.quiz.length,
          difficulty: difficulty, // Store the difficulty level
          grade: grade && grade !== 'none' ? grade : undefined, // Store the grade level if selected
      };

      try {
          ensureFirebaseInitialized(); // Ensure Firebase is initialized
          const progressDocRef = doc(db!, 'userProgress', user.uid);

          // Use Firestore transaction to handle potential race conditions or document creation
          await runTransaction(db!, async (transaction) => {
             console.log("Running Firestore transaction for quiz submission...");
             const progressSnap = await transaction.get(progressDocRef);

             if (progressSnap.exists()) {
                 console.log("UserProgress document exists. Updating quizHistory.");
                 // Document exists, update the array
                 const currentData = progressSnap.data() as UserProgress;
                 const updatedHistory = [...(currentData.quizHistory || []), quizResult];
                 transaction.update(progressDocRef, {
                     quizHistory: updatedHistory,
                     lastUpdated: Timestamp.now() // Update lastUpdated time
                 });
             } else {
                 console.log("UserProgress document does not exist. Creating with quizHistory.");
                 // Document doesn't exist, create it with the quizHistory array and default fields
                  const defaultProgress: UserProgress = {
                       uid: user.uid,
                       subjectMastery: [],
                       upcomingHomework: [],
                       upcomingExams: [],
                       studyRecommendations: [],
                       quizHistory: [quizResult], // Initialize with the current result
                       studyPlanner: [],
                       lastUpdated: Timestamp.now(),
                  };
                 transaction.set(progressDocRef, defaultProgress);
             }
             console.log("Firestore transaction committed successfully.");
          });

          // Update client state *after* successful Firestore operation
          setQuizState(prev => prev ? { ...prev, submitted: true } : null); // Ensure prev exists before spreading
          toast({ title: "Quiz Submitted", description: `Your score: ${finalScore} / ${quizData.quiz.length}. Results saved to Reflection.` });

      } catch (error: any) {
          console.error("Error saving quiz result:", error);
          let errorDesc = "Could not save quiz results. Please try again.";
            if (error.code === 'permission-denied') {
                errorDesc = "Permission denied saving quiz results. Check Firestore rules.";
                 console.error("Firestore permission denied. Check your security rules in firestore.rules and ensure they are deployed.");
            } else if (error.code === 'unavailable') {
                 errorDesc = "Network error. Could not save quiz results. Please check your connection.";
            } else if (error.message?.includes('transaction')) {
                 errorDesc = `Database transaction failed: ${error.message}. Please try again.`;
            } else if (error instanceof Error) {
                 errorDesc = error.message;
            }
          toast({ title: "Submission Error", description: errorDesc, variant: "destructive" });
          // Don't revert client state, let user see their score but know it wasn't saved.
      } finally {
          setIsSubmitting(false); // Stop submitting indicator
      }
  };


  const calculateScore = () => {
    if (!quizData || !quizState) return 0;
    return quizState.selectedAnswers.reduce((score, selectedAnswer, index) => {
        const question = quizData.quiz[index];
         // Handle cases where correctAnswer might not be a string (though schema says it is)
         // Perform case-insensitive comparison for strings
         const correctAnswerStr = String(question.correctAnswer ?? '').trim().toLowerCase();
         const selectedAnswerStr = String(selectedAnswer ?? '').trim().toLowerCase();
        const isCorrect = selectedAnswerStr === correctAnswerStr;
        return score + (isCorrect ? 1 : 0);
    }, 0);
  };

  const handleQuestionCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       const value = e.target.value;
       // Allow empty string temporarily, handle validation on submit/generate
       if (value === '') {
           setQuestionCount(0); // Represent empty state, maybe show placeholder differently
       } else {
           const num = parseInt(value, 10);
           // Allow numbers within range, prevent invalid input
           if (!isNaN(num)) {
                setQuestionCount(Math.max(1, Math.min(20, num)));
           } else {
               // If input becomes non-numeric, maybe revert or keep last valid number
               setQuestionCount(1); // Or keep previous valid state if preferred
           }
       }
  };


  const currentQuestion = quizData?.quiz[quizState?.questionIndex ?? 0];
  const score = quizState?.submitted ? calculateScore() : null;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
         <HelpCircle className="text-primary h-7 w-7"/> AI Quiz Generation
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Paste content from your textbook, select the desired difficulty and number of questions, and let the AI generate a quiz for you. Your results are saved for later reflection.
      </p>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Generation Section */}
        <Card className="shadow-lg rounded-lg sticky top-8">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><BookCopy className="h-5 w-5 text-primary"/> Generate Quiz</CardTitle>
            <CardDescription>Input content and configure quiz settings.</CardDescription>
          </CardHeader>
          <form onSubmit={handleGenerateQuiz}>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="textbook-content" className="font-semibold">Textbook Content</Label>
                <Textarea
                  id="textbook-content"
                  placeholder="Paste your textbook chapter or section here (at least 50 characters)..."
                  value={textbookContent}
                  onChange={(e) => setTextbookContent(e.target.value)}
                  rows={10}
                  disabled={isLoading || !!quizState || authLoading || !user} // Disable if loading, quiz active, or not logged in
                  required
                  className="mt-1 shadow-sm"
                  minLength={50} // Basic validation hint
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                 <div className="space-y-1">
                   <Label htmlFor="question-count" className="text-sm font-medium">Questions</Label>
                   <Input
                     id="question-count"
                     type="number"
                     min="1"
                     max="20"
                     value={questionCount > 0 ? String(questionCount) : ''}
                     onChange={handleQuestionCountChange}
                     placeholder="1-20"
                     disabled={isLoading || !!quizState || authLoading || !user}
                     required
                     className="mt-1 w-full shadow-sm h-10" // Ensure consistent height
                   />
                 </div>
                 <div className="space-y-1">
                   <Label htmlFor="difficulty" className="text-sm font-medium">Difficulty</Label>
                    <Select
                        value={difficulty}
                        onValueChange={(value) => setDifficulty(value as DifficultyLevel)}
                        disabled={isLoading || !!quizState || authLoading || !user}
                    >
                        <SelectTrigger id="difficulty" className="mt-1 w-full shadow-sm h-10">
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-1">
                    <Label htmlFor="grade-level" className="text-sm font-medium">Grade Level</Label>
                    <Select
                        value={grade} // Use 'none' for default/empty selection
                        onValueChange={setGrade}
                        disabled={isLoading || !!quizState || authLoading || !user}
                    >
                        <SelectTrigger id="grade-level" className="mt-1 w-full shadow-sm h-10">
                            <SelectValue placeholder="Optional..." />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="none">Any Grade</SelectItem>
                            {[...Array(12)].map((_, i) => (
                                <SelectItem key={i + 1} value={`${i + 1}`}>Grade {i + 1}</SelectItem>
                            ))}
                             <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
              </div>
               {!user && !authLoading && (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Login Required</AlertTitle>
                    <AlertDescription>
                       Please log in to generate quizzes.
                   </AlertDescription>
                 </Alert>
               )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || !!quizState || authLoading || !user || !textbookContent.trim() || textbookContent.length < 50 || questionCount < 1} className="w-full sm:w-auto">
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                ) : !!quizState ? (
                     'Quiz in Progress' // Button disabled, indicates a quiz is ongoing
                ) : (
                  <><Wand2 className="mr-2 h-4 w-4" /> Generate Quiz</>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Quiz Section */}
        <Card className="shadow-lg rounded-lg min-h-[400px]">
          <CardHeader>
            <CardTitle className="text-xl">Interactive Quiz</CardTitle>
             {quizState?.submitted && score !== null && quizData && (
               <CardDescription>
                 Quiz Finished! Your Score: <span className="font-bold text-primary">{score} / {quizData.quiz.length}</span>
                 . View details in <Link href="/reflection" className="underline hover:text-primary">Reflection</Link>.
               </CardDescription>
             )}
             {!quizState?.submitted && quizData && quizState && (
                <CardDescription>Question {quizState.questionIndex + 1} of {quizData.quiz.length}.</CardDescription>
             )}
              {!quizData && !isLoading && (
                 <CardDescription>Generate a quiz to start.</CardDescription>
              )}
              {isLoading && !quizData && (
                  <CardDescription>Generating quiz, please wait...</CardDescription>
              )}
          </CardHeader>
          <CardContent className="min-h-[300px] flex flex-col">
            {isLoading && !quizData && ( // Show loader only during initial generation
              <div className="flex items-center justify-center h-full flex-1">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {quizData && quizState && currentQuestion ? (
              <div className="space-y-6 flex-1 flex flex-col">
                 {/* Question Text */}
                <p className="font-semibold text-base md:text-lg">{quizState.questionIndex + 1}. {currentQuestion.question}</p>

                 {/* Answer Area */}
                <div className="flex-1 space-y-3">
                  {currentQuestion.type === 'multiple-choice' && currentQuestion.answers && (
                    <RadioGroup
                      value={quizState.selectedAnswers[quizState.questionIndex] || ''} // Ensure value is string
                      onValueChange={handleAnswerChange}
                      disabled={quizState.submitted || isSubmitting}
                      className="space-y-2" // Add spacing between radio items
                    >
                      {currentQuestion.answers.map((answer, idx) => (
                        <div key={idx} className={cn(
                            "flex items-center space-x-3 p-3 rounded-md border border-input transition-colors bg-background", // Base styles
                            !quizState.submitted && "cursor-pointer hover:bg-muted/50", // Hover effect when not submitted
                            quizState.submitted && String(answer).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase() && "bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-700", // Correct answer style
                            quizState.submitted && quizState.selectedAnswers[quizState.questionIndex] === answer && String(answer).trim().toLowerCase() !== String(currentQuestion.correctAnswer).trim().toLowerCase() && "bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-700" // Incorrect user selection style
                        )}>
                          <RadioGroupItem value={answer} id={`q${quizState.questionIndex}-a${idx}`} className="border-muted-foreground data-[state=checked]:border-primary" />
                          <Label htmlFor={`q${quizState.questionIndex}-a${idx}`} className={cn("flex-1 text-sm", !quizState.submitted && "cursor-pointer")}>{answer}</Label>
                           {quizState.submitted && String(answer).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase() && <Check className="h-5 w-5 text-green-600 dark:text-green-400 ml-auto flex-shrink-0" />}
                           {quizState.submitted && quizState.selectedAnswers[quizState.questionIndex] === answer && String(answer).trim().toLowerCase() !== String(currentQuestion.correctAnswer).trim().toLowerCase() && <X className="h-5 w-5 text-red-600 dark:text-red-400 ml-auto flex-shrink-0" />}
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  {currentQuestion.type === 'true/false' && (
                     <RadioGroup
                        value={quizState.selectedAnswers[quizState.questionIndex] || ''} // Ensure value is string
                        onValueChange={handleAnswerChange}
                        disabled={quizState.submitted || isSubmitting}
                        className="space-y-2"
                      >
                       {['True', 'False'].map((answer, idx) => (
                           <div key={idx} className={cn(
                               "flex items-center space-x-3 p-3 rounded-md border border-input transition-colors bg-background",
                               !quizState.submitted && "cursor-pointer hover:bg-muted/50",
                               quizState.submitted && String(answer).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase() && "bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-700",
                               quizState.submitted && quizState.selectedAnswers[quizState.questionIndex] === answer && String(answer).trim().toLowerCase() !== String(currentQuestion.correctAnswer).trim().toLowerCase() && "bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-700"
                           )}>
                             <RadioGroupItem value={answer} id={`q${quizState.questionIndex}-a${idx}`} className="border-muted-foreground data-[state=checked]:border-primary"/>
                             <Label htmlFor={`q${quizState.questionIndex}-a${idx}`} className={cn("flex-1 text-sm", !quizState.submitted && "cursor-pointer")}>{answer}</Label>
                              {quizState.submitted && String(answer).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase() && <Check className="h-5 w-5 text-green-600 dark:text-green-400 ml-auto flex-shrink-0" />}
                           {quizState.submitted && quizState.selectedAnswers[quizState.questionIndex] === answer && String(answer).trim().toLowerCase() !== String(currentQuestion.correctAnswer).trim().toLowerCase() && <X className="h-5 w-5 text-red-600 dark:text-red-400 ml-auto flex-shrink-0" />}
                           </div>
                       ))}
                     </RadioGroup>
                  )}
                  {(currentQuestion.type === 'fill-in-the-blanks' || currentQuestion.type === 'short-answer') && (
                      <div className="space-y-2">
                         <Input
                           type="text"
                           placeholder="Your answer here..."
                           value={quizState.selectedAnswers[quizState.questionIndex] || ''}
                           onChange={handleShortAnswerChange}
                           disabled={quizState.submitted || isSubmitting}
                           className={cn("shadow-sm h-10", // Consistent height
                               quizState.submitted && (String(quizState.selectedAnswers[quizState.questionIndex] ?? '').trim().toLowerCase() === String(currentQuestion.correctAnswer ?? '').trim().toLowerCase() ? "border-green-500 focus-visible:ring-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20" : "border-red-500 focus-visible:ring-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/20")
                           )}
                           aria-label={`Answer for question ${quizState.questionIndex + 1}`}
                         />
                         {quizState.submitted && (
                             <p className={cn(
                                 "text-sm mt-1",
                                 String(quizState.selectedAnswers[quizState.questionIndex] ?? '').trim().toLowerCase() === String(currentQuestion.correctAnswer ?? '').trim().toLowerCase() ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                             )}>
                                 {String(quizState.selectedAnswers[quizState.questionIndex] ?? '').trim().toLowerCase() === String(currentQuestion.correctAnswer ?? '').trim().toLowerCase() ? <Check className="inline h-4 w-4 mr-1" /> : <X className="inline h-4 w-4 mr-1" />}
                                 Correct Answer: {currentQuestion.correctAnswer}
                             </p>
                         )}
                      </div>
                  )}
                </div>

                 {/* Navigation Buttons */}
                 {!quizState.submitted && (
                     <div className="flex justify-between items-center pt-4 border-t mt-6 flex-shrink-0">
                       <Button
                         variant="outline"
                         onClick={handlePreviousQuestion}
                         disabled={quizState.questionIndex === 0 || isSubmitting}
                         size="sm"
                       >
                         Previous
                       </Button>
                       {quizState.questionIndex === quizData.quiz.length - 1 ? (
                          <Button
                            onClick={handleSubmitQuiz}
                            disabled={isSubmitting || !quizState.selectedAnswers[quizState.questionIndex]} // Also disable if current question not answered
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                             {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                          </Button>
                        ) : (
                          <Button onClick={handleNextQuestion} disabled={isSubmitting || !quizState.selectedAnswers[quizState.questionIndex]} size="sm">Next</Button> // Disable if not answered
                        )}
                     </div>
                 )}
              </div>
            ) : (
              !isLoading && !authLoading && <p className="text-muted-foreground text-center py-20">Generate a quiz using the panel on the left to begin.</p>
            )}
             {/* Show loader if auth is still loading, even if not generating */}
            {authLoading && !isLoading && (
                 <div className="flex items-center justify-center h-full flex-1">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                     <p className="ml-2 text-muted-foreground">Checking authentication...</p>
                 </div>
            )}
          </CardContent>
           {quizData && (
               <CardFooter className="pt-6 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setQuizData(null);
                        setQuizState(null);
                        setTextbookContent(''); // Optionally reset content
                        setQuestionCount(5);
                        setDifficulty('medium');
                        setGrade('none');
                    }}
                    disabled={isLoading || isSubmitting}
                    className="w-full sm:w-auto"
                    >
                      {quizState?.submitted ? 'Start New Quiz' : 'Cancel & Start Over'}
                  </Button>
               </CardFooter>
           )}
        </Card>
      </div>
    </div>
  );
}
