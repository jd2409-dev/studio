
'use client';

import * as React from 'react'; // Import React
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart, LineChart, PieChart, ListChecks, Target, BrainCircuit, Loader2 } from "lucide-react"; // Lucide icons
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
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Sector, // Import Sector for potential custom Pie rendering if needed
  Cell // Import Cell for potential custom Pie rendering if needed
} from "recharts"; // Actual Recharts components
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProgress, SubjectMastery, QuizResult, HomeworkAssignment } from '@/types/user';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseISO, format } from 'date-fns';
import { cn } from '@/lib/utils';


export default function PerformancePage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all'); // Default to 'all' subjects

  // Fetch user progress data
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setIsLoading(true);
        ensureFirebaseInitialized();
        const progressDocRef = doc(db!, 'userProgress', user.uid);
        try {
          const progressSnap = await getDoc(progressDocRef);
          if (progressSnap.exists()) {
            setUserProgress(progressSnap.data() as UserProgress);
          } else {
            console.log("No progress data found for performance analytics.");
            setUserProgress(null); // Set to null if no data
          }
        } catch (error) {
          console.error("Error fetching performance data:", error);
          toast({ title: "Error", description: "Could not load performance data.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else if (!authLoading) {
      setIsLoading(false); // Stop loading if user is null after auth check
    }
  }, [user, authLoading, toast]);

  // Chart Data Processing (Memoize to avoid recalculations on every render)
  const subjectMasteryData = React.useMemo(() => {
    return userProgress?.subjectMastery?.map((s, index) => ({ // Added index
      name: s.subjectName,
      mastery: s.progress,
      fill: getSubjectColor(s.subjectId, index) // Use helper function
    })) || [];
  }, [userProgress?.subjectMastery]);


  const quizHistoryData = React.useMemo(() => {
      const history = userProgress?.quizHistory || [];
      const filteredHistory = selectedSubject === 'all'
          ? history
          : history.filter(q => q.questions.some(qs => (qs as any).subjectId === selectedSubject)); // Needs subjectId on Question (or derive from sourceContent/quiz name if possible)

       const dailyScores: { [date: string]: { totalScore: number; count: number } } = {};
      filteredHistory.forEach(q => {
            let dateStr = '';
            if (q.generatedDate) {
                try {
                     const dateObj = typeof q.generatedDate === 'string'
                         ? parseISO(q.generatedDate)
                         : (q.generatedDate as any).toDate ? (q.generatedDate as any).toDate() : new Date();
                    dateStr = format(dateObj, 'yyyy-MM-dd');
                } catch (e) {
                     console.error("Error parsing quiz date:", q.generatedDate, e);
                     dateStr = format(new Date(), 'yyyy-MM-dd');
                }
            } else {
                dateStr = format(new Date(), 'yyyy-MM-dd');
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
                 formattedDate = format(parseISO(date), 'MMM d');
              } catch (e) {
                  console.error("Error formatting date string for chart:", date, e);
              }
              return {
                  date: formattedDate,
                  averageScore: Math.round(data.totalScore / data.count),
              };
           })
          .filter(item => item.date !== 'Invalid Date')
          .sort((a, b) => {
              try {
                  const dateA = parseISO(a.date + `, ${new Date().getFullYear()}`); // Add year for parsing if needed
                  const dateB = parseISO(b.date + `, ${new Date().getFullYear()}`);
                  return dateA.getTime() - dateB.getTime();
              } catch (e) {
                  console.error("Error sorting quiz history dates:", a.date, b.date, e);
                  return 0;
              }
           });

  }, [userProgress?.quizHistory, selectedSubject]);


 const homeworkCompletionData = React.useMemo(() => {
     const allHomework = userProgress?.upcomingHomework || [];
     const filteredHomework = selectedSubject === 'all'
         ? allHomework
         : allHomework.filter(hw => hw.subjectId === selectedSubject);

     const completedCount = filteredHomework.filter(hw => hw.completed).length;
     const pendingCount = filteredHomework.length - completedCount;

     return [
        { name: 'Completed', value: completedCount, fill: 'hsl(var(--chart-1))' },
        { name: 'Pending', value: pendingCount, fill: 'hsl(var(--chart-5))' },
      ].filter(item => item.value > 0);

 }, [userProgress?.upcomingHomework, selectedSubject]);


  // Chart Configurations
  const subjectMasteryConfig: ChartConfig = React.useMemo(() => {
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

  if (!userProgress) {
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

       {/* Subject Filter */}
       <div className="mb-6 max-w-xs">
           <Select value={selectedSubject} onValueChange={setSelectedSubject}>
               <SelectTrigger id="subject-filter">
               <SelectValue placeholder="Filter by subject..." />
               </SelectTrigger>
               <SelectContent>
                   <SelectItem value="all">All Subjects</SelectItem>
                   {userProgress?.subjectMastery?.map(s => (
                      <SelectItem key={s.subjectId} value={s.subjectId}>{s.subjectName}</SelectItem>
                   ))}
               </SelectContent>
           </Select>
       </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Subject Mastery */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="text-secondary" /> Subject Mastery Overview</CardTitle>
            <CardDescription>Your current progress across different subjects.</CardDescription>
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
                       className="text-xs"
                       stroke="hsl(var(--foreground))" // Explicitly set stroke color
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
                <p className="text-center text-muted-foreground p-8">No subject mastery data available.</p>
              )}
          </CardContent>
        </Card>

        {/* Homework Completion */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><ListChecks className="text-secondary" /> Homework Completion</CardTitle>
             <CardDescription>Status of assigned homework {selectedSubject !== 'all' ? `for ${userProgress.subjectMastery.find(s=>s.subjectId === selectedSubject)?.subjectName}` : ''}.</CardDescription>
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
              <CardDescription>Your average quiz scores over time {selectedSubject !== 'all' ? `for ${userProgress.subjectMastery.find(s=>s.subjectId === selectedSubject)?.subjectName}` : ''}.</CardDescription>
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
                                 className="text-xs"
                                 stroke="hsl(var(--foreground))" // Explicitly set stroke color
                            />
                           <YAxis
                                domain={[0, 100]}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                width={30}
                                tickFormatter={(value) => `${value}%`}
                                 className="text-xs"
                                 stroke="hsl(var(--foreground))" // Explicitly set stroke color
                             />
                             {/* Use Shadcn Tooltip Content */}
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                            <Line dataKey="averageScore" type="monotone" stroke="var(--color-averageScore)" strokeWidth={2} dot={false} />
                        </RechartsLineChart>
                    </ChartContainer>
                ) : (
                    <p className="text-center text-muted-foreground p-8">Not enough quiz data to show a trend{selectedSubject !== 'all' ? ` for this subject` : ''}.</p>
                )}
           </CardContent>
         </Card>

         {/* AI Recommendations (Placeholder) */}
         <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-secondary" /> AI-Powered Insights (Placeholder)</CardTitle>
                <CardDescription>Personalized recommendations based on your performance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
               <div className="p-4 border rounded-md bg-muted/30">
                  <p className="font-medium text-sm">Focus Area: Algebra</p>
                  <p className="text-xs text-muted-foreground">Recent quiz scores suggest difficulty with quadratic equations. Try practicing more problems.</p>
               </div>
                <div className="p-4 border rounded-md bg-muted/30">
                  <p className="font-medium text-sm">Strength: Physics Concepts</p>
                  <p className="text-xs text-muted-foreground">You consistently score well on conceptual physics questions. Keep it up!</p>
               </div>
               {/* Add more dynamic recommendations here */}
            </CardContent>
         </Card>

      </div>
    </div>
  );
}


// Helper function to assign colors based on subject ID - needs improvement for more subjects
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
         return colors[Math.abs(hash % colors.length)];
    }
    // Fallback to index-based distribution if subjectId is missing or empty
    return colors[index % colors.length];
};
