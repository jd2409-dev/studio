
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart, FileText, Calendar, AlertTriangle, Activity, Target, Clock, BrainCircuit, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized, persistenceEnabled } from '@/lib/firebase/config'; // Import persistenceEnabled flag
import { doc, getDoc, setDoc, getDocFromCache, getDocFromServer } from 'firebase/firestore'; // Import Firestore getDoc variants
import type { UserProgress, SubjectMastery, HomeworkAssignment, ExamSchedule, StudyRecommendation } from '@/types/user'; // Import types


export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter(); // Initialize useRouter
  const { user, loading: authLoading } = useAuth();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [userName, setUserName] = useState<string>('Student');
  const [dataFetchSource, setDataFetchSource] = useState<'cache' | 'server' | 'default' | 'error'>('server'); // Track data source

   // Default placeholder data
   const defaultProgress: UserProgress = {
        uid: user?.uid || 'default', // Assign a default UID or the user's UID
        subjectMastery: [
            { subjectId: 'math', subjectName: 'Mathematics', progress: 0, lastUpdated: new Date().toISOString() },
            { subjectId: 'physics', subjectName: 'Physics', progress: 0, lastUpdated: new Date().toISOString() },
            { subjectId: 'chemistry', subjectName: 'Chemistry', progress: 0, lastUpdated: new Date().toISOString() },
            { subjectId: 'biology', subjectName: 'Biology', progress: 0, lastUpdated: new Date().toISOString() },
        ],
        upcomingHomework: [],
        upcomingExams: [],
        studyRecommendations: [],
        lastUpdated: new Date().toISOString(), // Add lastUpdated for the main progress object
   };

  // Fetch user progress data and name from Firestore
  useEffect(() => {
    if (user) {
      setIsLoadingData(true);
       ensureFirebaseInitialized(); // Ensure Firebase is ready

      const progressDocRef = doc(db!, 'userProgress', user.uid);
      const userDocRef = doc(db!, 'users', user.uid); // For user name

      const fetchData = async () => {
        try {
          // Fetch user name (can often come from cache first)
          try {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists() && userSnap.data().name) {
                 setUserName(userSnap.data().name);
            } else if (user.displayName) {
                 setUserName(user.displayName); // Fallback to auth display name
            }
          } catch (userNameError) {
             console.warn("Could not fetch user name:", userNameError);
             // Use fallback even on error
             if (user.displayName) setUserName(user.displayName);
          }


          // Fetch user progress - Firestore handles offline persistence automatically
          // It first tries cache, then server. We can check metadata for source.
          const progressSnap = await getDoc(progressDocRef);

          if (progressSnap.exists()) {
            // Ensure the fetched data conforms to the UserProgress structure
            const fetchedData = progressSnap.data();
            // Basic validation: Check if core properties exist and have the correct types (example)
             if (fetchedData && typeof fetchedData === 'object' && Array.isArray(fetchedData.subjectMastery)) {
                const validatedProgress: UserProgress = {
                    uid: user.uid,
                    subjectMastery: (fetchedData.subjectMastery || []).map((sm: any): SubjectMastery => ({ // Add basic type checking/defaults inside map
                        subjectId: sm?.subjectId || 'unknown',
                        subjectName: sm?.subjectName || 'Unknown Subject',
                        progress: typeof sm?.progress === 'number' ? sm.progress : 0,
                        lastUpdated: sm?.lastUpdated || new Date().toISOString(),
                    })),
                     upcomingHomework: (fetchedData.upcomingHomework || []).map((hw: any): HomeworkAssignment => ({
                        id: hw?.id || `hw-${Date.now()}-${Math.random()}`,
                        subjectId: hw?.subjectId || 'unknown',
                        subjectName: hw?.subjectName || 'Unknown Subject',
                        title: hw?.title || 'Untitled Homework',
                        dueDate: hw?.dueDate || new Date().toISOString(),
                        completed: typeof hw?.completed === 'boolean' ? hw.completed : false,
                    })),
                    upcomingExams: (fetchedData.upcomingExams || []).map((ex: any): ExamSchedule => ({
                        id: ex?.id || `ex-${Date.now()}-${Math.random()}`,
                        subjectId: ex?.subjectId || 'unknown',
                        subjectName: ex?.subjectName || 'Unknown Subject',
                        title: ex?.title || 'Untitled Exam',
                         date: ex?.date || new Date().toISOString(),
                    })),
                     studyRecommendations: (fetchedData.studyRecommendations || []).map((rec: any): StudyRecommendation => ({
                        id: rec?.id || `rec-${Date.now()}-${Math.random()}`,
                        type: rec?.type || 'topic_review',
                        subjectId: rec?.subjectId || 'unknown',
                        subjectName: rec?.subjectName || 'Unknown Subject',
                        title: rec?.title || 'Recommendation',
                        reason: rec?.reason || 'AI generated recommendation',
                        priority: rec?.priority || 'medium',
                        generatedDate: rec?.generatedDate || new Date().toISOString(),
                    })),
                    lastUpdated: fetchedData.lastUpdated || defaultProgress.lastUpdated,
                };
                setUserProgress(validatedProgress);
                setDataFetchSource(progressSnap.metadata.fromCache ? 'cache' : 'server');
                console.log(`Dashboard data fetched from ${progressSnap.metadata.fromCache ? 'cache' : 'server'}.`);
             } else {
                 console.warn("Fetched userProgress data has invalid structure. Using default.", fetchedData);
                 // Initialize with default data if structure is wrong
                 const initialProgress = { ...defaultProgress, uid: user.uid }; // Ensure UID is set
                 await setDoc(progressDocRef, initialProgress);
                 setUserProgress(initialProgress);
                 setDataFetchSource('default');
             }
          } else {
            // Initialize with default data if no progress exists
             console.log("No progress data found for user:", user.uid, ". Initializing default progress in Firestore.");
             const initialProgress = { ...defaultProgress, uid: user.uid }; // Ensure UID is set
            await setDoc(progressDocRef, initialProgress);
            setUserProgress(initialProgress);
             setDataFetchSource('default');
          }

        } catch (error: any) {
          console.error("Error fetching dashboard data:", error);
           // Differentiate between error types for better feedback
           let errorTitle = "Error Loading Data";
           let errorDesc = "Could not load dashboard data. Please try again later.";

           if (error.code === 'unavailable') {
               errorTitle = "Offline";
               errorDesc = "Could not reach server. Displaying cached or default data if available.";
               console.warn("Firestore data fetch failed: Network unavailable. Persistence might be inactive or data not cached.");
               setDataFetchSource('error'); // Mark as error, but might show cached data
            } else if (error.code === 'permission-denied') {
                errorTitle = "Permissions Error";
                errorDesc = "Could not load dashboard data due to insufficient permissions. Ensure Firestore rules are deployed correctly (see README).";
                console.error("Firestore permission denied error occurred. This usually means the Firestore security rules defined in 'firestore.rules' have not been deployed, or they are incorrect. Please ensure the rules are deployed using the command: `firebase deploy --only firestore:rules`");
                setDataFetchSource('error');
           } else {
                // Generic error
                setDataFetchSource('error');
           }

            toast({ title: errorTitle, description: errorDesc, variant: "destructive" });
            // Always attempt to set fallback data on error to prevent crashes
            const fallbackProgress = { ...defaultProgress, uid: user.uid };
            setUserProgress(fallbackProgress);

        } finally {
          setIsLoadingData(false);
        }
      };
      fetchData();
    } else if (!authLoading) {
       // Handle case where user is null after auth check (should be redirected)
       setIsLoadingData(false);
    }
  }, [user, authLoading, toast]); // Add toast to dependency array

  const handlePlaceholderClick = (featureName: string) => {
     toast({
       title: "Feature Coming Soon",
       description: `${featureName} functionality is not yet implemented.`,
       variant: "default"
     });
   };

   const navigateTo = (path: string) => {
     router.push(path);
   };

   // Loading state for the whole dashboard
   if (isLoadingData || authLoading) {
     return (
       <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
         <Loader2 className="h-16 w-16 animate-spin text-primary" />
       </div>
     );
   }

   // Ensure userProgress is not null before rendering components that depend on it
   // Use optional chaining and provide default values to prevent runtime errors if userProgress is null
   const {
       subjectMastery = defaultProgress.subjectMastery,
       upcomingHomework = defaultProgress.upcomingHomework,
       upcomingExams = defaultProgress.upcomingExams,
       studyRecommendations = defaultProgress.studyRecommendations
   } = userProgress || {};


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Welcome Card */}
      <Card className="lg:col-span-3">
        <CardHeader>
           <div className="flex justify-between items-center">
             <div>
               <CardTitle className="text-2xl font-bold">Welcome back, {userName}!</CardTitle>
               <CardDescription>Here's your personalized study dashboard.</CardDescription>
             </div>
               {/* Display data fetch status (optional) */}
               {dataFetchSource === 'cache' && <span className="text-xs text-muted-foreground">(Data from Offline Cache)</span>}
               {dataFetchSource === 'error' && <span className="text-xs text-destructive">(Error Loading)</span>}
            </div>
        </CardHeader>
        <CardContent>
          <p>Stay organized and focused on your academic goals. Let's make today productive!</p>
        </CardContent>
       <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={() => navigateTo('/upload-textbook')}>
            <FileText className="mr-2 h-4 w-4" /> Upload Textbook
          </Button>
          <Button variant="secondary" onClick={() => navigateTo('/quiz')}>
            <Activity className="mr-2 h-4 w-4" /> Generate Quiz
          </Button>
         {/* Changed from handlePlaceholderClick to navigateTo */}
         <Button variant="outline" onClick={() => navigateTo('/ai-tutor')}>
            <BrainCircuit className="mr-2 h-4 w-4"/> AI Tutor Session
          </Button>
       </CardFooter>
      </Card>

      {/* Upcoming Homework */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="text-secondary" /> Upcoming Homework</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[150px]">
          {upcomingHomework && upcomingHomework.length > 0 ? (
            upcomingHomework.map((hw) => (
              <div key={hw.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{hw.title}</p>
                  <p className="text-sm text-muted-foreground">{hw.subjectName}</p>
                </div>
                {/* Format dueDate before displaying */}
                <span className="text-sm font-semibold text-accent">
                  {hw.dueDate ? new Date(hw.dueDate as string).toLocaleDateString() : 'No due date'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center pt-8">No upcoming homework!</p>
          )}
        </CardContent>
      </Card>

       {/* Upcoming Exams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="text-secondary" /> Upcoming Exams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[150px]">
          {upcomingExams && upcomingExams.length > 0 ? (
            upcomingExams.map((exam) => (
              <div key={exam.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{exam.title}</p>
                  <p className="text-sm text-muted-foreground">{exam.subjectName}</p>
                </div>
                <span className="text-sm font-semibold text-accent">
                    {exam.date ? new Date(exam.date as string).toLocaleDateString() : 'No date'}
                </span>
              </div>
            ))
          ) : (
             <p className="text-muted-foreground text-center pt-8">No upcoming exams scheduled.</p>
          )}
        </CardContent>
      </Card>

       {/* Subject Mastery */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="text-secondary" /> Subject Mastery</CardTitle>
          <CardDescription>Your progress in different subjects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjectMastery && subjectMastery.length > 0 ? (
            subjectMastery.map((subject) => (
              <div key={subject.subjectId}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{subject.subjectName}</span>
                  <span className="text-sm font-medium text-primary">{subject.progress}%</span>
                </div>
                <Progress value={subject.progress} className="h-2" />
              </div>
            ))
          ) : (
             <p className="text-muted-foreground text-center pt-8">No subject progress tracked yet.</p>
          )}
        </CardContent>
      </Card>

       {/* Quick Study Recommendations */}
      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-secondary" /> Quick Study Recommendations</CardTitle>
          <CardDescription>AI-powered suggestions for your next study session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {studyRecommendations && studyRecommendations.length > 0 ? (
             studyRecommendations.slice(0, 3).map((rec) => ( // Show top 3 recommendations
              <div key={rec.id} className="p-3 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                 <p className="font-medium text-sm">{rec.title}</p>
                 <p className="text-xs text-muted-foreground">{rec.reason} - <span className="capitalize">{rec.priority} priority</span></p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center pt-8">No study recommendations available right now.</p>
          )}
        </CardContent>
         <CardFooter>
            <Button variant="outline" size="sm" onClick={() => handlePlaceholderClick('View All Recommendations')}>
                View All Recommendations
            </Button>
        </CardFooter>
      </Card>


    </div>
  );
}
