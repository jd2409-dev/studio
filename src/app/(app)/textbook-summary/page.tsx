'use client';

import { useState, type ChangeEvent, type FormEvent, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text, AudioLines, BrainCircuit, Loader2, Upload, FileText as FileTextIcon, AlertTriangle } from 'lucide-react';
import { generateTextbookSummary, type GenerateTextbookSummaryOutput } from '@/ai/flows/textbook-summarization';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const IMAGE_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function TextbookSummaryPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isImageFile, setIsImageFile] = useState(false);
  const [summary, setSummary] = useState<GenerateTextbookSummaryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Loading state for summary generation
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setFile(null);
    setPreviewUrl(null);
    setIsImageFile(false);
    setSummary(null);

    if (selectedFile) {
      if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
          toast({
              title: "Invalid File Type",
              description: `Unsupported file. Please upload: ${ALLOWED_FILE_TYPES.map(t => t.split('/')[1]).join(', ')}.`,
              variant = "destructive",
          });
          if (event.target) event.target.value = '';
          return;
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
          toast({
              title: "File Too Large",
              description: `File must be smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
              variant = "destructive",
          });
          if (event.target) event.target.value = '';
          return;
      }
      setFile(selectedFile);

      if (IMAGE_FILE_TYPES.includes(selectedFile.type)) {
        setIsImageFile(true);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setIsImageFile(false);
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
     if (!user) {
        toast({ title: "Error", description: "Please log in to generate summaries.", variant = "destructive" });
        return;
    }
    if (!file) {
      toast({ title: "Error", description: "Please select a file first.", variant = "destructive" });
      return;
    }

    setIsLoading(true); // Start loading indicator *before* async operation
    setSummary(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
        const fileDataUri = reader.result as string;
        if (!fileDataUri || !fileDataUri.startsWith('data:')) {
            toast({ title: "File Read Error", description: "Failed to read the file correctly.", variant = "destructive" });
            setIsLoading(false);
            return;
        }
        try {
            const input = { fileDataUri: fileDataUri, fileType: file.type };
             console.log(`Sending ${file.type} to summary flow...`);
            const result = await generateTextbookSummary(input); // Call Server Action
            console.log("Summary received:", { textLen: result?.textSummary?.length, audioLen: result?.audioSummary?.length, mindMapLen: result?.mindMap?.length });

            if (result.textSummary.includes("Cannot process") || result.textSummary.includes("unclear")) {
                 toast({ title: "Processing Issue", description: result.textSummary, variant:"default", duration: 5000 });
            } else {
                 toast({ title: "Success", description: "Summaries generated successfully!" });
            }
            setSummary(result);
        } catch (error: any) {
            console.error("Error generating summary:", error);
            let errorDesc = "Failed to generate summary. Please try again.";
            if (error instanceof Error) {
                 if (error.message.includes("not supported")) {
                    errorDesc = `File type (${file.type}) is not fully supported for summarization by the AI.`;
                 } else if (error.message.includes("blocked")) {
                     errorDesc = "Summary generation was blocked, possibly due to content safety filters or the file content.";
                 } else if (error.message.includes("unexpected format")) {
                      errorDesc = "The AI returned the summary in an unexpected format. Please try again or with a different file.";
                 } else {
                    errorDesc = error.message;
                 }
            }
            toast({ title: "Error Generating Summary", description: errorDesc, variant = "destructive" });
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

  const handleClear = () => {
      setFile(null);
      setPreviewUrl(null);
      setIsImageFile(false);
      setSummary(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">AI Textbook Summarization</h1>
      <p className="text-muted-foreground mb-8">
        Upload a textbook page or section (Image, PDF, TXT, DOC/DOCX - max {MAX_FILE_SIZE / 1024 / 1024}MB).
        The AI generates text, audio script, and mind map summaries.
      </p>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Upload Section */}
        <Card className="shadow-lg rounded-lg sticky top-8">
          <CardHeader>
            <CardTitle className="text-xl">Upload Content</CardTitle>
            <CardDescription>Select an image, PDF, TXT, or DOC/DOCX file.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="textbook-content" className="font-semibold">File Upload</Label>
                <Input
                  ref={fileInputRef}
                  id="textbook-content"
                  type="file"
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  onChange={handleFileChange}
                  disabled={isLoading || authLoading}
                  required
                  className="cursor-pointer file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
              {file && (
                <div className="mt-4 border rounded-md overflow-hidden min-h-[150px] max-h-80 flex flex-col justify-center items-center bg-muted/50 p-3">
                 {isImageFile && previewUrl ? (
                     <Image
                        src={previewUrl}
                        alt="Textbook page preview"
                        width={400}
                        height={250}
                        className="w-auto h-auto max-w-full max-h-[240px] object-contain rounded shadow-sm"
                        data-ai-hint="textbook page"
                      />
                  ) : (
                     <div className="flex flex-col items-center justify-center text-center p-4">
                        <FileTextIcon className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium truncate max-w-xs" title={file.name}>{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.type} - {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                     </div>
                  )}
                </div>
              )}
               {!user && !authLoading && (
                 <Alert variant = "destructive">
                    <AlertTriangle className="h-4 w-4" />
                     <AlertTitle>Login Required</AlertTitle>
                    <AlertDescription>Please log in to generate summaries.</AlertDescription>
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
                    <Upload className="mr-2 h-4 w-4" /> Generate Summaries
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

        {/* Summary Section */}
        <Card className="shadow-lg rounded-lg min-h-[400px] flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl">Generated Summaries</CardTitle>
            <CardDescription>View the AI-generated summaries below.</CardDescription>
          </CardHeader>
          <CardContent className="relative flex-1">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-b-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">Generating summaries...</p>
              </div>
            )}
            {!isLoading && summary ? (
              <Tabs defaultValue="text" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
                  <TabsTrigger value="text"><Text className="mr-1 h-4 w-4" /> Text</TabsTrigger>
                  <TabsTrigger value="audio"><AudioLines className="mr-1 h-4 w-4" /> Audio Script</TabsTrigger>
                  <TabsTrigger value="mindmap"><BrainCircuit className="mr-1 h-4 w-4" /> Mind Map</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-2 p-4 border rounded-md bg-muted/30 flex-1 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                  <h3 className="font-semibold mb-2 text-base sticky top-0 bg-muted/30 py-1 -mt-4 -mx-4 px-4 border-b">Text Summary</h3>
                   <p className="whitespace-pre-wrap mt-4">{summary.textSummary}</p>
                </TabsContent>
                <TabsContent value="audio" className="mt-2 p-4 border rounded-md bg-muted/30 flex-1 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                   <h3 className="font-semibold mb-2 text-base sticky top-0 bg-muted/30 py-1 -mt-4 -mx-4 px-4 border-b">Audio Summary (Script)</h3>
                      <>
                       <p className="whitespace-pre-wrap mt-4">{summary.audioSummary}</p>
                       <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                           (This is a script suitable for text-to-speech tools.)
                       </p>
                       </>
                 </TabsContent>
                <TabsContent value="mindmap" className="mt-2 p-4 border rounded-md bg-muted/30 flex-1 overflow-y-auto">
                  <h3 className="font-semibold mb-2 text-base sticky top-0 bg-muted/30 py-1 -mt-4 -mx-4 px-4 border-b">Mind Map (Markdown)</h3>
                     <>
                       <pre className="text-sm whitespace-pre-wrap font-mono bg-background p-3 rounded-md border mt-4">{summary.mindMap}</pre>
                       <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">Mind map structure in Markdown format.</p>
                     </>
                </TabsContent>
              </Tabs>
            ) : (
               !isLoading && <p className="text-muted-foreground text-center flex items-center justify-center h-full">Upload a file and click "Generate Summaries" to see the results here.</p>
            )}
          </CardContent>
           {summary && (
               <CardFooter className="pt-4 border-t flex justify-end flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={handleClear} disabled={isLoading}>Clear Results</Button>
               </CardFooter>
           )}
        </Card>
      </div>
    </div>
  );
}

    