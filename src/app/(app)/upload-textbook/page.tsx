'use client';

import { useState, type ChangeEvent, type FormEvent, useEffect, useRef } from 'react'; // Added useRef
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, CheckCircle, AlertCircle, WifiOff, FileText } from 'lucide-react'; // Added FileText
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { storage, ensureFirebaseInitialized, persistenceEnabled } from '@/lib/firebase/config'; // Import persistenceEnabled (though not directly used here, good practice)
import { ref, uploadBytesResumable, getDownloadURL, type UploadTaskSnapshot } from "firebase/storage"; // Import storage functions
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'; // Import Alert components
import { cn } from '@/lib/utils'; // Import cn for conditional classes

// Define allowed file types for validation
const ALLOWED_UPLOAD_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB limit for uploads

export default function UploadTextbookPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Use this for upload process loading
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [isOnline, setIsOnline] = useState(true); // Track online status
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth(); // Get user for organizing uploads
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref to reset file input


  // Monitor online status
  useEffect(() => {
    // Set initial status
     if (typeof navigator !== 'undefined') {
        setIsOnline(navigator.onLine);
     }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setFile(null); // Reset file state first
    setUploadStatus('idle');
    setUploadProgress(null);

    if (selectedFile) {
      // Validate file type
      if (!ALLOWED_UPLOAD_TYPES.includes(selectedFile.type)) {
          toast({
              title: "Invalid File Type",
              description: `Please upload a PDF, DOC, DOCX, or TXT file. Detected: ${selectedFile.type || 'unknown'}`,
              variant: "destructive",
          });
          if (event.target) event.target.value = ''; // Clear the input
          return;
      }
       // Validate file size
       if (selectedFile.size > MAX_UPLOAD_SIZE) {
           toast({
               title: "File Too Large",
               description: `File must be smaller than ${MAX_UPLOAD_SIZE / 1024 / 1024}MB.`,
               variant: "destructive",
           });
           if (event.target) event.target.value = ''; // Clear the input
           return;
       }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isOnline) {
        toast({ title: "Offline", description: "Cannot upload files while offline.", variant: "destructive" });
        return;
    }
     if (!user) {
        toast({ title: "Error", description: "You must be logged in to upload.", variant: "destructive" });
        return;
    }
    if (!file) {
      toast({ title: "Error", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    setIsLoading(true); // Set loading state for the entire upload process
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
        ensureFirebaseInitialized(); // Check Firebase init

        // Construct a more organized path
        const filePath = `user_uploads/${user.uid}/textbooks/${Date.now()}_${file.name}`; // Add timestamp for uniqueness
        const storageRef = ref(storage!, filePath);
        console.log(`Attempting to upload to: ${filePath}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot: UploadTaskSnapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
                console.log('Upload is ' + progress + '% done');
            },
            (error) => {
                 console.error("Upload Error:", error.code, error.message, error);
                 let errorMessage = "An unknown error occurred during upload.";
                 // More specific error handling based on Firebase Storage error codes
                 switch (error.code) {
                     case 'storage/unauthorized':
                        errorMessage = "Permission denied. Check your Firebase Storage security rules to allow uploads to this path.";
                        console.error("Check Storage Rules: Ensure rules allow write access for authenticated users to `user_uploads/{userId}/textbooks/{fileName}` and `quickfind_uploads/{userId}/{fileName}`. Command: `firebase deploy --only storage`");
                        break;
                     case 'storage/canceled':
                        errorMessage = "Upload cancelled.";
                        // No need for error toast if intentionally cancelled, reset state silently or with info toast
                         console.log("Upload cancelled by user or system.");
                         setUploadStatus('idle'); setIsLoading(false); setUploadProgress(null); setFile(null);
                         if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input
                         return; // Stop further processing
                     case 'storage/unknown': errorMessage = "Unknown storage error occurred."; break;
                     case 'storage/object-not-found': errorMessage = "File path issue (internal error)."; break; // Should not happen on upload
                     case 'storage/bucket-not-found': errorMessage = "Storage bucket not found. Check Firebase project config."; break;
                     case 'storage/project-not-found': errorMessage = "Firebase project not found. Check config."; break;
                     case 'storage/quota-exceeded': errorMessage = "Storage space quota exceeded."; break;
                     case 'storage/unauthenticated': errorMessage = "User is not authenticated. Please log in."; break;
                     case 'storage/retry-limit-exceeded': errorMessage = "Network error during upload. Please check connection and try again."; break;
                     default: errorMessage = `Upload failed: ${error.message}`; // Default to Firebase message
                 }
                toast({ title: "Upload Failed", description: errorMessage, variant: "destructive" });
                setUploadStatus('error'); setIsLoading(false);
            },
            async () => {
                // Upload completed successfully
                console.log('Upload successful');
                setUploadStatus('success'); setIsLoading(false); setUploadProgress(100);
                 try {
                     const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                     console.log('File available at', downloadURL);
                     // TODO: Implement logic to save this downloadURL to Firestore
                     // This might involve updating the 'userProgress' or a separate 'userFiles' collection.
                     // Example (requires appropriate Firestore structure):
                     // const userDocRef = doc(db!, 'users', user.uid);
                     // await updateDoc(userDocRef, {
                     //     uploadedTextbooks: arrayUnion({ name: file.name, url: downloadURL, uploadedAt: Timestamp.now() })
                     // });
                     toast({ title: "Upload Complete", description: `${file.name} uploaded successfully.` });
                      // Reset form after a short delay
                      setTimeout(() => {
                         setFile(null);
                         setUploadStatus('idle');
                         setUploadProgress(null);
                         if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input
                      }, 2500); // 2.5 seconds delay
                 } catch (urlError: any) {
                      console.error("Error getting download URL:", urlError);
                      toast({ title: "Upload Warning", description: "File uploaded, but failed to get download URL. It might be processing.", variant: "default" });
                      setUploadStatus('success'); // Still success, but URL retrieval failed
                 }
            }
        );

    } catch (error: any) {
        console.error("Upload Initialization Error:", error);
         let errorMessage = "Could not start upload. Please try again.";
         if (error.message?.includes("Firebase is not initialized")) {
             errorMessage = "Application configuration error. Cannot access storage service.";
         } else if (error.message?.includes("storage is null")) {
             errorMessage = "Storage service not available. Check Firebase configuration.";
         }
        toast({ title: "Upload Error", description: errorMessage, variant: "destructive" });
        setUploadStatus('error'); setIsLoading(false); setUploadProgress(null);
    }
  };

   // Show loader if auth is still loading
   if (authLoading) {
      return (
         <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
           <Loader2 className="h-16 w-16 animate-spin text-primary" />
         </div>
      );
   }


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Upload Textbook Content</h1>
      <p className="text-muted-foreground mb-8 max-w-xl">
        Upload chapters or sections (PDF, DOCX, TXT). Files are stored securely and can be used later for AI features like summarization or explanation. Max size: {MAX_UPLOAD_SIZE / 1024 / 1024}MB.
      </p>

      {!isOnline && (
           <Alert variant="destructive" className="mb-6 max-w-lg mx-auto shadow">
              <WifiOff className="h-4 w-4" />
             <AlertTitle>You are currently offline</AlertTitle>
             <AlertDescription>
               File uploading requires an active internet connection. Please reconnect.
             </AlertDescription>
           </Alert>
      )}

      <Card className="max-w-lg mx-auto shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl">Select File to Upload</CardTitle>
           <CardDescription>
               Choose a document file ({ALLOWED_UPLOAD_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')}) from your device.
           </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="textbook-upload" className={cn("font-semibold", !isOnline || isLoading || authLoading || !user ? 'text-muted-foreground' : '')}>Textbook File</Label>
              <Input
                ref={fileInputRef}
                id="textbook-upload"
                type="file"
                accept={ALLOWED_UPLOAD_TYPES.join(',')} // Match validation
                onChange={handleFileChange}
                disabled={isLoading || !isOnline || authLoading || !user} // Disable if loading, offline, or not logged in
                required
                className="cursor-pointer file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:file:bg-muted disabled:file:text-muted-foreground"
              />
               {file && (
                   <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                       <FileText className="h-4 w-4 flex-shrink-0 text-primary"/>
                       <span className="truncate font-medium text-foreground" title={file.name}>{file.name}</span>
                       <span className="ml-auto flex-shrink-0">({ (file.size / 1024 / 1024).toFixed(2)} MB)</span>
                   </div>
                )}
            </div>
             {uploadStatus === 'uploading' && uploadProgress !== null && (
                <div className="space-y-1 pt-2">
                    <Progress value={uploadProgress} className="w-full h-2" />
                    <p className="text-xs text-center text-muted-foreground">{Math.round(uploadProgress)}% Uploaded</p>
                </div>
             )}
             {uploadStatus === 'success' && (
                <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                     <AlertDescription className="text-green-700 dark:text-green-300 font-medium">
                         Upload Successful! File is saved.
                     </AlertDescription>
                 </Alert>
             )}
              {uploadStatus === 'error' && (
                 <Alert variant="destructive">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Upload Failed</AlertTitle>
                     <AlertDescription>
                         Please check the error message in the console or toast notifications and try again.
                     </AlertDescription>
                 </Alert>
              )}
               {!user && !authLoading && ( // Show login required message if not logged in
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Login Required</AlertTitle>
                    <AlertDescription>Please log in to upload files.</AlertDescription>
                 </Alert>
               )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={isLoading || !file || uploadStatus === 'success' || !isOnline || authLoading || !user} // Comprehensive disable check
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
              ) : uploadStatus === 'success' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" /> Uploaded
                  </>
               ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Upload File
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

       {/* Optionally list uploaded files here later by fetching from Firestore */}
       {/*
       <Card className="mt-8">
         <CardHeader><CardTitle>Uploaded Files</CardTitle></CardHeader>
         <CardContent>
           <p className="text-muted-foreground">Your uploaded textbooks will appear here.</p>
           {/* List items would go here *\/}
         </CardContent>
       </Card>
       */}

    </div>
  );
}
