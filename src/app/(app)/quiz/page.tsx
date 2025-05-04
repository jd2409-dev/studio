'use client';

import { useState, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Loader2, Wand2, Check, X } from 'lucide-react';
import { generateQuiz, type GenerateQuizInput, type GenerateQuizOutput } from '@/ai/flows/quiz-generation';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

type QuizState = {
    questionIndex: number;
    selectedAnswers: (string | undefined)[];
    submitted: boolean;
};

export default function QuizGenerationPage() {
  const [textbookContent, setTextbookContent] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [quizData, setQuizData] = useState<GenerateQuizOutput | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

    setIsLoading(true);
    setQuizData(null);
    setQuizState(null);

    try {
      const input: GenerateQuizInput = { textbookContent, questionCount };
      const result = await generateQuiz(input);
      setQuizData(result);
      setQuizState({
        questionIndex: 0,
        selectedAnswers: new Array(result.quiz.length).fill(undefined),
        submitted: false,
      });
      toast({
        title: "Success",
        description: "Quiz generated successfully!",
      });
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast({
        title: "Error",
        description: "Failed to generate quiz. Please try again.",
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

  const handleSubmitQuiz = () => {
      if (!quizState) return;
      // Check if all questions are answered
      const allAnswered = quizState.selectedAnswers.every(answer => answer !== undefined && answer !== '');
      if(!allAnswered && !window.confirm("You haven't answered all questions. Submit anyway?")) {
          return;
      }
      setQuizState({ ...quizState, submitted: true });
      toast({ title: "Quiz Submitted", description: "Check your results below." });
  };

  const calculateScore = () => {
    if (!quizData || !quizState) return 0;
    return quizState.selectedAnswers.reduce((score, selectedAnswer, index) => {
        const question = quizData.quiz[index];
        // Case-insensitive comparison for text-based answers
        const isCorrect = typeof selectedAnswer === 'string' && typeof question.correctAnswer === 'string'
            ? selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
            : selectedAnswer === question.correctAnswer;

        return score + (isCorrect ? 1 : 0);
    }, 0);
  };

  const currentQuestion = quizData?.quiz[quizState?.questionIndex ?? 0];
  const score = quizState?.submitted ? calculateScore() : null;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">AI Quiz Generation</h1>
      <p className="text-muted-foreground mb-8">
        Paste content from your textbook, choose the number of questions, and generate an interactive quiz with AI feedback.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Generation Section */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Quiz</CardTitle>
            <CardDescription>Input textbook content and settings.</CardDescription>
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
                  disabled={isLoading}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="question-count">Number of Questions (1-20)</Label>
                <Input
                  id="question-count"
                  type="number"
                  min="1"
                  max="20"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                  disabled={isLoading}
                  required
                  className="mt-1 w-24"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Generate Quiz
                  </>
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
             {!quizState?.submitted && quizData && (
                <CardDescription>Answer the questions below. Question {quizState.questionIndex + 1} of {quizData.quiz.length}.</CardDescription>
             )}
              {!quizData && !isLoading && (
                 <CardDescription>Generate a quiz to start.</CardDescription>
              )}
          </CardHeader>
          <CardContent className="min-h-[300px] flex flex-col justify-between">
            {isLoading && (
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
                      value={quizState.selectedAnswers[quizState.questionIndex]}
                      onValueChange={handleAnswerChange}
                      disabled={quizState.submitted}
                    >
                      {currentQuestion.answers.map((answer, idx) => (
                        <div key={idx} className={cn(
                            "flex items-center space-x-2 p-2 rounded-md border border-transparent",
                            quizState.submitted && answer === currentQuestion.correctAnswer && "bg-green-100 border-green-300 dark:bg-green-900 dark:border-green-700",
                            quizState.submitted && quizState.selectedAnswers[quizState.questionIndex] === answer && answer !== currentQuestion.correctAnswer && "bg-red-100 border-red-300 dark:bg-red-900 dark:border-red-700"
                        )}>
                          <RadioGroupItem value={answer} id={`q${quizState.questionIndex}-a${idx}`} />
                          <Label htmlFor={`q${quizState.questionIndex}-a${idx}`}>{answer}</Label>
                           {quizState.submitted && answer === currentQuestion.correctAnswer && <Check className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto" />}
                           {quizState.submitted && quizState.selectedAnswers[quizState.questionIndex] === answer && answer !== currentQuestion.correctAnswer && <X className="h-4 w-4 text-red-600 dark:text-red-400 ml-auto" />}
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  {currentQuestion.type === 'true/false' && (
                     <RadioGroup
                        value={quizState.selectedAnswers[quizState.questionIndex]}
                        onValueChange={handleAnswerChange}
                        disabled={quizState.submitted}
                      >
                       {['True', 'False'].map((answer, idx) => (
                           <div key={idx} className={cn(
                               "flex items-center space-x-2 p-2 rounded-md border border-transparent",
                               quizState.submitted && answer === currentQuestion.correctAnswer && "bg-green-100 border-green-300 dark:bg-green-900 dark:border-green-700",
                               quizState.submitted && quizState.selectedAnswers[quizState.questionIndex] === answer && answer !== currentQuestion.correctAnswer && "bg-red-100 border-red-300 dark:bg-red-900 dark:border-red-700"
                           )}>
                             <RadioGroupItem value={answer} id={`q${quizState.questionIndex}-a${idx}`} />
                             <Label htmlFor={`q${quizState.questionIndex}-a${idx}`}>{answer}</Label>
                              {quizState.submitted && answer === currentQuestion.correctAnswer && <Check className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto" />}
                           {quizState.submitted && quizState.selectedAnswers[quizState.questionIndex] === answer && answer !== currentQuestion.correctAnswer && <X className="h-4 w-4 text-red-600 dark:text-red-400 ml-auto" />}
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
                           disabled={quizState.submitted}
                           className={cn(
                               quizState.submitted && (quizState.selectedAnswers[quizState.questionIndex]?.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase() ? "border-green-500 focus-visible:ring-green-500" : "border-red-500 focus-visible:ring-red-500")
                           )}
                         />
                         {quizState.submitted && (
                             <p className={cn(
                                 "text-sm",
                                 quizState.selectedAnswers[quizState.questionIndex]?.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase() ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                             )}>
                                 {quizState.selectedAnswers[quizState.questionIndex]?.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase() ? <Check className="inline h-4 w-4 mr-1" /> : <X className="inline h-4 w-4 mr-1" />}
                                 Correct Answer: {currentQuestion.correctAnswer}
                             </p>
                         )}
                      </div>
                  )}
                </div>

                {/* Navigation/Submit Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePreviousQuestion}
                    disabled={quizState.questionIndex === 0}
                  >
                    Previous
                  </Button>
                  {quizState.questionIndex === quizData.quiz.length - 1 ? (
                     <Button
                       onClick={handleSubmitQuiz}
                       disabled={quizState.submitted}
                       variant={quizState.submitted ? "secondary" : "default"}
                     >
                       {quizState.submitted ? "Quiz Submitted" : "Submit Quiz"}
                     </Button>
                   ) : (
                     <Button onClick={handleNextQuestion}>Next</Button>
                   )}
                </div>
              </div>
            ) : (
              !isLoading && <p className="text-muted-foreground text-center h-full flex items-center justify-center">Generate a quiz using the panel on the left.</p>
            )}
          </CardContent>
           <CardFooter>
               {quizData && (
                  <Button variant="outline" size="sm" onClick={() => {setQuizData(null); setQuizState(null); setTextbookContent('')}}>
                      Start New Quiz
                  </Button>
               )}
           </CardFooter>
        </Card>
      </div>
    </div>
  );
}
