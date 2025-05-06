
'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text, AudioLines, BrainCircuit, Loader2, Upload, FileText as FileTextIcon } from 'lucide-react'; // Added FileTextIcon
import { generateTextbookSummary, type GenerateTextbookSummaryOutput } from '@/ai/flows/textbook-summarization';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // Increased max file size to 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export default function TextbookSummaryPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // Store Data URI for images, null otherwise
  const [isImageFile, setIsImageFile] = useState(false);
  const [summary, setSummary] = useState<GenerateTextbookSummaryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
          toast({
              title: "Invalid File Type",
              description: `Please select a supported file type: ${ALLOWED_FILE_TYPES.map(t => t.split('/')[1]).join(', ')}.`,
              variant: "destructive",
          });
          setFile(null);
          setPreviewUrl(null);
          setIsImageFile(false);
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
          setPreviewUrl(null);
          setIsImageFile(false);
          event.target.value = ''; // Clear the input
          return;
      }

      setFile(selectedFile);
      setSummary(null); // Clear previous summary

      // Generate preview only for images
      if (selectedFile.type.startsWith('image/')) {
        setIsImageFile(true);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setIsImageFile(false);
        setPreviewUrl(null); // No preview for non-image files
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSummary(null);

    // Read file as Data URI to pass to the flow
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const fileDataUri = reader.result as string;
        try {
            const input = { fileDataUri: fileDataUri, fileType: file.type };
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
                 // Check for specific known errors from the flow
                if (error.message.includes("currently not supported")) {
                    errorDesc = error.message;
                } else {
                    errorDesc = error.message || errorDesc;
                }
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


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">AI Textbook Summarization</h1>
      <p className="text-muted-foreground mb-8">
        Upload a textbook page (Image, PDF, TXT, DOC/DOCX - max {MAX_FILE_SIZE / 1024 / 1024}MB). AI will generate text, audio script, and mind map summaries.
        <br />
        <span className="text-xs">(Note: PDF/DOCX processing is experimental and may have limitations.)</span>
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Textbook Content</CardTitle>
            <CardDescription>Select an image, PDF, TXT, or DOC/DOCX file.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="textbook-content">File Upload</Label>
                <Input
                  id="textbook-content"
                  type="file"
                  accept={ALLOWED_FILE_TYPES.join(',')} // Use defined allowed types
                  onChange={handleFileChange}
                  disabled={isLoading}
                  required
                />
              </div>
              {/* Display preview for images, or file info for other types */}
              {file && (
                <div className="mt-4 border rounded-md overflow-hidden max-h-96 flex flex-col justify-center items-center bg-muted p-4 text-center">
                 {isImageFile && previewUrl ? (
                     <Image
                        src={previewUrl}
                        alt="Textbook page preview"
                        width={400}
                        height={500}
                        className="w-auto h-auto max-w-full max-h-80 object-contain" // Adjusted max height
                        data-ai-hint="textbook page"
                      />
                  ) : (
                     <>
                        <FileTextIcon className="h-16 w-16 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.type} - {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                     </>
                  )}
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
                   {/* Handle potential error message within summary */}
                   {summary.textSummary === "Unsupported file type for direct text extraction." ? (
                       <p className="text-sm text-destructive">{summary.textSummary}</p>
                   ) : (
                       <p className="text-sm whitespace-pre-wrap">{summary.textSummary}</p>
                   )}
                </TabsContent>
                <TabsContent value="audio" className="mt-4 p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[400px] overflow-y-auto">
                   <h3 className="font-semibold mb-2">Audio Summary (Script)</h3>
                    {/* Handle potential error message within summary */}
                   {summary.audioSummary === "Unsupported file type." ? (
                       <p className="text-sm text-destructive">{summary.audioSummary}</p>
                   ) : (
                      <>
                       <p className="text-sm whitespace-pre-wrap">{summary.audioSummary}</p>
                       <p className="text-xs text-muted-foreground mt-2">
                           This is a script suitable for text-to-speech. You can copy this text and use a TTS service to generate audio.
                       </p>
                       </>
                   )}
                 </TabsContent>
                <TabsContent value="mindmap" className="mt-4 p-4 border rounded-md bg-muted/30 min-h-[200px] max-h-[400px] overflow-y-auto">
                  <h3 className="font-semibold mb-2">Mind Map (Markdown)</h3>
                    {/* Handle potential error message within summary */}
                   {summary.mindMap === "Unsupported file type." ? (
                        <p className="text-sm text-destructive">{summary.mindMap}</p>
                   ) : (
                     <>
                       <pre className="text-sm whitespace-pre-wrap font-mono bg-background p-2 rounded">{summary.mindMap}</pre>
                       <p className="text-xs text-muted-foreground mt-2">Mind map content generated by AI in Markdown format. Copy and paste into a Markdown editor or mind map tool.</p>
                     </>
                   )}
                </TabsContent>
              </Tabs>
            ) : (
               !isLoading && <p className="text-muted-foreground text-center h-40 flex items-center justify-center">Upload a file and click "Generate Summaries" to see the results.</p>
            )}
          </CardContent>
           <CardFooter>
              {summary && <Button variant="outline" size="sm" onClick={() => { setSummary(null); setFile(null); setPreviewUrl(null); setIsImageFile(false); const input = document.getElementById('textbook-content') as HTMLInputElement; if(input) input.value = ''; }}>Clear</Button>}
           </CardFooter>
        </Card>
      </div>
    </div>
  );
}
