
'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text, AudioLines, BrainCircuit, Loader2, Upload, FileText as FileTextIcon, Lightbulb } from 'lucide-react'; // Added Lightbulb
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
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);


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
      setAudioSrc(null); // Clear previous audio
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
    setAudioSrc(null); // Clear previous audio

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
            if (error instanceof Error) {
                errorDesc = error.message || errorDesc;
            }
            toast({
                title: "Error",
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

  const generateAudio = async () => {
      if (!explanation?.audioExplanationScript) {
          toast({ title: "Error", description: "No audio script available to generate audio.", variant: "destructive" });
          return;
      }

      setIsGeneratingAudio(true);
      setAudioSrc(null);

      try {
           // Use the Web Speech API for TTS
           if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(explanation.audioExplanationScript);
                // Optional: Configure voice, rate, pitch, etc.
                // const voices = window.speechSynthesis.getVoices();
                // utterance.voice = voices[ desiredVoiceIndex ]; // Find a suitable voice
                // utterance.rate = 1; // Speed
                // utterance.pitch = 1; // Pitch

                // Create a Blob URL for the generated speech
                utterance.onend = () => {
                    // This part is tricky - Web Speech API doesn't directly give a downloadable file.
                    // We'll just allow playing it directly.
                    // A workaround would involve recording the audio output, which is complex.
                    // For simplicity, we will just trigger the speech synthesis.
                    window.speechSynthesis.speak(utterance);
                    setIsGeneratingAudio(false);
                    // We can't easily set an audioSrc here, so we'll just indicate speech has started.
                    toast({ title: "Audio Playing", description: "Speech synthesis started." });
                     // Simulate setting audioSrc to enable the player controls (though it won't have a downloadable source)
                    setAudioSrc("data:audio/wav;base64,"); // Placeholder to show controls

                };
                 utterance.onerror = (event) => {
                    console.error("Speech synthesis error:", event.error);
                    toast({ title: "Audio Error", description: `Speech synthesis failed: ${event.error}`, variant: "destructive" });
                    setIsGeneratingAudio(false);
                };

                 // Start speech synthesis
                 window.speechSynthesis.speak(utterance);

           } else {
               toast({ title: "Audio Error", description: "Your browser does not support the Web Speech API.", variant: "destructive" });
               setIsGeneratingAudio(false);
           }

      } catch (error) {
          console.error("Error generating audio:", error);
          toast({ title: "Audio Generation Failed", description: "Could not generate audio.", variant: "destructive" });
          setIsGeneratingAudio(false);
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
            The AI analyzes the PDF content you upload and generates comprehensive explanations to help you understand the material better.
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
                   <Button onClick={generateAudio} disabled={isGeneratingAudio || !explanation.audioExplanationScript || !('speechSynthesis' in window)}>
                       {isGeneratingAudio ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AudioLines className="mr-2 h-4 w-4" />}
                       {isGeneratingAudio ? 'Generating...' : 'Play Explanation'}
                   </Button>
                   {!('speechSynthesis' in window) && (
                       <p className="text-xs text-destructive">Your browser does not support speech synthesis.</p>
                   )}
                   {/* Display player if audioSrc exists (even placeholder for direct synthesis) */}
                   {audioSrc && (
                        <audio controls className="w-full" src={audioSrc}>
                            Your browser does not support the audio element.
                        </audio>
                   )}
                    <p className="text-xs text-muted-foreground mt-2">
                        Click play to hear the AI explain the content using your browser's text-to-speech capabilities.
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
              {explanation && <Button variant="outline" size="sm" onClick={() => { setExplanation(null); setFile(null); setAudioSrc(null); const input = document.getElementById('textbook-pdf') as HTMLInputElement; if(input) input.value = ''; }}>Clear</Button>}
           </CardFooter>
        </Card>
      </div>
    </div>
  );
}
