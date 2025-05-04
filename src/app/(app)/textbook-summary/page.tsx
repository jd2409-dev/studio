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
    } catch (error) {
        console.error("Error generating summary:", error);
        toast({
            title: "Error",
            description: "Failed to generate summary. Please try again.",
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
        Upload an image of a textbook page, and our AI will generate text, audio, and mind map summaries for you.
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
                <div className="mt-4 border rounded-md overflow-hidden">
                 <Image
                    src={previewUrl}
                    alt="Textbook page preview"
                    width={400}
                    height={500}
                    className="w-full h-auto object-contain"
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
                  <TabsTrigger value="audio"><AudioLines className="mr-1 h-4 w-4" /> Audio</TabsTrigger>
                  <TabsTrigger value="mindmap"><BrainCircuit className="mr-1 h-4 w-4" /> Mind Map</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-4 p-4 border rounded-md bg-muted/30 min-h-[200px]">
                  <h3 className="font-semibold mb-2">Text Summary</h3>
                  <p className="text-sm whitespace-pre-wrap">{summary.textSummary}</p>
                </TabsContent>
                <TabsContent value="audio" className="mt-4 p-4 border rounded-md bg-muted/30 min-h-[200px]">
                  <h3 className="font-semibold mb-2">Audio Summary</h3>
                  {/* Basic audio player - enhance as needed */}
                  <audio controls className="w-full">
                    <source src={summary.audioSummary} type="audio/mpeg" /> {/* Assuming mp3, adjust if needed */}
                    Your browser does not support the audio element.
                  </audio>
                   <p className="text-xs text-muted-foreground mt-2">Audio generated by AI. Playback functionality depends on browser support.</p>
                </TabsContent>
                <TabsContent value="mindmap" className="mt-4 p-4 border rounded-md bg-muted/30 min-h-[200px]">
                  <h3 className="font-semibold mb-2">Mind Map</h3>
                  {/* Display mind map - could be text, an image URL, or require a library */}
                  <p className="text-sm whitespace-pre-wrap">{summary.mindMap}</p>
                  <p className="text-xs text-muted-foreground mt-2">Mind map content generated by AI. Visual representation might require specific rendering.</p>
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
