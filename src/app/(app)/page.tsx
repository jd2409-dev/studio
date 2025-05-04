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
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Define interfaces for data structures
interface Homework {
    id: string;
    subject: string;
    title: string;
    dueDate: string; // Consider using Date type and formatting
}

interface Exam {
    id: string;
    subject: string;
    title: string;
    date: string; // Consider using Date type and formatting
}

interface SubjectMasteryData {
    id: string;
    subject: string;
    progress: number;
}

interface StudyRecommendation {
    id: string;
    title: string;
    reason: string;
}

interface UserProgress {
    subjectMastery: SubjectMasteryData[];
    upcomingHomework: Homework[];
    upcomingExams: Exam[];
    studyRecommendations: StudyRecommendation[];
}

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [userName, setUserName] = useState<string>('Student');

   // Default placeholder data
   const defaultProgress: UserProgress = {
       subjectMastery: [
           { id: 'math', subject: 'Mathematics', progress: 0 },
           { id: 'physics', subject: 'Physics', progress: 0 },
           { id: 'chemistry', subject: 'Chemistry', progress: 0 },
           { id: 'biology', subject: 'Biology', progress: 0 },
       ],
       upcomingHomework: [],
       upcomingExams: [],
       studyRecommendations: [],
   };

  // Fetch user progress data and name from Firestore
  useEffect(() => {
    if (user) {
      setIsLoadingData(true);
      const progressDocRef = doc(db, 'userProgress', user.uid);
      const userDocRef = doc(db, 'users', user.uid); // For user name

      const fetchData = async () => {
        try {
          // Fetch user progress
          const progressSnap = await getDoc(progressDocRef);
          if (progressSnap.exists()) {
            setUserProgress(progressSnap.data() as UserProgress);
          } else {
            // Initialize with default data if no progress exists
            await setDoc(progressDocRef, defaultProgress);
            setUserProgress(defaultProgress);
            console.log("No progress data found. Initialized default progress.");
          }

           // Fetch user name from profile
          const userSnap = await getDoc(userDocRef);
           if (userSnap.exists() && userSnap.data().name) {
               setUserName(userSnap.data().name);
           } else if (user.displayName) {
                setUserName(user.displayName); // Fallback to auth display name
           }

        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
           setUserProgress(defaultProgress); // Fallback to default on error
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
   const { subjectMastery, upcomingHomework, upcomingExams, studyRecommendations } = userProgress || defaultProgress;


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Welcome Card */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Welcome back, {userName}!</CardTitle> {/* Display user's name */}
          <CardDescription>Here's your personalized study dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Stay organized and focused on your academic goals. Let's make today productive!</p>
        </CardContent>
         <CardFooter className="flex gap-2">
           <Button asChild>
             <Link href="/upload-textbook"><FileText className="mr-2 h-4 w-4" /> Upload Textbook</Link>
           </Button>
           <Button variant="secondary" asChild>
             <Link href="/quiz"><Activity className="mr-2 h-4 w-4" /> Take a Quiz</Link>
           </Button>
            <Button variant="outline" onClick={() => handlePlaceholderClick('AI Tutor Session')}>
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
          {upcomingHomework.length > 0 ? (
            upcomingHomework.map((hw) => (
              <div key={hw.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{hw.title}</p>
                  <p className="text-sm text-muted-foreground">{hw.subject}</p>
                </div>
                <span className="text-sm font-semibold text-accent">{hw.dueDate}</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No upcoming homework.</p>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full" onClick={() => handlePlaceholderClick('View All Homework')}>
            View All Homework
          </Button>
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
                  <p className="text-sm text-muted-foreground">{exam.subject}</p>
                </div>
                <span className="text-sm font-semibold text-accent">{exam.date}</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No upcoming exams.</p>
          )}
        </CardContent>
         <CardFooter>
          <Button variant="outline" size="sm" className="w-full" onClick={() => handlePlaceholderClick('View Exam Schedule')}>
            View Exam Schedule
          </Button>
        </CardFooter>
      </Card>

       {/* Study Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="text-secondary" /> AI Study Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 min-h-[150px]">
           {studyRecommendations.length > 0 ? (
            studyRecommendations.map((rec) => (
              <div key={rec.id}>
                 <p className="font-medium">{rec.title}</p>
                 <p className="text-sm text-muted-foreground">{rec.reason}</p>
              </div>
             ))
           ) : (
            <p className="text-muted-foreground">No recommendations right now.</p>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full" onClick={() => handlePlaceholderClick('Customize Plan')}>
            Customize Plan
          </Button>
        </CardFooter>
      </Card>


      {/* Subject Mastery */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart className="text-secondary" /> Subject Mastery</CardTitle>
          <CardDescription>Your progress across different subjects based on quiz performance and activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjectMastery.map((subject) => (
            <div key={subject.id}>
              <div className="flex justify-between mb-1">
                <span className="font-medium">{subject.subject}</span>
                <span className="text-sm text-muted-foreground">{subject.progress}%</span>
              </div>
              <Progress value={subject.progress} className="h-2 [&>*]:bg-secondary" aria-label={`${subject.subject} progress ${subject.progress}%`}/>
            </div>
          ))}
        </CardContent>
        <CardFooter>
           <Button variant="default" size="sm" className="w-full" onClick={() => handlePlaceholderClick('View Detailed Report')}>
            View Detailed Report
            </Button>
        </CardFooter>
      </Card>

       {/* Quick Actions */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2"><Clock className="text-secondary" /> Quick Actions</CardTitle>
         </CardHeader>
         <CardContent className="grid grid-cols-1 gap-2">
           <Button variant="outline" onClick={() => navigateTo('/textbook-summary')}>
              Generate Summary
            </Button>
            <Button variant="outline" onClick={() => navigateTo('/quiz')}>
              Start Practice Quiz
            </Button>
             <Button variant="outline" onClick={() => handlePlaceholderClick('Study Planner')}>
                View Study Plan
             </Button>
         </CardContent>
       </Card>

        {/* Exam Planning Assistant - Example Placeholder */}
       <Card className="lg:col-span-2">
         <CardHeader>
           <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-secondary" /> Exam Planning Assistant</CardTitle>
           <CardDescription>AI insights to optimize your exam preparation (Example).</CardDescription>
         </CardHeader>
         <CardContent className="space-y-3">
           <p><span className="font-semibold text-accent">High Priority:</span> Focus on Chemistry Organic Reactions (Weightage: 25%)</p>
           <p><span className="font-semibold text-secondary">Suggestion:</span> Allocate 2 extra hours for Physics revision this week.</p>
           <p><span className="font-semibold text-muted-foreground">Reminder:</span> Mock test for Mathematics scheduled for Saturday.</p>
         </CardContent>
          <CardFooter>
           <Button variant="default" size="sm" onClick={() => handlePlaceholderClick('Generate Detailed Study Plan')}>
            Generate Detailed Study Plan
            </Button>
         </CardFooter>
       </Card>


    </div>
  );
}
