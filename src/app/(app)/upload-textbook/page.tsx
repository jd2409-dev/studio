
'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { storage, ensureFirebaseInitialized } from '@/lib/firebase/config'; // Import storage
import { ref, uploadBytesResumable, getDownloadURL, type UploadTaskSnapshot } from "firebase/storage"; // Import storage functions

export default function UploadTextbookPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const { toast } = useToast();
  const { user } = useAuth(); // Get user for organizing uploads

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Basic validation (optional: add more checks like file size, type)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!allowedTypes.includes(selectedFile.type)) {
          toast({
              title: "Invalid File Type",
              description: "Please upload a PDF, DOC, DOCX, or TXT file.",
              variant: "destructive",
          });
          setFile(null);
          // Reset file input
          event.target.value = '';
          return;
      }
      setFile(selectedFile);
      setUploadStatus('idle'); // Reset status for new file
      setUploadProgress(null);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !user) {
      toast({
        title: "Error",
        description: !user ? "You must be logged in to upload." : "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
        ensureFirebaseInitialized(); // Check Firebase init

        // Create a storage reference (e.g., user_uploads/{userId}/{fileName})
        const storageRef = ref(storage!, `user_uploads/${user.uid}/textbooks/${Date.now()}_${file.name}`);

        const uploadTask = uploadBytesResumable(storageRef, file);

        // Listen for state changes, errors, and completion of the upload.
        uploadTask.on('state_changed',
            (snapshot: UploadTaskSnapshot) => {
            // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
            console.log('Upload is ' + progress + '% done');
            switch (snapshot.state) {
                case 'paused':
                console.log('Upload is paused');
                break;
                case 'running':
                console.log('Upload is running');
                break;
            }
            },
            (error) => {
            // Handle unsuccessful uploads
            console.error("Upload Error:", error);
             let errorMessage = "An unknown error occurred during upload.";
             switch (error.code) {
                 case 'storage/unauthorized':
                    errorMessage = "You do not have permission to upload files.";
                    break;
                 case 'storage/canceled':
                    errorMessage = "Upload cancelled.";
                     // Don't necessarily show destructive toast for cancellation
                    toast({ title: "Upload Cancelled", description: errorMessage });
                    setUploadStatus('idle');
                    setIsLoading(false);
                    setUploadProgress(null);
                    return; // Exit early
                 case 'storage/unknown':
                    errorMessage = "An unknown storage error occurred.";
                    break;
                 case 'storage/object-not-found':
                     errorMessage = "File not found (this shouldn't happen during upload).";
                     break;
                 case 'storage/bucket-not-found':
                      errorMessage = "Storage bucket not configured correctly.";
                      break;
                  case 'storage/project-not-found':
                      errorMessage = "Firebase project not found.";
                      break;
                  case 'storage/quota-exceeded':
                       errorMessage = "Storage quota exceeded. Cannot upload file.";
                       break;
                  case 'storage/unauthenticated':
                      errorMessage = "User is not authenticated. Please log in again.";
                      break;
                  case 'storage/retry-limit-exceeded':
                      errorMessage = "Upload failed after multiple retries. Check network connection.";
                      break;
                 // Add other specific storage error codes as needed
             }
            toast({
                title: "Upload Failed",
                description: errorMessage,
                variant: "destructive",
            });
            setUploadStatus('error');
            setIsLoading(false);
            // Don't clear progress on error, let user see where it failed
            },
            async () => {
            // Handle successful uploads on complete
            console.log('Upload successful');
            setUploadStatus('success');
            setIsLoading(false);
            setUploadProgress(100); // Ensure it hits 100%
            // Optionally, get the download URL and do something with it (e.g., save to Firestore)
             try {
                 const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                 console.log('File available at', downloadURL);
                 // TODO: Save the downloadURL to Firestore user data if needed
                 // Example: await updateDoc(doc(db, 'users', user.uid), { lastUploadedTextbookUrl: downloadURL });
                  toast({
                    title: "Upload Complete",
                    description: `${file.name} uploaded successfully.`,
                  });
                  // Consider clearing the file input after a short delay for better UX
                  setTimeout(() => {
                     setFile(null);
                     setUploadStatus('idle');
                     setUploadProgress(null);
                     const fileInput = document.getElementById('textbook-upload') as HTMLInputElement;
                     if (fileInput) {
                         fileInput.value = '';
                     }
                  }, 2000);


             } catch (urlError: any) {
                  console.error("Error getting download URL:", urlError);
                  toast({
                     title: "Upload Complete (URL Error)",
                     description: "File uploaded, but failed to get download URL.",
                     variant: "destructive",
                  });
             }

            }
        );

    } catch (error: any) {
        console.error("Upload Initialization Error:", error);
         let errorMessage = "Could not start upload. Please try again.";
         if (error.message.includes("Firebase is not initialized")) {
             errorMessage = "Application configuration error. Cannot access storage.";
         } else if (error.message.includes("storage/invalid-argument")) {
             errorMessage = "Invalid file or storage path.";
         }
        toast({
            title: "Upload Error",
            description: errorMessage,
            variant: "destructive",
        });
        setUploadStatus('error');
        setIsLoading(false);
        setUploadProgress(null);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Upload Textbook Chapter</h1>
      <p className="text-muted-foreground mb-8">
        Upload chapters or sections of your textbooks (PDF, DOCX, TXT, etc.). These can be used later for AI features.
      </p>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Select a document file (PDF, DOCX, TXT) to upload to your personal storage.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="textbook-upload">Textbook File</Label>
              <Input
                id="textbook-upload"
                type="file"
                accept=".pdf,.doc,.docx,text/plain,.txt" // Match validation
                onChange={handleFileChange}
                disabled={isLoading}
                required
              />
               {file && <p className="text-sm text-muted-foreground mt-1">Selected: {file.name} ({ (file.size / 1024 / 1024).toFixed(2)} MB)</p>}
            </div>
             {uploadStatus === 'uploading' && uploadProgress !== null && (
                <div className="space-y-2">
                    <Progress value={uploadProgress} className="w-full h-2" indicatorClassName="bg-secondary"/>
                    <p className="text-sm text-center text-muted-foreground">{Math.round(uploadProgress)}% Uploaded</p>
                </div>
             )}
             {uploadStatus === 'success' && (
                <div className="flex items-center justify-center text-green-600 dark:text-green-400 space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <p className="text-sm font-medium">Upload Successful!</p>
                </div>
             )}
              {uploadStatus === 'error' && (
                 <div className="flex items-center justify-center text-destructive space-x-2">
                     <AlertCircle className="h-5 w-5" />
                     <p className="text-sm font-medium">Upload Failed. Please try again.</p>
                 </div>
              )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !file || uploadStatus === 'success'} className="w-full">
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

       {/* Optional: List recently uploaded files or link to a file manager */}
       {/* <Card className="max-w-lg mx-auto mt-8">
           <CardHeader>
               <CardTitle>Uploaded Files</CardTitle>
           </CardHeader>
           <CardContent>
               <p className="text-sm text-muted-foreground">
                   Your uploaded textbooks will appear here. (Functionality not implemented yet)
               </p>
           </CardContent>
       </Card> */}
    </div>
  );
}
