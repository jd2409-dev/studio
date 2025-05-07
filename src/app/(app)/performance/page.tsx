'use client';

import * as React from 'react'; // Import React
import { useState, useEffect, useMemo } from 'react'; // Import useMemo
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart, LineChart, PieChart, ListChecks, Target, BrainCircuit, Loader2, AlertTriangle } from "lucide-react"; // Lucide icons
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart"; // Shadcn chart wrappers
import {
  BarChart as RechartsBarChart, // Renamed import
  LineChart as RechartsLineChart, // Renamed import
  PieChart as RechartsPieChart, // Renamed import
  Bar,
  CartesianGrid,
  Line,
  Pie,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip, // Keep original Tooltip name if needed elsewhere, or rename
  ResponsiveContainer,
  Legend,
  Cell // Import Cell for Pie chart colors
} from "recharts"; // Actual Recharts components
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProgress, SubjectMastery, QuizResult, HomeworkAssignment } from '@/types/user';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseISO, format, isValid } from 'date-fns'; // Import isValid
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';


// Helper function to assign colors based on subject ID or index
const getSubjectColor = (subjectId: string, index: number): string => {
    const colors = [
        "hsl(var(--chart-1))",
        "hsl(var(--chart-2))",
        "hsl(var(--chart-3))",
        "hsl(var(--chart-4))",
        "hsl(var(--chart-5))",
    ];
    // Simple hashing - distribute based on index if too many subjects
    let hash = 0;
    if (subjectId) {
        for (let i = 0; i < subjectId.length; i++) {
            hash = subjectId.charCodeAt(i) + ((hash << 5) - hash);
        }
         // Use Math.abs to ensure positive index
         return colors[Math.abs(hash % colors.length)];
    }
    // Fallback to index-based distribution if subjectId is missing or empty
    return colors[index % colors.length];
};


