'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function UploadTextbookPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    // Placeholder for actual upload logic
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate upload delay

    console.log("Uploading file:", file.name);
    // TODO: Implement actual file upload logic here (e.g., to Firebase Storage)

    setIsLoading(false);
    setFile(null); // Clear file input after simulated upload
     // Find the input element and reset its value
    const fileInput = document.getElementById('textbook-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
    toast({
      title: "Success",
      description: `${file.name} uploaded successfully (simulation).`,
    });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Upload Textbook Chapter</h1>
      <p className="text-muted-foreground mb-8">
        Upload chapters or sections of your textbooks (PDF, DOCX, etc.) to be used for generating summaries and quizzes.
      </p>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Select a document file for processing.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="textbook-upload">Textbook File</Label>
              <Input
                id="textbook-upload"
                type="file"
                accept=".pdf,.doc,.docx,text/plain" // Adjust accepted file types as needed
                onChange={handleFileChange}
                disabled={isLoading}
                required
              />
               {file && <p className="text-sm text-muted-foreground mt-1">Selected: {file.name}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !file} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Upload Chapter
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

       <Card className="max-w-lg mx-auto mt-8">
           <CardHeader>
               <CardTitle>Note</CardTitle>
           </CardHeader>
           <CardContent>
               <p className="text-sm text-muted-foreground">
                   Currently, this upload functionality is a placeholder. Uploaded files are not stored or processed.
                   For AI features like summarization and quiz generation, please use the respective pages by pasting content or uploading images directly where supported.
               </p>
           </CardContent>
       </Card>
    </div>
  );
}
