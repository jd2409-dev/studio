'use client';

import { useState, type ChangeEvent, type FormEvent, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text, AudioLines, BrainCircuit, Loader2, Upload, FileText as FileTextIcon, Lightbulb, Play, Pause, StopCircle, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { explainTextbookPdf, type ExplainTextbookPdfOutput } from '@/ai/flows/textbook-explainer-flow';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB for PDFs
const ALLOWED_FILE_TYPE = 'application/pdf';

export default function TextbookExplainerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [explanation, setExplanation] = useState<ExplainTextbookPdfOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth(); // Get user auth state

  // State for Web Speech API control
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null); // Store speech errors
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // Function to safely cancel speech synthesis
  const cancelSpeech = () => {
       if (typeof window !== 'undefined' && 'speechSynthesis' in window && speechSynthesis.speaking) {
           speechSynthesis.cancel();
       }
       utteranceRef.current = null;
       setIsSpeaking(false);
       setIsPaused(false);
       setSpeechError(null);
   };

  // Cleanup speech synthesis on unmount or when explanation/user changes
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []); // Run only once on unmount


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setFile(null); // Reset file state first
    setExplanation(null); // Clear previous explanation
    cancelSpeech(); // Stop any ongoing speech

    if (selectedFile) {
      // Validate file type
      if (selectedFile.type !== ALLOWED_FILE_TYPE) {
          toast({
              title: "Invalid File Type",
              description: `Please select a PDF file. Type detected: ${selectedFile.type}`,
              variant: "destructive",
          });
          event.target.value = ''; // Clear the input
          return;
      }

      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE) {
          toast({
              title: "File Too Large",
              description: `PDF file must be smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
              variant: "destructive",
          });
          event.target.value = ''; // Clear the input
          return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
        toast({ title: "Error", description: "Please log in to use the explainer.", variant: "destructive" });
        return;
    }
    if (!file) {
      toast({ title: "Error", description: "Please select a PDF file first.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setExplanation(null);
    cancelSpeech(); // Stop any previous speech

    // Read file as Data URI to pass to the flow
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
        const fileDataUri = reader.result as string;
        if (!fileDataUri || !fileDataUri.startsWith(`data:${ALLOWED_FILE_TYPE};base64,`)) {
            toast({ title: "File Read Error", description: "Failed to read the PDF file correctly.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        try {
            const input = { fileDataUri };
            console.log("Sending PDF to explanation flow...");
            const result = await explainTextbookPdf(input);
             console.log("Explanation received:", { textLen: result?.textExplanation?.length, audioLen: result?.audioExplanationScript?.length, mindMapLen: result?.mindMapExplanation?.length });

             // Check if AI indicated inability to explain
              if (result.textExplanation.startsWith("Cannot explain:")) {
                  toast({
                      title: "Explanation Not Possible",
                      description: result.textExplanation, // Show reason from AI
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
                    errorDesc = error.message; // Use specific error from flow if available
                 }
            }
            toast({ title: "Error Generating Explanation", description: errorDesc, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({ title: "File Read Error", description: "Could not read the selected file.", variant: "destructive" });
        setIsLoading(false);
    };
  };

  const handlePlayPause = () => {
      if (!explanation?.audioExplanationScript || !('speechSynthesis' in window)) {
          setSpeechError("Speech synthesis is not supported by your browser.");
          return;
      }
      setSpeechError(null); // Clear previous errors

      if (isSpeaking && !isPaused) {
          // Pause
          speechSynthesis.pause();
          setIsPaused(true);
          // toast({ title: "Audio Paused" }); // Optional: less intrusive feedback
      } else {
          // Play or Resume
          if (isPaused && utteranceRef.current) {
              speechSynthesis.resume();
              setIsPaused(false); // Explicitly set paused to false on resume
              // toast({ title: "Audio Resumed" }); // Optional
          } else {
               // Start new speech
               cancelSpeech(); // Ensure any previous utterance is stopped/cleared

              const utterance = new SpeechSynthesisUtterance(explanation.audioExplanationScript);
              utteranceRef.current = utterance; // Store the reference

              utterance.onstart = () => {
                  console.log("Speech started");
                  setIsSpeaking(true);
                  setIsPaused(false);
              };
              utterance.onend = () => {
                  console.log("Speech ended naturally");
                  setIsSpeaking(false);
                  setIsPaused(false);
                  utteranceRef.current = null; // Clear ref on end
                  // toast({ title: "Audio Finished" }); // Optional
              };
              utterance.onpause = () => { // This gets triggered when speech is paused
                  console.log("Speech paused via API");
                  // State is already set by handlePlayPause logic
              };
              utterance.onresume = () => { // This gets triggered when speech is resumed
                  console.log("Speech resumed via API");
                  setIsPaused(false); // Ensure consistency
              };
               utterance.onerror = (event) => {
                  console.error("Speech synthesis error:", event.error, event);
                  let errorMsg = `Speech synthesis failed: ${event.error}`;
                  if (event.error === 'synthesis-failed' || event.error === 'network') {
                      errorMsg += ". Please check your internet connection or try a different voice/browser.";
                  } else if (event.error === 'language-unavailable') {
                       errorMsg += ". The selected language for speech is unavailable.";
                  }
                  setSpeechError(errorMsg);
                  toast({ title: "Audio Error", description: errorMsg, variant: "destructive" });
                  setIsSpeaking(false);
                  setIsPaused(false);
                  utteranceRef.current = null;
              };

              // Attempt to speak
              try {
                   speechSynthesis.speak(utterance);
                   // Toasting here might be premature if speech fails immediately
              } catch (speakError: any) {
                  console.error("Error calling speechSynthesis.speak:", speakError);
                   setSpeechError(`Could not start speech: ${speakError.message}`);
                    toast({ title: "Audio Error", description: `Could not start speech: ${speakError.message}`, variant: "destructive" });
                   setIsSpeaking(false);
                   setIsPaused(false);
                   utteranceRef.current = null;
              }
          }
      }
  };

  const handleStop = () => {
      cancelSpeech(); // Use the centralized cancel function
      // toast({ title: "Audio Stopped" }); // Optional
  };

   const handleClear = () => {
      setFile(null);
      setExplanation(null);
      cancelSpeech();
      if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset the file input visually
      }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <Lightbulb className="text-primary h-7 w-7"/> AI Textbook Explainer
      </h1>
      <p className="text-muted-foreground mb-8">
        Upload a textbook PDF (max {MAX_FILE_SIZE / 1024 / 1024}MB). The AI will explain the content in text, audio, and mind map formats.
      </p>
        <Alert className="mb-6 bg-primary/5 border-primary/20 text-primary-foreground [&>svg]:text-primary">
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription>
            The AI analyzes the PDF content you upload and generates comprehensive explanations to help you understand the material better. Audio playback uses your browser's built-in text-to-speech capability.
            </AlertDescription>
        </Alert>


      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card className="shadow-md rounded-lg">
          <CardHeader>
            <CardTitle>Upload Textbook PDF</CardTitle>
            <CardDescription>Select a PDF file to explain.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="textbook-pdf">PDF File</Label>
                <Input
                  ref={fileInputRef}
                  id="textbook-pdf"
                  type="file"
                  accept={ALLOWED_FILE_TYPE}
                  onChange={handleFileChange}
                  disabled={isLoading || authLoading} // Also disable if auth is loading
                  required
                />
              </div>
              {/* Display file info */}
              {file && (
                <div className="mt-4 border rounded-md overflow-hidden flex items-center gap-3 p-3 bg-muted text-left">
                    <FileTextIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.type} - {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                </div>
              )}
              {!user && !authLoading && (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Please log in to use the explainer.</AlertDescription>
                 </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || !file || authLoading || !user}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Explanation...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Generate Explanation
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Explanation Section */}
        <Card className="shadow-md rounded-lg">
          <CardHeader>
            <CardTitle>Generated Explanation</CardTitle>
            <CardDescription>View the AI-generated explanation below.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]"> {/* Ensure minimum height */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">Generating explanation...</p>
                 <p className="text-xs text-muted-foreground mt-1">(This may take a moment for larger PDFs)</p>
              </div>
            )}
            {explanation ? (
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="text"><Text className="mr-1 h-4 w-4" /> Text</TabsTrigger>
                  <TabsTrigger value="audio"><AudioLines className="mr-1 h-4 w-4" /> Audio</TabsTrigger>
                  <TabsTrigger value="mindmap"><BrainCircuit className="mr-1 h-4 w-4" /> Mind Map</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-2 p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[500px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                  <h3 className="font-semibold mb-2 text-base">Text Explanation</h3>
                   {/* Use dangerouslySetInnerHTML ONLY if markdown/HTML formatting is intended and trusted */}
                   {/* For plain text with potential markdown, pre-wrap is safer */}
                   <p className="whitespace-pre-wrap">{explanation.textExplanation}</p>
                   {/* If using markdown-to-html library: <div dangerouslySetInnerHTML={{ __html: formattedHtml }} /> */}
                </TabsContent>
                 <TabsContent value="audio" className="mt-2 p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[500px] flex flex-col">
                   <h3 className="font-semibold mb-2 text-base">Audio Explanation</h3>
                   {speechError && (
                      <Alert variant="destructive" className="mb-3">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertDescription>{speechError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex gap-2 mb-3 flex-shrink-0">
                       <Button
                           onClick={handlePlayPause}
                           disabled={isGeneratingAudio || !explanation.audioExplanationScript || !('speechSynthesis' in window)}
                           variant={isSpeaking && !isPaused ? "secondary" : "default"}
                           size="icon"
                           aria-label={isSpeaking && !isPaused ? "Pause" : "Play/Resume"}
                       >
                           {isSpeaking && !isPaused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                       </Button>
                       <Button
                           onClick={handleStop}
                           disabled={!isSpeaking || !('speechSynthesis' in window)}
                           variant="outline"
                           size="icon"
                           aria-label="Stop"
                       >
                           <StopCircle className="h-4 w-4" />
                       </Button>
                   </div>
                   {!('speechSynthesis' in window) && (
                       <p className="text-xs text-destructive mb-3">Your browser does not support speech synthesis.</p>
                   )}
                    <p className="text-xs text-muted-foreground mb-3 flex-shrink-0">
                        Use the controls above to play the explanation using your browser's text-to-speech.
                    </p>
                   <h4 className="font-medium text-sm pt-3 border-t flex-shrink-0">Audio Script:</h4>
                   <div className="overflow-y-auto flex-grow mt-2">
                       <p className="text-sm whitespace-pre-wrap">{explanation.audioExplanationScript}</p>
                   </div>
                 </TabsContent>
                <TabsContent value="mindmap" className="mt-2 p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[500px] overflow-y-auto">
                  <h3 className="font-semibold mb-2 text-base">Mind Map (Markdown)</h3>
                     <pre className="text-sm whitespace-pre-wrap font-mono bg-background p-3 rounded-md border">{explanation.mindMapExplanation}</pre>
                     <p className="text-xs text-muted-foreground mt-2">Mind map structure in Markdown format.</p>
                </TabsContent>
              </Tabs>
            ) : (
               !isLoading && <p className="text-muted-foreground text-center h-full flex items-center justify-center py-10">Upload a PDF and click "Generate Explanation" to see the results.</p>
            )}
          </CardContent>
           <CardFooter className="pt-4 border-t">
              {explanation && <Button variant="outline" size="sm" onClick={handleClear}>Clear Explanation</Button>}
           </CardFooter>
        </Card>
      </div>
    </div>
  );
}