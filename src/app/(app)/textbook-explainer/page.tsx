
'use client';

import { useState, type ChangeEvent, type FormEvent, useEffect, useRef } from 'react'; // Added useEffect, useRef
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text, AudioLines, BrainCircuit, Loader2, Upload, FileText as FileTextIcon, Lightbulb, Play, Pause, StopCircle } from 'lucide-react'; // Added Play, Pause, StopCircle
import { explainTextbookPdf, type ExplainTextbookPdfOutput } from '@/ai/flows/textbook-explainer-flow';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // Increased max file size to 15MB for PDFs
const ALLOWED_FILE_TYPE = 'application/pdf';

export default function TextbookExplainerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [explanation, setExplanation] = useState<ExplainTextbookPdfOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false); // Kept for potential future API use

  // State for Web Speech API control
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cleanup speech synthesis on unmount or when explanation changes
  useEffect(() => {
    return () => {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      utteranceRef.current = null; // Clear ref on cleanup
      setIsSpeaking(false);
      setIsPaused(false);
    };
  }, [explanation]); // Re-run cleanup if explanation changes


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (selectedFile.type !== ALLOWED_FILE_TYPE) {
          toast({
              title: "Invalid File Type",
              description: `Please select a PDF file.`,
              variant: "destructive",
          });
          setFile(null);
          event.target.value = ''; // Clear the input
          return;
      }

      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE) {
          toast({
              title: "File Too Large",
              description: `Please select a file smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
              variant: "destructive",
          });
          setFile(null);
          event.target.value = ''; // Clear the input
          return;
      }

      setFile(selectedFile);
      setExplanation(null); // Clear previous explanation
      // Cancel any ongoing speech
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      utteranceRef.current = null;
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a PDF file first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setExplanation(null);
    // Cancel any ongoing speech
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      utteranceRef.current = null;
      setIsSpeaking(false);
      setIsPaused(false);

    // Read file as Data URI to pass to the flow
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const fileDataUri = reader.result as string;
        try {
            const input = { fileDataUri };
            const result = await explainTextbookPdf(input);
            setExplanation(result);
            toast({
                title: "Success",
                description: "Explanation generated successfully!",
            });
        } catch (error: any) {
            console.error("Error generating explanation:", error);
            let errorDesc = "Failed to generate explanation. Please try again.";
            // Use the potentially more specific error message from the flow
            if (error instanceof Error && error.message) {
                errorDesc = error.message;
            }
            toast({
                title: "Error Generating Explanation",
                description: errorDesc,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({
            title: "File Read Error",
            description: "Could not read the selected file.",
            variant: "destructive",
        });
        setIsLoading(false);
    };
  };

  const handlePlayPause = () => {
      if (!explanation?.audioExplanationScript || !('speechSynthesis' in window)) return;

      if (isSpeaking && !isPaused) {
          // Pause
          speechSynthesis.pause();
          setIsPaused(true);
          toast({ title: "Audio Paused" });
      } else {
          // Play or Resume
          if (isPaused && utteranceRef.current) {
              speechSynthesis.resume();
          } else {
               // Start new speech
               if (speechSynthesis.speaking) { // Cancel previous if any
                   speechSynthesis.cancel();
                   setIsSpeaking(false);
                   setIsPaused(false);
                   utteranceRef.current = null;
               }

              const utterance = new SpeechSynthesisUtterance(explanation.audioExplanationScript);
              utteranceRef.current = utterance; // Store the reference

              utterance.onstart = () => {
                  setIsSpeaking(true);
                  setIsPaused(false);
                  console.log("Speech started");
              };
              utterance.onend = () => {
                  setIsSpeaking(false);
                  setIsPaused(false);
                  utteranceRef.current = null; // Clear ref on end
                  console.log("Speech ended");
                  toast({ title: "Audio Finished" });
              };
              utterance.onpause = () => {
                  setIsPaused(true); // Ensure state consistency
                  console.log("Speech paused");
              };
              utterance.onresume = () => {
                  setIsPaused(false); // Ensure state consistency
                  console.log("Speech resumed");
              };
               utterance.onerror = (event) => {
                  console.error("Speech synthesis error:", event.error);
                  toast({ title: "Audio Error", description: `Speech synthesis failed: ${event.error}`, variant: "destructive" });
                  setIsSpeaking(false);
                  setIsPaused(false);
                  utteranceRef.current = null;
              };
              speechSynthesis.speak(utterance);
          }
          setIsPaused(false); // Always ensure paused is false when playing/resuming
           if (!isSpeaking) { // Only toast 'playing' if it wasn't already paused
               toast({ title: "Audio Playing" });
           }
      }
  };

  const handleStop = () => {
      if ('speechSynthesis' in window) {
          speechSynthesis.cancel(); // Stops speaking immediately
          setIsSpeaking(false);
          setIsPaused(false);
          utteranceRef.current = null; // Clear ref on stop
          toast({ title: "Audio Stopped" });
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
        <Alert className="mb-6 bg-accent/10 border-accent/30 text-accent-foreground [&>svg]:text-accent">
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription>
            The AI analyzes the PDF content you upload and generates comprehensive explanations to help you understand the material better. Audio uses your browser's text-to-speech.
            </AlertDescription>
        </Alert>


      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Textbook PDF</CardTitle>
            <CardDescription>Select a PDF file to explain.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="textbook-pdf">PDF File</Label>
                <Input
                  id="textbook-pdf"
                  type="file"
                  accept={ALLOWED_FILE_TYPE}
                  onChange={handleFileChange}
                  disabled={isLoading}
                  required
                />
              </div>
              {/* Display file info */}
              {file && (
                <div className="mt-4 border rounded-md overflow-hidden flex items-center gap-3 p-3 bg-muted">
                    <FileTextIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                    <div className="text-left overflow-hidden">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.type} - {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || !file}>
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
        <Card>
          <CardHeader>
            <CardTitle>Generated Explanation</CardTitle>
            <CardDescription>View the AI-generated explanation below.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Generating explanation...</p>
              </div>
            )}
            {explanation ? (
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text"><Text className="mr-1 h-4 w-4" /> Text</TabsTrigger>
                  <TabsTrigger value="audio"><AudioLines className="mr-1 h-4 w-4" /> Audio</TabsTrigger>
                  <TabsTrigger value="mindmap"><BrainCircuit className="mr-1 h-4 w-4" /> Mind Map</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-4 p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[500px] overflow-y-auto">
                  <h3 className="font-semibold mb-2">Text Explanation</h3>
                   <p className="text-sm whitespace-pre-wrap">{explanation.textExplanation}</p>
                </TabsContent>
                 <TabsContent value="audio" className="mt-4 p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[500px] overflow-y-auto space-y-4">
                   <h3 className="font-semibold mb-2">Audio Explanation</h3>
                    <div className="flex gap-2">
                       <Button
                           onClick={handlePlayPause}
                           disabled={isGeneratingAudio || !explanation.audioExplanationScript || !('speechSynthesis' in window)}
                           variant={isSpeaking && !isPaused ? "secondary" : "default"}
                           size="icon"
                           aria-label={isSpeaking && !isPaused ? "Pause" : "Play"}
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
                       <p className="text-xs text-destructive">Your browser does not support speech synthesis.</p>
                   )}
                    <p className="text-xs text-muted-foreground mt-2">
                        Use the controls above to play, pause, or stop the explanation using your browser's text-to-speech.
                    </p>
                   <h4 className="font-medium text-xs pt-4 border-t">Audio Script:</h4>
                   <p className="text-xs whitespace-pre-wrap">{explanation.audioExplanationScript}</p>
                 </TabsContent>
                <TabsContent value="mindmap" className="mt-4 p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[500px] overflow-y-auto">
                  <h3 className="font-semibold mb-2">Mind Map (Markdown)</h3>
                     <pre className="text-sm whitespace-pre-wrap font-mono bg-background p-2 rounded">{explanation.mindMapExplanation}</pre>
                     <p className="text-xs text-muted-foreground mt-2">Mind map content generated by AI in Markdown format.</p>
                </TabsContent>
              </Tabs>
            ) : (
               !isLoading && <p className="text-muted-foreground text-center h-40 flex items-center justify-center">Upload a PDF and click "Generate Explanation" to see the results.</p>
            )}
          </CardContent>
           <CardFooter>
              {explanation && <Button variant="outline" size="sm" onClick={() => {
                  setExplanation(null);
                  setFile(null);
                  if (speechSynthesis.speaking) { // Stop speech if clearing
                      speechSynthesis.cancel();
                  }
                  utteranceRef.current = null;
                  setIsSpeaking(false);
                  setIsPaused(false);
                  const input = document.getElementById('textbook-pdf') as HTMLInputElement;
                  if(input) input.value = '';
              }}>Clear</Button>}
           </CardFooter>
        </Card>
      </div>
    </div>
  );
}
