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
import { db, ensureFirebaseInitialized, firebaseInitializationError, persistenceEnabled } from '@/lib/firebase/config'; // Import persistenceEnabled flag
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Import Firestore getDoc variants
import type { UserProgress, SubjectMastery, HomeworkAssignment, ExamSchedule, StudyRecommendation } from '@/types/user'; // Import types
import { Alert, AlertDescription } from '@/components/ui/alert';


export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: authLoading, authError } = useAuth(); // Get authError as well
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true); // For dashboard-specific data
  const [userName, setUserName] = useState<string>('Student');
  const [dataFetchSource, setDataFetchSource] = useState<'cache' | 'server' | 'default' | 'error' | 'nodata'>('server');
  const [fetchError, setFetchError] = useState<string | null>(null); // Store specific fetch error message


   // Default placeholder data
   const defaultProgress: UserProgress = {
        uid: user?.uid || 'default_uid_placeholder', // Assign a default UID or the user's UID
        subjectMastery: [
            { subjectId: 'math', subjectName: 'Mathematics', progress: 0, lastUpdated: new Date().toISOString() },
            { subjectId: 'physics', subjectName: 'Physics', progress: 0, lastUpdated: new Date().toISOString() },
        ],
        upcomingHomework: [],
        upcomingExams: [],
        studyRecommendations: [],
        lastUpdated: new Date().toISOString(),
   };

  // Fetch user progress data and name from Firestore
  useEffect(() => {
    console.log("DashboardPage: useEffect triggered. AuthLoading:", authLoading, "User:", !!user, "AuthError:", !!authError, "FirebaseInitError:", !!firebaseInitializationError);

    // Abort if Firebase itself failed to initialize (handled by AuthProvider/Layout)
    if (firebaseInitializationError || authError) {
        console.log("DashboardPage: Aborting data fetch due to Firebase/Auth init error.");
        setIsLoadingData(false);
        setFetchError(firebaseInitializationError?.message || authError?.message || "Initialization or Authentication error.");
        setDataFetchSource('error');
        return;
    }

    // Only fetch data if auth is complete, user exists, and no init/auth errors
    if (!authLoading && user) {
      console.log("DashboardPage: Auth loaded, user exists. Starting data fetch for user:", user.uid);
      setIsLoadingData(true);
      setFetchError(null); // Reset previous errors

      const fetchData = async () => {
        try {
          ensureFirebaseInitialized(); // This will throw if services are not ready

          const progressDocRef = doc(db!, 'userProgress', user.uid);
          const userDocRef = doc(db!, 'users', user.uid);

          // Fetch user name
          try {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists() && userSnap.data()?.name) {
                 setUserName(userSnap.data()!.name);
            } else if (user.displayName) {
                 setUserName(user.displayName);
            } else {
                 setUserName('Student'); // Fallback if no name found
            }
          } catch (userNameError: any) {
             console.warn("DashboardPage: Could not fetch user name:", userNameError.message);
             setUserName(user.displayName || 'Student'); // Fallback
          }

          // Fetch user progress
          const progressSnap = await getDoc(progressDocRef);
          setDataFetchSource(progressSnap.metadata.fromCache ? 'cache' : 'server');

          if (progressSnap.exists()) {
            const fetchedData = progressSnap.data();
            // Basic validation
            if (fetchedData && typeof fetchedData === 'object' && Array.isArray(fetchedData.subjectMastery)) {
                const validatedProgress: UserProgress = {
                    uid: user.uid,
                    subjectMastery: (fetchedData.subjectMastery || []).map((sm: any): SubjectMastery => ({
                        subjectId: sm?.subjectId || `unknown-${Math.random()}`,
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
                console.log(`DashboardPage: Data fetched from ${progressSnap.metadata.fromCache ? 'cache' : 'server'}.`);
            } else {
                 console.warn("DashboardPage: Fetched userProgress data has invalid structure. Initializing with default.", fetchedData);
                 const initialProgress = { ...defaultProgress, uid: user.uid };
                 await setDoc(progressDocRef, initialProgress); // Attempt to save default
                 setUserProgress(initialProgress);
                 setDataFetchSource('default');
            }
          } else {
            console.log("DashboardPage: No progress data found for user:", user.uid, ". Initializing default progress in Firestore.");
            const initialProgress = { ...defaultProgress, uid: user.uid };
            await setDoc(progressDocRef, initialProgress); // Attempt to save default
            setUserProgress(initialProgress);
            setDataFetchSource('default');
          }

        } catch (error: any) {
          console.error("DashboardPage: Error fetching dashboard data:", error.code, error.message, error);
          let errorTitle = "Error Loading Data";
          let errorDesc = "Could not load dashboard data. Please try again later.";

          if (error.message?.includes("Firebase failed to initialize") || error.message?.includes("Firebase services are not available")) {
              errorTitle = "Application Error";
              errorDesc = "Core application services are not available. Please refresh or contact support.";
              setDataFetchSource('error');
          } else if (error.code === 'unavailable') {
              errorTitle = "Offline";
              errorDesc = "Could not reach server. Displaying cached or default data if available.";
              console.warn("DashboardPage: Firestore data fetch failed: Network unavailable.");
              // If data was fetched from cache before the error, keep source as cache
              if(dataFetchSource !== 'cache'){
                  setDataFetchSource('error'); // Set to error only if not already showing cached data
              }
          } else if (error.code === 'permission-denied') {
              errorTitle = "Permissions Error";
              errorDesc = "Could not load dashboard data due to insufficient permissions. Ensure Firestore rules are deployed correctly (see README).";
              console.error("Firestore permission denied error occurred. This usually means the Firestore security rules defined in 'firestore.rules' have not been deployed, or they are incorrect. Please ensure the rules are deployed using the command: `firebase deploy --only firestore:rules`");
              setDataFetchSource('error');
          } else {
              // Generic error
              errorDesc = `Could not load dashboard data: ${error.message || 'Unknown error'}. Please try again later.`;
               setDataFetchSource('error');
          }

          setFetchError(errorDesc); // Store the specific error message

          // Attempt to show default data even on error to prevent UI breaks
          if (!userProgress) { // Only set default if no progress data (including cached) is loaded
              setUserProgress({ ...defaultProgress, uid: user.uid });
          }
          toast({ title: errorTitle, description: errorDesc, variant: "destructive" });
        } finally {
          setIsLoadingData(false);
          console.log("DashboardPage: Data fetching process finished. isLoadingData: false");
        }
      };
      fetchData();
    } else if (!authLoading && !user) {
       // User is not logged in, and auth check is complete.
       // Layout should handle redirect. Dashboard should not attempt to load data.
       console.log("DashboardPage: Auth loaded, but no user. Data fetch skipped. Redirect handled by AppLayout.");
       setIsLoadingData(false);
       setDataFetchSource('nodata'); // Indicate no data to fetch because no user
       setFetchError("User not authenticated.");
    }
  }, [user, authLoading, authError, toast]); // Dependencies for the effect


   // Combined loading state
   if (authLoading || isLoadingData) {
     console.log("DashboardPage: Rendering loading spinner. AuthLoading:", authLoading, "IsLoadingData:", isLoadingData);
     return (
       <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
         <Loader2 className="h-16 w-16 animate-spin text-primary" />
       </div>
     );
   }

   // If there was a fetch error after loading, display it (unless showing cached data)
    if (dataFetchSource === 'error' && fetchError) {
        console.log("DashboardPage: Rendering error message due to fetchError:", fetchError);
        return (
            <div className="container mx-auto py-8">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <CardTitle>Error Loading Dashboard</CardTitle>
                    <AlertDescription>
                        {fetchError}
                        <p className="mt-2">Please try refreshing the page. If the issue persists, check your internet connection or contact support.</p>
                        {fetchError.includes("permission-denied") &&
                            <p className="mt-1 text-xs">Ensure Firestore rules are deployed: <code>firebase deploy --only firestore:rules</code>. Refer to the README for more details.</p>
                        }
                    </AlertDescription>
                </Alert>
                 {/* Show default cards on error */}
                 {renderDashboardCards(defaultProgress)}
            </div>
        );
    }

    // If auth is loaded, no user, and no data to fetch (e.g. redirected but component hasn't unmounted)
    if (dataFetchSource === 'nodata' && !user) {
        console.log("DashboardPage: No user and 'nodata' source. Rendering minimal or null.");
        // This case should ideally be handled by redirect in AppLayout, but as a fallback:
        return <p className="text-center text-muted-foreground p-8">Please log in to view your dashboard.</p>;
    }


   // Ensure userProgress is not null before rendering components that depend on it
   // Use the loaded progress or fall back to default if still null (e.g., during initial setup)
   const currentProgress = userProgress || { ...defaultProgress, uid: user?.uid || 'fallback_uid' };

   // Helper function to render dashboard cards to avoid repetition
   const renderDashboardCards = (progressData: UserProgress) => {
       const {
           subjectMastery = [],
           upcomingHomework = [],
           upcomingExams = [],
           studyRecommendations = []
       } = progressData;

       return (
        <>
          {/* Upcoming Homework */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="text-secondary" /> Upcoming Homework</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 min-h-[150px]">
              {upcomingHomework.length > 0 ? (
                upcomingHomework.map((hw) => (
                  <div key={hw.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{hw.title}</p>
                      <p className="text-sm text-muted-foreground">{hw.subjectName}</p>
                    </div>
                    <span className="text-sm font-semibold text-accent">
                      {hw.dueDate ? new Date(hw.dueDate as string).toLocaleDateString() : 'No due date'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center pt-8">No upcoming homework!</p>
              )}
            </CardContent>
             <CardFooter>
                <Button variant="ghost" size="sm" onClick={() => router.push('/study-planner')}>View Planner</Button>
            </CardFooter>
          </Card>

           {/* Upcoming Exams */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="text-secondary" /> Upcoming Exams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 min-h-[150px]">
              {upcomingExams.length > 0 ? (
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
             <CardFooter>
                <Button variant="ghost" size="sm" onClick={() => router.push('/study-planner')}>View Planner</Button>
            </CardFooter>
          </Card>

           {/* Subject Mastery */}
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="text-secondary" /> Subject Mastery</CardTitle>
              <CardDescription>Your progress in different subjects.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subjectMastery.length > 0 ? (
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
             <CardFooter>
                <Button variant="ghost" size="sm" onClick={() => router.push('/performance')}>View Performance</Button>
            </CardFooter>
          </Card>

           {/* Quick Study Recommendations */}
          <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-secondary" /> Quick Study Recommendations</CardTitle>
              <CardDescription>AI-powered suggestions for your next study session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 min-h-[100px]">
              {studyRecommendations.length > 0 ? (
                 studyRecommendations.slice(0, 3).map((rec) => (
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
                <Button variant="outline" size="sm" onClick={() => router.push('/performance')}>
                    View All Recommendations
                </Button>
            </CardFooter>
          </Card>
       </>
       );
   }


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
               {/* Display data fetch status */}
               {dataFetchSource === 'cache' && <span className="text-xs text-muted-foreground">(Data from Offline Cache)</span>}
               {dataFetchSource === 'default' && <span className="text-xs text-muted-foreground">(Default Data Loaded)</span>}
               {/* Error state is handled by the block above now */}
            </div>
        </CardHeader>
        <CardContent>
          <p>Stay organized and focused on your academic goals. Let's make today productive!</p>
        </CardContent>
       <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={() => router.push('/upload-textbook')}>
            <FileText className="mr-2 h-4 w-4" /> Upload Textbook
          </Button>
          <Button variant="secondary" onClick={() => router.push('/quiz')}>
            <Activity className="mr-2 h-4 w-4" /> Generate Quiz
          </Button>
         <Button variant="outline" onClick={() => router.push('/ai-tutor')}>
            <BrainCircuit className="mr-2 h-4 w-4"/> AI Tutor Session
          </Button>
          <Button variant="outline" onClick={() => router.push('/textbook-summary')}>
            <BookOpen className="mr-2 h-4 w-4"/> Textbook Summary
          </Button>
          <Button variant="outline" onClick={() => router.push('/textbook-explainer')}>
            <MessageSquareQuote className="mr-2 h-4 w-4"/> Textbook Explainer
          </Button>
       </CardFooter>
      </Card>

       {/* Render the dashboard cards using the helper function */}
       {renderDashboardCards(currentProgress)}

    </div>
  );
}

