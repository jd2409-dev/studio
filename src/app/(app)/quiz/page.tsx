
'use client';

import { useState, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { Loader2, Wand2, Check, X } from 'lucide-react';
import { generateQuiz, type GenerateQuizInput, type GenerateQuizOutput } from '@/ai/flows/quiz-generation';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config'; // Import db and helper
import { doc, updateDoc, arrayUnion, Timestamp, setDoc, getDoc } from 'firebase/firestore'; // Import Firestore functions including setDoc and getDoc
import type { QuizResult, QuizQuestion } from '@/types/user'; // Import QuizResult type
import { cn } from '@/lib/utils';

type QuizState = {
    quizId: string; // Unique ID for this quiz instance
    questionIndex: number;
    selectedAnswers: (string | undefined)[];
    submitted: boolean;
    startTime: number; // Timestamp when quiz started
};

type DifficultyLevel = 'easy' | 'medium' | 'hard'; // Define difficulty type

export default function QuizGenerationPage() {
  const [textbookContent, setTextbookContent] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5); // Ensure state is number
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium'); // State for difficulty
  const [grade, setGrade] = useState<string>(''); // State for grade level (use '' or 'none')
  const [quizData, setQuizData] = useState<GenerateQuizOutput | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // State for submission process
  const { toast } = useToast();
  const { user } = useAuth(); // Get user

  const handleGenerateQuiz = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!textbookContent.trim()) {
      toast({
        title: "Error",
        description: "Please paste some textbook content first.",
        variant: "destructive",
      });
      return;
    }
    if (isNaN(questionCount) || questionCount < 1 || questionCount > 20) {
       toast({
         title: "Invalid Input",
         description: "Please enter a valid number of questions between 1 and 20.",
         variant: "destructive",
       });
       return;
     }

    setIsLoading(true);
    setQuizData(null);
    setQuizState(null);

    try {
      const input: GenerateQuizInput = {
          textbookContent,
          questionCount,
          difficulty,
          // Pass grade only if it's selected (not empty or 'none')
          grade: grade && grade !== 'none' ? grade : undefined,
      };
      const result = await generateQuiz(input);

      // Ensure questions array is valid
      const questionsWithPossibleSubject = result.quiz?.map(q => ({ ...q })) || [];

      if (!result.quiz || questionsWithPossibleSubject.length === 0) {
         throw new Error("Quiz generation returned no questions.");
      }


      setQuizData({ quiz: questionsWithPossibleSubject });
      setQuizState({
        quizId: `quiz-${Date.now()}-${user?.uid || 'anon'}`,
        questionIndex: 0,
        selectedAnswers: new Array(questionsWithPossibleSubject.length).fill(undefined),
        submitted: false,
        startTime: Date.now(),
      });
      toast({
        title: "Success",
        description: `Quiz generated successfully (Difficulty: ${difficulty}${grade && grade !== 'none' ? `, Grade: ${grade}` : ''})!`,
      });
    } catch (error) {
      console.error("Error generating quiz:", error);
       let errorDesc = "Failed to generate quiz. Please try again.";
       if (error instanceof Error && error.message) {
           errorDesc = error.message;
       }
      toast({
        title: "Error Generating Quiz",
        description: errorDesc,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
          toast({ title: "Error", description: "Cannot submit quiz. User not logged in, quiz data missing, or already submitted.", variant: "destructive" });
          return;
      }
      const allAnswered = quizState.selectedAnswers.every(answer => answer !== undefined && answer.trim() !== '');
      if(!allAnswered && !window.confirm("You haven't answered all questions. Submit anyway?")) {
          return;
      }

      setIsSubmitting(true);

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

          // Transactionally check existence and update/set
          await db!.runTransaction(async (transaction) => {
             const progressSnap = await transaction.get(progressDocRef);
             if (progressSnap.exists()) {
                 // Document exists, update the array
                 transaction.update(progressDocRef, {
                     quizHistory: arrayUnion(quizResult),
                     lastUpdated: Timestamp.now() // Update lastUpdated time
                 });
             } else {
                 // Document doesn't exist, create it with the quizHistory array
                 transaction.set(progressDocRef, {
                     uid: user.uid, // Make sure to include uid
                     quizHistory: [quizResult],
                     // Initialize other fields with defaults to avoid partial data
                     subjectMastery: [],
                     upcomingHomework: [],
                     upcomingExams: [],
                     studyRecommendations: [],
                     studyPlanner: [],
                     lastUpdated: Timestamp.now(),
                 });
             }
          });

          // Update client state *after* successful Firestore operation
          setQuizState({ ...quizState, submitted: true });
          toast({ title: "Quiz Submitted", description: `Your score: ${finalScore} / ${quizData.quiz.length}. Results saved to Reflection.` });

      } catch (error: any) {
          console.error("Error saving quiz result:", error);
          let errorDesc = "Could not save quiz results.";
            if (error.code === 'permission-denied') {
                errorDesc = "Permission denied. Check Firestore rules. You might need to deploy `firestore.rules`.";
            } else if (error.code === 'unavailable') {
                 errorDesc = "Network error. Could not save quiz results. Please check your connection.";
            } else if (error instanceof Error && error.message) {
                 errorDesc = error.message;
            }
          toast({ title: "Submission Error", description: errorDesc, variant: "destructive" });
          // Optional: Revert client state or allow retry? For now, keep submitting state false
          // setQuizState({ ...quizState, submitted: false }); // Or handle retry differently
      } finally {
          setIsSubmitting(false);
      }
  };


  const calculateScore = () => {
    if (!quizData || !quizState) return 0;
    return quizState.selectedAnswers.reduce((score, selectedAnswer, index) => {
        const question = quizData.quiz[index];
         // Handle cases where correctAnswer might not be a string (though schema says it is)
         const correctAnswerStr = String(question.correctAnswer ?? '').trim().toLowerCase();
         const selectedAnswerStr = String(selectedAnswer ?? '').trim().toLowerCase();
        const isCorrect = selectedAnswerStr === correctAnswerStr;
        return score + (isCorrect ? 1 : 0);
    }, 0);
  };

  const handleQuestionCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       const value = e.target.value;
       // Allow empty string, otherwise parse and validate
       if (value === '') {
           setQuestionCount(0); // Or handle as you prefer, maybe keep previous valid value?
       } else {
           const num = parseInt(value, 10);
           if (!isNaN(num)) {
                if (num < 1) setQuestionCount(1);
                else if (num > 20) setQuestionCount(20);
                else setQuestionCount(num);
           }
       }
  };


  const currentQuestion = quizData?.quiz[quizState?.questionIndex ?? 0];
  const score = quizState?.submitted ? calculateScore() : null;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">AI Quiz Generation</h1>
      <p className="text-muted-foreground mb-8">
        Paste content, choose settings, and generate a quiz. Results are saved for reflection.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Generation Section */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Quiz</CardTitle>
            <CardDescription>Input content and settings.</CardDescription>
          </CardHeader>
          <form onSubmit={handleGenerateQuiz}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="textbook-content">Textbook Content</Label>
                <Textarea
                  id="textbook-content"
                  placeholder="Paste your textbook chapter or section here..."
                  value={textbookContent}
                  onChange={(e) => setTextbookContent(e.target.value)}
                  rows={10}
                  disabled={isLoading || !!quizState}
                  required
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="sm:col-span-1">
                   <Label htmlFor="question-count">Number of Questions (1-20)</Label>
                   <Input
                     id="question-count"
                     type="number"
                     min="1"
                     max="20"
                     // Use string conversion and handle potential NaN/0 state from empty input
                     value={questionCount > 0 ? String(questionCount) : ''}
                     onChange={handleQuestionCountChange}
                     placeholder="e.g., 5"
                     disabled={isLoading || !!quizState}
                     required
                     className="mt-1 w-full"
                   />
                 </div>
                 <div className="sm:col-span-1">
                   <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                        value={difficulty}
                        onValueChange={(value) => setDifficulty(value as DifficultyLevel)}
                        disabled={isLoading || !!quizState}
                    >
                        <SelectTrigger id="difficulty" className="mt-1 w-full">
                            <SelectValue placeholder="Select difficulty..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="sm:col-span-1">
                    <Label htmlFor="grade-level">Grade Level (Optional)</Label>
                    <Select
                        value={grade || 'none'} // Use 'none' for empty selection
                        onValueChange={setGrade}
                        disabled={isLoading || !!quizState}
                    >
                        <SelectTrigger id="grade-level" className="mt-1 w-full">
                            <SelectValue placeholder="Select grade..." />
                        </SelectTrigger>
                        <SelectContent>
                             {/* Change value from "" to "none" */}
                             <SelectItem value="none">Any Grade</SelectItem>
                            {[...Array(12)].map((_, i) => (
                                <SelectItem key={i + 1} value={`${i + 1}`}>Grade {i + 1}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || !!quizState}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                ) : !!quizState ? (
                     'Quiz Active' // Button disabled, indicates a quiz is ongoing
                ) : (
                  <><Wand2 className="mr-2 h-4 w-4" /> Generate Quiz</>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Quiz Section */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Quiz</CardTitle>
             {quizState?.submitted && score !== null && quizData && (
               <CardDescription>
                 Quiz Finished! Your Score: <span className="font-bold text-primary">{score} / {quizData.quiz.length}</span>
               </CardDescription>
             )}
             {!quizState?.submitted && quizData && quizState && (
                <CardDescription>Answer the questions below. Question {quizState.questionIndex + 1} of {quizData.quiz.length}.</CardDescription>
             )}
              {!quizData && !isLoading && (
                 <CardDescription>Generate a quiz to start.</CardDescription>
              )}
              {isLoading && (
                  <CardDescription>Generating quiz...</CardDescription>
              )}
          </CardHeader>
          <CardContent className="min-h-[300px] flex flex-col justify-between">
            {isLoading && !quizData && ( // Show loader only during initial generation
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {quizData && quizState && currentQuestion ? (
              <div className="space-y-6">
                <p className="font-semibold">{quizState.questionIndex + 1}. {currentQuestion.question}</p>
                <div>
                  {currentQuestion.type === 'multiple-choice' && currentQuestion.answers && (
                    <RadioGroup
                      value={quizState.selectedAnswers[quizState.questionIndex] || ''} // Ensure value is string
                      onValueChange={handleAnswerChange}
                      disabled={quizState.submitted || isSubmitting}
                    >
                      {currentQuestion.answers.map((answer, idx) => (
                        <div key={idx} className={cn(
                            "flex items-center space-x-2 p-2 rounded-md border border-border transition-colors", // Use border-border for default
                            quizState.submitted && String(answer).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase() && "bg-green-100 border-green-300 dark:bg-green-900/50 dark:border-green-700",
                            quizState.submitted && quizState.selectedAnswers[quizState.questionIndex] === answer && String(answer).trim().toLowerCase() !== String(currentQuestion.correctAnswer).trim().toLowerCase() && "bg-red-100 border-red-300 dark:bg-red-900/50 dark:border-red-700"
                        )}>
                          <RadioGroupItem value={answer} id={`q${quizState.questionIndex}-a${idx}`} />
                          <Label htmlFor={`q${quizState.questionIndex}-a${idx}`} className="cursor-pointer flex-1">{answer}</Label>
                           {quizState.submitted && String(answer).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase() && <Check className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto flex-shrink-0" />}
                           {quizState.submitted && quizState.selectedAnswers[quizState.questionIndex] === answer && String(answer).trim().toLowerCase() !== String(currentQuestion.correctAnswer).trim().toLowerCase() && <X className="h-4 w-4 text-red-600 dark:text-red-400 ml-auto flex-shrink-0" />}
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  {currentQuestion.type === 'true/false' && (
                     <RadioGroup
                        value={quizState.selectedAnswers[quizState.questionIndex] || ''} // Ensure value is string
                        onValueChange={handleAnswerChange}
                        disabled={quizState.submitted || isSubmitting}
                      >
                       {['True', 'False'].map((answer, idx) => (
                           <div key={idx} className={cn(
                               "flex items-center space-x-2 p-2 rounded-md border border-border transition-colors", // Use border-border
                               quizState.submitted && String(answer).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase() && "bg-green-100 border-green-300 dark:bg-green-900/50 dark:border-green-700",
                               quizState.submitted && quizState.selectedAnswers[quizState.questionIndex] === answer && String(answer).trim().toLowerCase() !== String(currentQuestion.correctAnswer).trim().toLowerCase() && "bg-red-100 border-red-300 dark:bg-red-900/50 dark:border-red-700"
                           )}>
                             <RadioGroupItem value={answer} id={`q${quizState.questionIndex}-a${idx}`} />
                             <Label htmlFor={`q${quizState.questionIndex}-a${idx}`} className="cursor-pointer flex-1">{answer}</Label>
                              {quizState.submitted && String(answer).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase() && <Check className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto flex-shrink-0" />}
                           {quizState.submitted && quizState.selectedAnswers[quizState.questionIndex] === answer && String(answer).trim().toLowerCase() !== String(currentQuestion.correctAnswer).trim().toLowerCase() && <X className="h-4 w-4 text-red-600 dark:text-red-400 ml-auto flex-shrink-0" />}
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
                           className={cn(
                               quizState.submitted && (String(quizState.selectedAnswers[quizState.questionIndex] ?? '').trim().toLowerCase() === String(currentQuestion.correctAnswer ?? '').trim().toLowerCase() ? "border-green-500 focus-visible:ring-green-500" : "border-red-500 focus-visible:ring-red-500")
                           )}
                         />
                         {quizState.submitted && (
                             <p className={cn(
                                 "text-sm",
                                 String(quizState.selectedAnswers[quizState.questionIndex] ?? '').trim().toLowerCase() === String(currentQuestion.correctAnswer ?? '').trim().toLowerCase() ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                             )}>
                                 {String(quizState.selectedAnswers[quizState.questionIndex] ?? '').trim().toLowerCase() === String(currentQuestion.correctAnswer ?? '').trim().toLowerCase() ? <Check className="inline h-4 w-4 mr-1" /> : <X className="inline h-4 w-4 mr-1" />}
                                 Correct Answer: {currentQuestion.correctAnswer}
                             </p>
                         )}
                      </div>
                  )}
                </div>

                 {!quizState.submitted && (
                     <div className="flex justify-between items-center pt-4 border-t mt-6">
                       <Button
                         variant="outline"
                         onClick={handlePreviousQuestion}
                         disabled={quizState.questionIndex === 0 || isSubmitting}
                       >
                         Previous
                       </Button>
                       {quizState.questionIndex === quizData.quiz.length - 1 ? (
                          <Button
                            onClick={handleSubmitQuiz}
                            disabled={isSubmitting || !quizState.selectedAnswers[quizState.questionIndex]} // Also disable if current question not answered
                          >
                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                             Submit Quiz
                          </Button>
                        ) : (
                          <Button onClick={handleNextQuestion} disabled={isSubmitting || !quizState.selectedAnswers[quizState.questionIndex]}>Next</Button> // Disable if not answered
                        )}
                     </div>
                 )}
              </div>
            ) : (
              !isLoading && <p className="text-muted-foreground text-center h-full flex items-center justify-center">Generate a quiz using the panel on the left.</p>
            )}
          </CardContent>
           <CardFooter>
               {quizData && (
                  <Button variant="outline" size="sm" onClick={() => {setQuizData(null); setQuizState(null); /* Optionally reset textbook content? */}} disabled={isLoading || isSubmitting}>
                      {quizState?.submitted ? 'Start New Quiz' : 'Cancel Quiz'}
                  </Button>
               )}
           </CardFooter>
        </Card>
      </div>
    </div>
  );
}

