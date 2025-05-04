
'use client';

import { useState, type ChangeEvent, type FormEvent, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, CheckCircle, AlertCircle, WifiOff } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { storage, ensureFirebaseInitialized, persistenceEnabled } from '@/lib/firebase/config'; // Import persistenceEnabled (though not directly used here, good practice)
import { ref, uploadBytesResumable, getDownloadURL, type UploadTaskSnapshot } from "firebase/storage"; // Import storage functions
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'; // Import Alert components

export default function UploadTextbookPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [isOnline, setIsOnline] = useState(true); // Track online status
  const { toast } = useToast();
  const { user } = useAuth(); // Get user for organizing uploads

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Check initial status
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!allowedTypes.includes(selectedFile.type)) {
          toast({
              title: "Invalid File Type",
              description: "Please upload a PDF, DOC, DOCX, or TXT file.",
              variant: "destructive",
          });
          setFile(null);
          event.target.value = '';
          return;
      }
      setFile(selectedFile);
      setUploadStatus('idle');
      setUploadProgress(null);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isOnline) {
        toast({
            title: "Offline",
            description: "Cannot upload files while offline. Please check your connection.",
            variant: "destructive",
        });
        return;
    }

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

        const storageRef = ref(storage!, `user_uploads/${user.uid}/textbooks/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot: UploadTaskSnapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
                console.log('Upload is ' + progress + '% done');
            },
            (error) => {
                 console.error("Upload Error:", error);
                 let errorMessage = "An unknown error occurred during upload.";
                 switch (error.code) {
                     case 'storage/unauthorized': errorMessage = "Permission denied."; break;
                     case 'storage/canceled':
                        errorMessage = "Upload cancelled.";
                        toast({ title: "Upload Cancelled", description: errorMessage });
                        setUploadStatus('idle'); setIsLoading(false); setUploadProgress(null); return;
                     case 'storage/unknown': errorMessage = "Unknown storage error."; break;
                     case 'storage/object-not-found': errorMessage = "File not found (internal error)."; break;
                     case 'storage/bucket-not-found': errorMessage = "Storage bucket not configured correctly."; break;
                     case 'storage/project-not-found': errorMessage = "Firebase project not found."; break;
                     case 'storage/quota-exceeded': errorMessage = "Storage quota exceeded."; break;
                     case 'storage/unauthenticated': errorMessage = "User not authenticated."; break;
                     case 'storage/retry-limit-exceeded': errorMessage = "Network error during upload. Please try again."; break;
                 }
                toast({ title: "Upload Failed", description: errorMessage, variant: "destructive" });
                setUploadStatus('error'); setIsLoading(false);
            },
            async () => {
                console.log('Upload successful');
                setUploadStatus('success'); setIsLoading(false); setUploadProgress(100);
                 try {
                     const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                     console.log('File available at', downloadURL);
                     // TODO: Save downloadURL to Firestore if needed
                     toast({ title: "Upload Complete", description: `${file.name} uploaded successfully.` });
                      setTimeout(() => {
                         setFile(null); setUploadStatus('idle'); setUploadProgress(null);
                         const fileInput = document.getElementById('textbook-upload') as HTMLInputElement;
                         if (fileInput) fileInput.value = '';
                      }, 2000);
                 } catch (urlError: any) {
                      console.error("Error getting download URL:", urlError);
                      toast({ title: "Upload Complete (URL Error)", description: "File uploaded, but failed to get download URL.", variant: "destructive" });
                      // Keep success status, but maybe indicate URL issue?
                 }
            }
        );

    } catch (error: any) {
        console.error("Upload Initialization Error:", error);
         let errorMessage = "Could not start upload. Please try again.";
         if (error.message?.includes("Firebase is not initialized")) {
             errorMessage = "Application configuration error. Cannot access storage.";
         }
        toast({ title: "Upload Error", description: errorMessage, variant: "destructive" });
        setUploadStatus('error'); setIsLoading(false); setUploadProgress(null);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Upload Textbook Chapter</h1>
      <p className="text-muted-foreground mb-8">
        Upload chapters or sections of your textbooks (PDF, DOCX, TXT, etc.). These can be used later for AI features.
      </p>

      {!isOnline && (
           <Alert variant="destructive" className="mb-6 max-w-lg mx-auto">
              <WifiOff className="h-4 w-4" />
             <AlertTitle>You are currently offline</AlertTitle>
             <AlertDescription>
               File uploading requires an active internet connection. Please reconnect to upload your textbook chapter.
             </AlertDescription>
           </Alert>
      )}

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
                disabled={isLoading || !isOnline} // Disable if loading or offline
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
            <Button
              type="submit"
              disabled={isLoading || !file || uploadStatus === 'success' || !isOnline} // Disable if loading, no file, success, or offline
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : !isOnline ? (
                 <>
                    <WifiOff className="mr-2 h-4 w-4" /> Offline
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

    </div>
  );
}