export default function PerformancePage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all'); // Default to 'all' subjects
  const [fetchError, setFetchError] = useState<string | null>(null); // Store fetch error

  // Fetch user progress data
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setIsLoading(true);
        setFetchError(null); // Reset error on new fetch attempt
        try {
            ensureFirebaseInitialized();
            const progressDocRef = doc(db!, 'userProgress', user.uid);
            const progressSnap = await getDoc(progressDocRef);
            if (progressSnap.exists()) {
              setUserProgress(progressSnap.data() as UserProgress);
            } else {
              console.log("No progress data found for performance analytics.");
              setUserProgress(null); // Set to null if no data
              setFetchError("No performance data available yet."); // Set specific message
            }
        } catch (error: any) {
          console.error("Error fetching performance data:", error);
          let errorDesc = "Could not load performance data.";
          if (error.code === 'permission-denied') {
               errorDesc = "Permission denied. Check Firestore rules.";
          }
          toast({ title: "Error", description: errorDesc, variant: "destructive" });
          setFetchError(errorDesc); // Store error message
          setUserProgress(null); // Clear potentially stale data on error
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else if (!authLoading) {
      setIsLoading(false); // Stop loading if user is null after auth check
       setFetchError("Please log in to view performance data.");
    }
  }, [user, authLoading, toast]);

  // Chart Data Processing (Memoize to avoid recalculations on every render)
   const subjectMasteryData = useMemo(() => {
       if (!userProgress?.subjectMastery) return [];
       const filteredMastery = selectedSubject === 'all'
           ? userProgress.subjectMastery
           : userProgress.subjectMastery.filter(s => s.subjectId === selectedSubject);

       return filteredMastery.map((s, index) => ({
           name: s.subjectName,
           mastery: s.progress,
           fill: getSubjectColor(s.subjectId, index) // Use helper function
       }));
   }, [userProgress?.subjectMastery, selectedSubject]);


  const quizHistoryData = useMemo(() => {
      if (!userProgress?.quizHistory) return [];

      // Filter based on selected subject (assuming subject context is added to quiz results later)
      // For now, it filters based on the existence of questions, as subjectId isn't on QuizResult yet
      const history = userProgress.quizHistory;
      const filteredHistory = selectedSubject === 'all'
          ? history
           // Placeholder: Add filtering logic here once subjectId is available on QuizResult or Question
           // : history.filter(q => q.subjectId === selectedSubject); // Example
           : history; // Currently shows all history if not 'all'


       const dailyScores: { [date: string]: { totalScore: number; count: number } } = {};
       filteredHistory.forEach(q => {
            let dateStr = '';
            if (q.generatedDate) {
                try {
                     // Handle Timestamp object or ISO string
                     const dateObj = typeof q.generatedDate === 'string'
                         ? parseISO(q.generatedDate)
                         : (q.generatedDate as any)?.toDate ? (q.generatedDate as any).toDate() : new Date(q.generatedDate as any);

                    if (isValid(dateObj)) { // Check if date is valid after parsing/conversion
                        dateStr = format(dateObj, 'yyyy-MM-dd');
                    } else {
                        console.warn("Invalid quiz date found:", q.generatedDate);
                        dateStr = format(new Date(), 'yyyy-MM-dd'); // Fallback to today
                    }
                } catch (e) {
                     console.error("Error parsing quiz date:", q.generatedDate, e);
                     dateStr = format(new Date(), 'yyyy-MM-dd'); // Fallback to today
                }
            } else {
                 console.warn("Quiz date missing for quizId:", q.quizId);
                 dateStr = format(new Date(), 'yyyy-MM-dd'); // Fallback to today
            }

          // Ensure totalQuestions is not zero to avoid NaN
          const scorePercent = q.totalQuestions > 0 ? (q.score / q.totalQuestions) * 100 : 0;

          if (!dailyScores[dateStr]) {
              dailyScores[dateStr] = { totalScore: 0, count: 0 };
          }
          dailyScores[dateStr].totalScore += scorePercent;
          dailyScores[dateStr].count += 1;
       });

        return Object.entries(dailyScores)
          .map(([date, data]) => {
              let formattedDate = 'Invalid Date';
              try {
                  // Ensure date string is parsable by parseISO before formatting
                  const parsedDate = parseISO(date);
                  if (isValid(parsedDate)) {
                     formattedDate = format(parsedDate, 'MMM d');
                  } else {
                      console.warn("Could not parse date string for chart axis:", date);
                  }
              } catch (e) {
                  console.error("Error formatting date string for chart:", date, e);
              }
              return {
                  date: formattedDate,
                  averageScore: Math.round(data.totalScore / data.count),
              };
           })
          .filter(item => item.date !== 'Invalid Date') // Filter out items with invalid dates
          .sort((a, b) => { // Sort by actual date value, not formatted string
              try {
                  // Need to parse back to Date objects for reliable sorting
                   const dateA = parse(a.date, 'MMM d', new Date()); // Assume current year if missing
                   const dateB = parse(b.date, 'MMM d', new Date());
                  if (!isValid(dateA) || !isValid(dateB)) return 0; // Handle parse errors during sort
                  return dateA.getTime() - dateB.getTime();
              } catch (e) {
                  console.error("Error sorting quiz history dates:", a.date, b.date, e);
                  return 0;
              }
           });

  }, [userProgress?.quizHistory, selectedSubject]);


 const homeworkCompletionData = useMemo(() => {
     if (!userProgress?.upcomingHomework) return [];

     const allHomework = userProgress.upcomingHomework;
     const filteredHomework = selectedSubject === 'all'
         ? allHomework
         : allHomework.filter(hw => hw.subjectId === selectedSubject);

     const completedCount = filteredHomework.filter(hw => hw.completed).length;
     const pendingCount = filteredHomework.length - completedCount;

      // Only return data points with values > 0
      const data = [];
      if (completedCount > 0) data.push({ name: 'Completed', value: completedCount, fill: 'hsl(var(--chart-1))' });
      if (pendingCount > 0) data.push({ name: 'Pending', value: pendingCount, fill: 'hsl(var(--chart-5))' });

      return data;

 }, [userProgress?.upcomingHomework, selectedSubject]);


  // Chart Configurations
  const subjectMasteryConfig: ChartConfig = useMemo(() => {
      const config: ChartConfig = {};
      subjectMasteryData.forEach((data) => {
           if (!config[data.name]) { // Ensure unique keys
              config[data.name] = { label: data.name, color: data.fill };
           }
      });
      config["mastery"] = { label: "Mastery", color: "hsl(var(--chart-1))" }; // Default/generic key
      return config;
  }, [subjectMasteryData]);

  const quizHistoryConfig: ChartConfig = {
    averageScore: { label: "Average Score (%)", color: "hsl(var(--chart-1))" },
  };

 const homeworkCompletionConfig: ChartConfig = {
    Completed: { label: "Completed", color: "hsl(var(--chart-1))" },
    Pending: { label: "Pending", color: "hsl(var(--chart-5))" },
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Handle fetch error state
   if (fetchError && !userProgress) {
       return (
          <div className="container mx-auto py-8 text-center">
             <h1 className="text-3xl font-bold mb-6">Performance Analytics</h1>
             <Alert variant="destructive" className="max-w-md mx-auto">
               <AlertTriangle className="h-4 w-4" />
               <AlertDescription>{fetchError}</AlertDescription>
             </Alert>
          </div>
       );
   }

  // Handle no data available state (after loading and no error)
   if (!userProgress || (!userProgress.subjectMastery?.length && !userProgress.quizHistory?.length && !userProgress.upcomingHomework?.length)) {
       return (
           <div className="container mx-auto py-8 text-center">
               <h1 className="text-3xl font-bold mb-6">Performance Analytics</h1>
               <p className="text-muted-foreground">No performance data available yet. Start using features like quizzes and tracking subject mastery to see your progress!</p>
           </div>
       );
   }


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Performance Analytics</h1>
      <p className="text-muted-foreground mb-8">
        Track your progress, identify strengths and weaknesses, and view your learning trends.
      </p>

       {/* Subject Filter - Only show if there are subjects */}
       {userProgress.subjectMastery && userProgress.subjectMastery.length > 0 && (
           <div className="mb-6 max-w-xs">
               <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                   <SelectTrigger id="subject-filter">
                   <SelectValue placeholder="Filter by subject..." />
                   </SelectTrigger>
                   <SelectContent>
                       <SelectItem value="all">All Subjects</SelectItem>
                       {userProgress.subjectMastery.map(s => (
                          <SelectItem key={s.subjectId} value={s.subjectId}>{s.subjectName}</SelectItem>
                       ))}
                   </SelectContent>
               </Select>
           </div>
       )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Subject Mastery */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="text-secondary" /> Subject Mastery Overview</CardTitle>
             <CardDescription>
                 Your current progress {selectedSubject !== 'all' ? `for ${userProgress.subjectMastery.find(s=>s.subjectId === selectedSubject)?.subjectName || 'selected subject'}` : 'across subjects'}.
             </CardDescription>
          </CardHeader>
          <CardContent>
             {subjectMasteryData.length > 0 ? (
                <ChartContainer config={subjectMasteryConfig} className="min-h-[250px] w-full">
                  {/* Use Renamed Recharts component */}
                  <RechartsBarChart accessibilityLayer data={subjectMasteryData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      width={100}
                       className="text-xs fill-foreground" // Use fill for text color in SVG
                    />
                    <XAxis dataKey="mastery" type="number" hide />
                     {/* Use Shadcn Tooltip Content */}
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel indicator="dot" nameKey="name" />} />
                     {/* Apply fill using Cell for individual colors */}
                     <Bar dataKey="mastery" radius={5}>
                       {subjectMasteryData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.fill} />
                       ))}
                     </Bar>
                  </RechartsBarChart>
                </ChartContainer>
              ) : (
                <p className="text-center text-muted-foreground p-8">No subject mastery data available{selectedSubject !== 'all' ? ' for this subject' : ''}.</p>
              )}
          </CardContent>
        </Card>

        {/* Homework Completion */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><ListChecks className="text-secondary" /> Homework Completion</CardTitle>
              <CardDescription>
                  Status of assigned homework {selectedSubject !== 'all' ? `for ${userProgress.subjectMastery.find(s=>s.subjectId === selectedSubject)?.subjectName || 'selected subject'}` : ''}.
              </CardDescription>
           </CardHeader>
           <CardContent className="flex items-center justify-center">
             {homeworkCompletionData.length > 0 ? (
                 <ChartContainer config={homeworkCompletionConfig} className="mx-auto aspect-square max-h-[250px]">
                     {/* Use Renamed Recharts component */}
                     <RechartsPieChart>
                        {/* Use Shadcn Tooltip Content */}
                         <ChartTooltip content={<ChartTooltipContent nameKey="name" hideIndicator />} />
                         <Pie data={homeworkCompletionData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80}>
                            {homeworkCompletionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                         </Pie>
                         {/* Use Shadcn Legend Content */}
                        <ChartLegendContent nameKey="name" />
                     </RechartsPieChart>
                 </ChartContainer>
             ) : (
                 <p className="text-center text-muted-foreground p-8">No homework data available{selectedSubject !== 'all' ? ` for this subject` : ''}.</p>
             )}
           </CardContent>
         </Card>


         {/* Quiz Performance Trend */}
         <Card className="lg:col-span-3">
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><LineChart className="text-secondary" /> Quiz Performance Trend</CardTitle>
              <CardDescription>
                  Your average quiz scores over time {selectedSubject !== 'all' ? `for ${userProgress.subjectMastery.find(s=>s.subjectId === selectedSubject)?.subjectName || 'selected subject'}` : ''}.
              </CardDescription>
           </CardHeader>
           <CardContent>
                 {quizHistoryData.length > 1 ? (
                    <ChartContainer config={quizHistoryConfig} className="min-h-[300px] w-full">
                        {/* Use Renamed Recharts component */}
                        <RechartsLineChart accessibilityLayer data={quizHistoryData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => value}
                                className="text-xs fill-foreground" // Use fill for text color
                            />
                           <YAxis
                                domain={[0, 100]}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                width={30}
                                tickFormatter={(value) => `${value}%`}
                                className="text-xs fill-foreground" // Use fill for text color
                             />
                             {/* Use Shadcn Tooltip Content */}
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                            <Line dataKey="averageScore" type="monotone" stroke="var(--color-averageScore)" strokeWidth={2} dot={true} /> {/* Added dot=true */}
                        </RechartsLineChart>
                    </ChartContainer>
                ) : (
                    <p className="text-center text-muted-foreground p-8">Not enough quiz data ({quizHistoryData.length} quiz attempts) to show a trend{selectedSubject !== 'all' ? ` for this subject` : ''}. Need at least 2 data points.</p>
                )}
           </CardContent>
         </Card>

         {/* AI Recommendations Placeholder - Replace with actual AI logic later */}
         <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-secondary" /> AI-Powered Insights</CardTitle>
                <CardDescription>Personalized recommendations based on your performance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 min-h-[100px]">
                 {/* Example Placeholder Logic */}
               {quizHistoryData.length >= 1 && subjectMasteryData.length > 0 ? (
                   <>
                      <div className="p-4 border rounded-md bg-muted/30">
                         <p className="font-medium text-sm">Focus Area: {subjectMasteryData[0]?.name || 'Review Needed'}</p>
                         <p className="text-xs text-muted-foreground">Consider revisiting topics in {subjectMasteryData[0]?.name || 'your lowest-scoring subject'} based on recent performance. Try generating a targeted quiz!</p>
                      </div>
                       {quizHistoryData.length >= 2 && (
                           <div className="p-4 border rounded-md bg-muted/30">
                              <p className="font-medium text-sm">Trend Observation</p>
                              <p className="text-xs text-muted-foreground">Analyze your quiz performance trend chart to see progress over time.</p>
                           </div>
                       )}
                   </>
               ) : (
                  <p className="text-center text-muted-foreground p-8">Not enough data to provide personalized insights yet. Complete more quizzes or track subject mastery.</p>
               )}
            </CardContent>
         </Card>

      </div>
    </div>
  );
}

