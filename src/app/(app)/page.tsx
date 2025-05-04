import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart, FileText, Calendar, AlertTriangle, Activity, Target, Clock } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  // Placeholder data - replace with actual data fetching
  const upcomingHomework = [
    { id: 1, subject: 'Math', title: 'Algebra Chapter 5', dueDate: 'Tomorrow' },
    { id: 2, subject: 'Physics', title: 'Newton\'s Laws Worksheet', dueDate: '3 days' },
  ];
  const upcomingExams = [
    { id: 1, subject: 'Chemistry', title: 'Midterm Exam', date: 'Next Monday' },
  ];
  const subjectMastery = [
    { id: 1, subject: 'Mathematics', progress: 85, color: 'bg-emerald-500' },
    { id: 2, subject: 'Physics', progress: 70, color: 'bg-blue-500' },
    { id: 3, subject: 'Chemistry', progress: 60, color: 'bg-yellow-500' },
    { id: 4, subject: 'Biology', progress: 90, color: 'bg-green-500' },
  ];
  const studyRecommendations = [
    { id: 1, title: 'Review Chemistry formulas', reason: 'Low quiz scores' },
    { id: 2, title: 'Practice Physics problems', reason: 'Approaching exam' },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Welcome Card */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Welcome back, Student!</CardTitle>
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
         </CardFooter>
      </Card>

      {/* Upcoming Homework */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="text-secondary" /> Upcoming Homework</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <Button variant="outline" size="sm" className="w-full">View All Homework</Button>
        </CardFooter>
      </Card>

      {/* Upcoming Exams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="text-secondary" /> Upcoming Exams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <Button variant="outline" size="sm" className="w-full">View Exam Schedule</Button>
        </CardFooter>
      </Card>

       {/* Study Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="text-secondary" /> AI Study Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <Button variant="outline" size="sm" className="w-full">Customize Plan</Button>
        </CardFooter>
      </Card>


      {/* Subject Mastery */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart className="text-secondary" /> Subject Mastery</CardTitle>
          <CardDescription>Your progress across different subjects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjectMastery.map((subject) => (
            <div key={subject.id}>
              <div className="flex justify-between mb-1">
                <span className="font-medium">{subject.subject}</span>
                <span className="text-sm text-muted-foreground">{subject.progress}%</span>
              </div>
              <Progress value={subject.progress} className="h-2 [&>*]:bg-secondary" aria-label={`${subject.subject} progress`}/>
            </div>
          ))}
        </CardContent>
        <CardFooter>
           <Button variant="default" size="sm" className="w-full">View Detailed Report</Button>
        </CardFooter>
      </Card>

      {/* Quick Actions */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2"><Clock className="text-secondary" /> Quick Actions</CardTitle>
         </CardHeader>
         <CardContent className="grid grid-cols-1 gap-2">
           <Button variant="outline" asChild>
              <Link href="/textbook-summary">Generate Summary</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/quiz">Start Practice Quiz</Link>
            </Button>
             <Button variant="outline">AI Tutor Session</Button>
         </CardContent>
       </Card>

        {/* Exam Planning Assistant */}
       <Card className="lg:col-span-2">
         <CardHeader>
           <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-secondary" /> Exam Planning Assistant</CardTitle>
           <CardDescription>AI insights to optimize your exam preparation.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-3">
           <p><span className="font-semibold text-accent">High Priority:</span> Focus on Chemistry Organic Reactions (Weightage: 25%)</p>
           <p><span className="font-semibold text-secondary">Suggestion:</span> Allocate 2 extra hours for Physics revision this week.</p>
           <p><span className="font-semibold text-muted-foreground">Reminder:</span> Mock test for Mathematics scheduled for Saturday.</p>
         </CardContent>
          <CardFooter>
           <Button variant="default" size="sm">Generate Detailed Study Plan</Button>
         </CardFooter>
       </Card>


    </div>
  );
}
