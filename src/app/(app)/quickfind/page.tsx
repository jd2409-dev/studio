'use client';

import { useState, type ChangeEvent, type FormEvent, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Search, FileText as FileTextIcon, AlertTriangle, CheckCircle, XCircle, Inbox } from 'lucide-react';
import { findInDocument } from './actions';
import type { QuickFindOutput } from '@/ai/flows/quickfind-flow';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_FILE_TYPE = 'application/pdf';

export default function QuickFindPage() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState('');
  const [results, setResults] = useState<QuickFindOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Loading state for the search process
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setFile(null);
    setResults(null);

    if (selectedFile) {
      if (selectedFile.type !== ALLOWED_FILE_TYPE) {
        toast({
          title: "Invalid File Type",
          description: `Please select a PDF file. Type detected: ${selectedFile.type}`,
          variant: "destructive",
        });
        if (event.target) event.target.value = '';
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        toast({
          title: "File Too Large",
          description: `PDF file must be smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
          variant: "destructive",
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
      toast({ title: "Authentication Required", description: "Please log in.", variant = "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "Input Required", description: "Please select a PDF file.", variant = "destructive" });
      return;
    }
    if (!question.trim()) {
        toast({ title: "Input Required", description: "Please enter a question to search for.", variant = "destructive" });
        return;
    }

    setIsLoading(true); // Start loading indicator *before* async operation
    setResults(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const fileDataUri = reader.result as string;
      if (!fileDataUri || !fileDataUri.startsWith(`data:${ALLOWED_FILE_TYPE};base64,`)) {
        toast({ title: "File Read Error", description: "Failed to read the PDF file.", variant = "destructive" });
        setIsLoading(false);
        return;
      }

      try {
        const input = { fileDataUri, question: question.trim() };
        console.log("Sending PDF and question to QuickFind flow...");
        const searchResult = await findInDocument(input); // Call Server Action
        console.log("QuickFind results received:", searchResult);

        if (searchResult.status === 'success' && searchResult.results && searchResult.results.length > 0) {
             toast({ title: "Success", description: "Found potential answers in the document." });
        } else if (searchResult.status === 'not_found') {
             toast({ title: "Not Found", description: "Could not find a relevant answer in the document.", variant:"default"});
        } else if (searchResult.status === 'error') {
            toast({ title: "Search Error", description: searchResult.errorMessage || "An error occurred during the search.", variant = "destructive" });
        } else {
            toast({ title: "Search Complete", description: "No specific answer snippets found, but the search completed.", variant:"default"});
        }

        setResults(searchResult);
      } catch (error: any) {
        console.error("Error in QuickFind:", error);
         let errorDesc = "Failed to perform search. Please try again.";
         if (error instanceof Error) {
            if (error.message.startsWith("QuickFind Error:")) {
                 errorDesc = error.message.replace("QuickFind Error:", "").trim();
            } else if (error.message.includes("blocked")) {
                 errorDesc = "Search was blocked, possibly due to content safety filters.";
            } else if (error.message.includes("format")) {
                 errorDesc = "The AI returned results in an unexpected format.";
            } else {
                errorDesc = error.message;
            }
         }
        toast({ title: "Error Searching Document", description: errorDesc, variant = "destructive" });
        setResults({ status: 'error', errorMessage: errorDesc, results: [] });
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
    setQuestion('');
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Search className="text-primary h-7 w-7"/> QuickFind Document Search
      </h1>
      <p className="text-muted-foreground mb-6 max-w-2xl">
        Upload a textbook PDF (max {MAX_FILE_SIZE / 1024 / 1024}MB) and ask a question. The AI will search the document for relevant answers.
      </p>

      {/* Input Section */}
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl">Search Document</CardTitle>
          <CardDescription>Upload a PDF and enter your question.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="textbook-pdf" className="font-semibold">1. Upload PDF File</Label>
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
               {file && (
                 <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                     <FileTextIcon className="h-4 w-4 flex-shrink-0 text-primary"/>
                     <span className="truncate font-medium text-foreground" title={file.name}>{file.name}</span>
                     <span className="ml-auto flex-shrink-0">({ (file.size / 1024 / 1024).toFixed(2)} MB)</span>
                 </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="search-question" className="font-semibold">2. Enter Your Question</Label>
              <Textarea
                id="search-question"
                placeholder="e.g., What is the formula for photosynthesis?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                disabled={isLoading || authLoading}
                required
                className="shadow-sm"
              />
            </div>
            {!user && !authLoading && (
               <Alert variant = "destructive">
                  <AlertTriangle className="h-4 w-4" />
                   <AlertTitle>Login Required</AlertTitle>
                  <AlertDescription>Please log in to use QuickFind.</AlertDescription>
               </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
                type="submit"
                disabled={isLoading || !file || !question.trim() || authLoading || !user} // Comprehensive disable check
                className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Find Answer
                </>
              )}
            </Button>
             {(file || question || results) && (
               <Button variant="ghost" type="button" onClick={handleClear} disabled={isLoading} className="text-xs">
                   Clear All
               </Button>
             )}
          </CardFooter>
        </form>
      </Card>

      {/* Results Section */}
       {isLoading && ( // Show loading card specifically when searching
          <Card className="shadow-lg rounded-lg min-h-[200px]">
             <CardContent className="flex flex-col items-center justify-center h-full p-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Searching document for "{question.substring(0, 50)}{question.length > 50 ? '...' : ''}"...</p>
                <p className="text-xs text-muted-foreground mt-1">(This may take a few moments)</p>
             </CardContent>
          </Card>
       )}

       {results && !isLoading && ( // Only show results card if not loading
          <Card className="shadow-lg rounded-lg">
             <CardHeader>
                <CardTitle className="text-xl">Search Results</CardTitle>
                <CardDescription>
                    {results.status === 'success' && results.results.length > 0 && `Found ${results.results.length} potential answer(s) for your question.`}
                    {results.status === 'not_found' && "Could not find a relevant answer in the document."}
                    {results.status === 'error' && `An error occurred: ${results.errorMessage || 'Unknown error'}`}
                    {results.status === 'success' && results.results.length === 0 && "Search complete, but no specific snippets found."}
                </CardDescription>
             </CardHeader>
             <CardContent>
                {results.results && results.results.length > 0 ? (
                   <div className="space-y-4">
                      {results.results.map((result, index) => (
                         <div key={index} className="p-4 border rounded-md bg-muted/30">
                            <p className="text-sm font-medium mb-1">
                               {result.pageNumber ? `Page ${result.pageNumber}:` : 'Relevant Snippet:'}
                               {result.relevanceScore && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                     Relevance: {Math.round(result.relevanceScore * 100)}%
                                  </Badge>
                               )}
                            </p>
                            <blockquote className="text-sm border-l-2 border-primary pl-3 italic text-muted-foreground">
                               "{result.snippet}"
                            </blockquote>
                         </div>
                      ))}
                   </div>
                ) : results.status !== 'error' ? (
                   <div className="text-center text-muted-foreground py-10">
                     <Inbox className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                     {results.status === 'not_found'
                       ? "The AI couldn't find a direct answer to your question in the document."
                       : "No relevant snippets were extracted, but the search finished."}
                     <p className="text-xs mt-1">Try rephrasing your question or using a different document section.</p>
                   </div>
                ) : (
                     <Alert variant = "destructive">
                        <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Search Failed</AlertTitle>
                         <AlertDescription>{results.errorMessage || 'An unexpected error occurred during the search.'}</AlertDescription>
                     </Alert>
                )}
             </CardContent>
          </Card>
       )}
    </div>
  );
}

    