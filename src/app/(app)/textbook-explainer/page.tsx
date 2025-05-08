'use client';

import { useState, type ChangeEvent, type FormEvent, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text, AudioLines, BrainCircuit, Loader2, Upload, FileText as FileTextIcon, Lightbulb, Play, Pause, StopCircle, AlertTriangle } from 'lucide-react';
import { explainTextbookPdf, type ExplainTextbookPdfOutput } from '@/ai/flows/textbook-explainer-flow';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_FILE_TYPE = 'application/pdf';

export default function TextbookExplainerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [explanation, setExplanation] = useState<ExplainTextbookPdfOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Loading state for explanation generation
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false); // Placeholder for potential server-side audio
  const [speechError, setSpeechError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cancelSpeech = () => {
       if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
           window.speechSynthesis.cancel();
       }
       utteranceRef.current = null;
       setIsSpeaking(false);
       setIsPaused(false);
       setSpeechError(null);
   };

  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setFile(null);
    setExplanation(null);
    cancelSpeech();

    if (selectedFile) {
      if (selectedFile.type !== ALLOWED_FILE_TYPE) {
          toast({
              title: "Invalid File Type",
              description: `Please select a PDF file. Type detected: ${selectedFile.type}`,
              variant = "destructive",
          });
          if (event.target) event.target.value = '';
          return;
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
          toast({
              title: "File Too Large",
              description: `PDF file must be smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
              variant = "destructive"
          });
          if (event.target) event.target.value = '';
          return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
        toast({ title: "Authentication Required", description: "Please log in to use the explainer.", variant = "destructive" });
        return;
    }
    if (!file) {
      toast({ title: "Input Required", description: "Please select a PDF file first.", variant = "destructive" });
      return;
    }

    setIsLoading(true); // Start loading indicator *before* async operation
    setExplanation(null);
    cancelSpeech();

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
        const fileDataUri = reader.result as string;
        if (!fileDataUri || !fileDataUri.startsWith(`data:${ALLOWED_FILE_TYPE};base64,`)) {
            toast({ title: "File Read Error", description: "Failed to read the PDF file correctly.", variant = "destructive" });
            setIsLoading(false);
            return;
        }
        try {
            const input = { fileDataUri };
            console.log("Sending PDF to explanation flow...");
            const result = await explainTextbookPdf(input); // Call Server Action
             console.log("Explanation received:", { textLen: result?.textExplanation?.length, audioLen: result?.audioExplanationScript?.length, mindMapLen: result?.mindMapExplanation?.length });

              if (result.textExplanation.startsWith("Cannot explain:")) {
                  toast({
                      title: "Explanation Not Possible",
                      description: result.textExplanation,
                      variant: "default",
                      duration: 5000,
                  });
              } else {
                 toast({ title: "Success", description: "Explanation generated!" });
              }
            setExplanation(result);
        } catch (error: any) {
            console.error("Error generating explanation:", error);
            let errorDesc = "Failed to generate explanation. Please try again.";
            if (error instanceof Error) {
                 if (error.message.includes("blocked")) {
                     errorDesc = "Explanation generation was blocked, possibly due to content safety filters or the PDF content itself.";
                 } else if (error.message.includes("unexpected format")) {
                      errorDesc = "The AI returned the explanation in an unexpected format. Please try again or with a different file.";
                 } else if (error.message.includes("valid Base64 encoded PDF")) {
                     errorDesc = "Invalid PDF file format provided.";
                 } else {
                    errorDesc = error.message;
                 }
            }
            toast({ title: "Error Generating Explanation", description: errorDesc, variant = "destructive" });
        } finally {
            setIsLoading(false); // Stop loading indicator regardless of success/failure
        }
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({ title: "File Read Error", description: "Could not read the selected file.", variant = "destructive" });
        setIsLoading(false);
    };
  };

  const handlePlayPause = () => {
      if (!explanation?.audioExplanationScript || typeof window === 'undefined' || !('speechSynthesis' in window)) {
          setSpeechError("Speech synthesis is not supported by your browser.");
          return;
      }
      setSpeechError(null);

      const synth = window.speechSynthesis;

      if (isSpeaking && !isPaused) {
          synth.pause();
          setIsPaused(true);
          console.log("Speech paused.");
      } else {
          if (isPaused && utteranceRef.current) {
              synth.resume();
              setIsPaused(false);
              console.log("Speech resumed.");
          } else {
               cancelSpeech();

              const utterance = new SpeechSynthesisUtterance(explanation.audioExplanationScript);
              utteranceRef.current = utterance;

              utterance.onstart = () => { console.log("Speech started"); setIsSpeaking(true); setIsPaused(false); };
              utterance.onend = () => { console.log("Speech ended naturally"); setIsSpeaking(false); setIsPaused(false); utteranceRef.current = null; };
              utterance.onpause = () => { console.log("Speech paused via API"); /* State handled by logic */ };
              utterance.onresume = () => { console.log("Speech resumed via API"); setIsPaused(false); };
               utterance.onerror = (event) => {
                    console.warn("Speech synthesis error/interruption:", event.error, event);
                    let errorMsg = `Speech synthesis failed: ${event.error || 'unknown error'}`;
                     if (event.error === 'interrupted') {
                         errorMsg = "Speech playback was interrupted.";
                         // Don't show destructive toast for interruptions
                         toast({ title: "Playback Interrupted", description: errorMsg, variant: "default" });
                    } else {
                        // Handle other errors more severely
                        if (event.error === 'synthesis-failed' || event.error === 'network') { errorMsg += ". Check connection or try a different voice/browser/browser."; }
                        else if (event.error === 'language-unavailable') { errorMsg += ". The selected language is unavailable."; }
                        else if (event.error === 'not-allowed') { errorMsg = "Speech synthesis permission denied by the browser."; }
                        else if (event.error === 'audio-busy') { errorMsg = "Audio output is busy. Please wait or try again."; }
                        else if (event.error === 'invalid-argument') { errorMsg = "Invalid argument provided to speech synthesis."; }
                        setSpeechError(errorMsg);
                         toast({ title: "Audio Playback Error", description: errorMsg, variant = "destructive" });
                    }
                   setIsSpeaking(false);
                   setIsPaused(false);
                   utteranceRef.current = null;
               };

              try {
                   synth.speak(utterance);
                   console.log("Attempting to speak...");
              } catch (speakError: any) {
                  console.error("Error calling speechSynthesis.speak:", speakError);
                   const errorMsg = `Could not start speech: ${speakError.message}`;
                   setSpeechError(errorMsg);
                    toast({ title: "Audio Error", description: errorMsg, variant = "destructive" });
                   setIsSpeaking(false);
                   setIsPaused(false);
                   utteranceRef.current = null;
              }
          }
      }
  };

  const handleStop = () => {
      cancelSpeech();
      console.log("Speech stopped.");
  };

   const handleClear = () => {
      setFile(null);
      setExplanation(null);
      cancelSpeech();
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Lightbulb className="text-primary h-7 w-7"/> AI Textbook Explainer
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Upload a textbook PDF (max {MAX_FILE_SIZE / 1024 / 1024}MB). The AI analyzes the content and provides explanations in text, audio script, and mind map formats.
      </p>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Upload Section */}
        <Card className="shadow-lg rounded-lg sticky top-8">
          <CardHeader>
            <CardTitle className="text-xl">Upload Textbook PDF</CardTitle>
            <CardDescription>Select a PDF file to explain.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="textbook-pdf" className="font-semibold">PDF File</Label>
                <Input
                  ref={fileInputRef}
                  id="textbook-pdf"
                  type="file"
                  accept={ALLOWED_FILE_TYPE}
                  onChange={handleFileChange}
                  disabled={isLoading || authLoading}
                  required
                  className="cursor-pointer file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
              {file && (
                 <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                     <FileTextIcon className="h-4 w-4 flex-shrink-0 text-primary"/>
                     <span className="truncate font-medium text-foreground" title={file.name}>{file.name}</span>
                     <span className="ml-auto flex-shrink-0">({ (file.size / 1024 / 1024).toFixed(2)} MB)</span>
                 </div>
              )}
              {!user && !authLoading && (
                 <Alert variant = "destructive">
                    <AlertTriangle className="h-4 w-4" />
                     <AlertTitle>Login Required</AlertTitle>
                    <AlertDescription>Please log in to use the explainer.</AlertDescription>
                 </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="submit"
                disabled={isLoading || !file || authLoading || !user} // Comprehensive disable check
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Generate Explanation
                  </>
                )}
              </Button>
               {file && (
                 <Button variant="ghost" type="button" onClick={handleClear} disabled={isLoading} className="text-xs">
                     Clear Selection
                 </Button>
               )}
            </CardFooter>
          </form>
        </Card>

        {/* Explanation Section */}
        <Card className="shadow-lg rounded-lg min-h-[400px] flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl">Generated Explanation</CardTitle>
            <CardDescription>View the AI-generated explanation below.</CardDescription>
          </CardHeader>
          <CardContent className="relative flex-1">
             {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-b-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">Generating explanation...</p>
                 <p className="text-xs text-muted-foreground mt-1">(This may take a moment)</p>
              </div>
            )}
            {!isLoading && explanation ? (
              <Tabs defaultValue="text" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
                  <TabsTrigger value="text"><Text className="mr-1 h-4 w-4" /> Text</TabsTrigger>
                  <TabsTrigger value="audio"><AudioLines className="mr-1 h-4 w-4" /> Audio</TabsTrigger>
                  <TabsTrigger value="mindmap"><BrainCircuit className="mr-1 h-4 w-4" /> Mind Map</TabsTrigger>
                </TabsList>
                {/* Text Content */}
                <TabsContent value="text" className="mt-2 p-4 border rounded-md bg-muted/30 flex-1 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                  <h3 className="font-semibold mb-2 text-base sticky top-0 bg-muted/30 py-1 -mt-4 -mx-4 px-4 border-b">Text Explanation</h3>
                   <p className="whitespace-pre-wrap mt-4">{explanation.textExplanation}</p>
                </TabsContent>
                {/* Audio Content */}
                 <TabsContent value="audio" className="mt-2 p-4 border rounded-md bg-muted/30 flex-1 overflow-y-auto flex flex-col">
                   <h3 className="font-semibold mb-2 text-base flex-shrink-0">Audio Explanation</h3>
                   {speechError && (
                      <Alert variant = "destructive" className="mb-3 flex-shrink-0">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Audio Error</AlertTitle>
                         <AlertDescription>{speechError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex gap-2 mb-3 flex-shrink-0 items-center">
                       <Button
                           onClick={handlePlayPause}
                           disabled={isGeneratingAudio || !explanation.audioExplanationScript || (typeof window !== 'undefined' && !('speechSynthesis' in window))}
                           variant = {isSpeaking && !isPaused ? "secondary" : "default"}
                           size="sm"
                           aria-label={isSpeaking && !isPaused ? "Pause" : "Play/Resume"}
                           className="flex items-center gap-1"
                       >
                           {isSpeaking && !isPaused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                           {isSpeaking && !isPaused ? 'Pause' : (isPaused ? 'Resume' : 'Play')}
                       </Button>
                       <Button
                           onClick={handleStop}
                           disabled={!isSpeaking || (typeof window !== 'undefined' && !('speechSynthesis' in window))}
                           variant="outline"
                           size="sm"
                           aria-label="Stop"
                            className="flex items-center gap-1"
                       >
                           <StopCircle className="h-4 w-4" /> Stop
                       </Button>
                       {isSpeaking && <Loader2 className="h-4 w-4 animate-spin text-primary ml-2"/>}
                   </div>
                   {(typeof window !== 'undefined' && !('speechSynthesis' in window)) && (
                       <p className="text-xs text-destructive mb-3 flex-shrink-0">Your browser does not support speech synthesis playback.</p>
                   )}
                    <p className="text-xs text-muted-foreground mb-3 flex-shrink-0">
                        Playback uses your browser's text-to-speech engine. Quality may vary.
                    </p>
                   <h4 className="font-medium text-sm pt-3 border-t flex-shrink-0">Audio Script:</h4>
                   <div className="overflow-y-auto flex-grow mt-2 text-sm">
                       <p className="whitespace-pre-wrap">{explanation.audioExplanationScript}</p>
                   </div>
                 </TabsContent>
                 {/* Mind Map Content */}
                <TabsContent value="mindmap" className="mt-2 p-4 border rounded-md bg-muted/30 flex-1 overflow-y-auto">
                  <h3 className="font-semibold mb-2 text-base sticky top-0 bg-muted/30 py-1 -mt-4 -mx-4 px-4 border-b">Mind Map (Markdown)</h3>
                     <>
                       <pre className="text-sm whitespace-pre-wrap font-mono bg-background p-3 rounded-md border mt-4">{explanation.mindMapExplanation}</pre>
                       <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">This is a hierarchical representation of the key concepts.</p>
                     </>
                </TabsContent>
              </Tabs>
            ) : (
               !isLoading && <p className="text-muted-foreground text-center flex items-center justify-center h-full">Upload a PDF and click "Generate Explanation" to see the results here.</p>
            )}
          </CardContent>
           {explanation && (
             <CardFooter className="pt-4 border-t flex justify-end flex-shrink-0">
                <Button variant="outline" size="sm" onClick={handleClear} disabled={isLoading}>Clear Results</Button>
             </CardFooter>
           )}
        </Card>
      </div>
    </div>
  );
}

    