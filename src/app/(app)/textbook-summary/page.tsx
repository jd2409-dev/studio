'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text, AudioLines, BrainCircuit, Loader2, Upload } from 'lucide-react';
import { generateTextbookSummary, type GenerateTextbookSummaryOutput } from '@/ai/flows/textbook-summarization';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

export default function TextbookSummaryPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<GenerateTextbookSummaryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Add size validation (e.g., max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (selectedFile.size > maxSize) {
          toast({
              title: "File Too Large",
              description: "Please select an image file smaller than 5MB.",
              variant: "destructive",
          });
          setFile(null);
          setPreviewUrl(null);
          event.target.value = ''; // Clear the input
          return;
      }

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setSummary(null); // Clear previous summary on new file selection
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !previewUrl) {
      toast({
        title: "Error",
        description: "Please select a textbook page image first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSummary(null);

    try {
        // The previewUrl is already a data URI
        const input = { textbookDataUri: previewUrl };
        const result = await generateTextbookSummary(input);
        setSummary(result);
        toast({
            title: "Success",
            description: "Summaries generated successfully!",
        });
    } catch (error: any) {
        console.error("Error generating summary:", error);
        let errorDesc = "Failed to generate summary. Please try again.";
        if (error instanceof Error) {
            // Check for specific Genkit or network errors if possible
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


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">AI Textbook Summarization</h1>
      <p className="text-muted-foreground mb-8">
        Upload an image of a textbook page (max 5MB), and our AI will generate text, audio script, and mind map summaries for you.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Textbook Page</CardTitle>
            <CardDescription>Select an image file (JPG, PNG, etc.) of the page you want to summarize.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="textbook-page">Textbook Page Image</Label>
                <Input
                  id="textbook-page"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  required
                />
              </div>
              {previewUrl && (
                <div className="mt-4 border rounded-md overflow-hidden max-h-96 flex justify-center items-center bg-muted">
                 <Image
                    src={previewUrl}
                    alt="Textbook page preview"
                    width={400}
                    height={500}
                    className="w-auto h-auto max-w-full max-h-96 object-contain" // Adjust styling
                    data-ai-hint="textbook page"
                  />
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || !file}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Generate Summaries
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Summary Section */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Summaries</CardTitle>
            <CardDescription>View the AI-generated summaries below.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Generating summaries...</p>
              </div>
            )}
            {summary ? (
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text"><Text className="mr-1 h-4 w-4" /> Text</TabsTrigger>
                  <TabsTrigger value="audio"><AudioLines className="mr-1 h-4 w-4" /> Audio Script</TabsTrigger>
                  <TabsTrigger value="mindmap"><BrainCircuit className="mr-1 h-4 w-4" /> Mind Map</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-4 p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[400px] overflow-y-auto">
                  <h3 className="font-semibold mb-2">Text Summary</h3>
                  <p className="text-sm whitespace-pre-wrap">{summary.textSummary}</p>
                </TabsContent>
                <TabsContent value="audio" className="mt-4 p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[400px] overflow-y-auto">
                   <h3 className="font-semibold mb-2">Audio Summary (Script)</h3>
                   <p className="text-sm whitespace-pre-wrap">{summary.audioSummary}</p>
                   <p className="text-xs text-muted-foreground mt-2">
                       This is a script suitable for text-to-speech. You can copy this text and use a TTS service to generate audio.
                   </p>
                   {/* Future enhancement: Integrate a simple client-side TTS if needed */}
                   {/*
                   <Button size="sm" variant="secondary" className="mt-2" onClick={() => speakText(summary.audioSummary)} disabled={!('speechSynthesis' in window)}>
                       Speak Summary
                   </Button>
                   */}
                 </TabsContent>
                <TabsContent value="mindmap" className="mt-4 p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[400px] overflow-y-auto">
                  <h3 className="font-semibold mb-2">Mind Map (Markdown)</h3>
                  {/* Display mind map - could be text, an image URL, or require a library */}
                  <pre className="text-sm whitespace-pre-wrap font-mono bg-background p-2 rounded">{summary.mindMap}</pre>
                  <p className="text-xs text-muted-foreground mt-2">Mind map content generated by AI in Markdown format. Copy and paste into a Markdown editor or mind map tool.</p>
                </TabsContent>
              </Tabs>
            ) : (
               !isLoading && <p className="text-muted-foreground text-center h-40 flex items-center justify-center">Upload a textbook page image and click "Generate Summaries" to see the results.</p>
            )}
          </CardContent>
           <CardFooter>
              {summary && <Button variant="outline" size="sm" onClick={() => setSummary(null)}>Clear Summaries</Button>}
           </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// Optional: Basic client-side text-to-speech helper
/*
function speakText(text: string) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        // Optional: configure voice, rate, pitch
        // utterance.voice = speechSynthesis.getVoices()[0]; // Example: select a voice
        // utterance.rate = 1; // Speed
        // utterance.pitch = 1; // Pitch
        speechSynthesis.cancel(); // Cancel any previous speech
        speechSynthesis.speak(utterance);
    } else {
        alert("Sorry, your browser doesn't support Text-to-Speech.");
    }
}
*/
