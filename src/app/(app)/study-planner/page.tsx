
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { format, parse, addDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { Loader2, PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyPlannerEntry, UserProgress, SubjectMastery } from '@/types/user';

export default function StudyPlannerPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [plannerEntries, setPlannerEntries] = useState<StudyPlannerEntry[]>([]);
  const [subjects, setSubjects] = useState<SubjectMastery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewStartDate, setViewStartDate] = useState<Date>(startOfWeek(new Date()));

  // Form state for adding/editing entries
  const [editingEntry, setEditingEntry] = useState<StudyPlannerEntry | null>(null);
  const [task, setTask] = useState('');
  const [subjectId, setSubjectId] = useState(''); // Use '' or 'none' for no subject
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [formDate, setFormDate] = useState<Date>(new Date()); // Date for the entry being added/edited

  // Fetch user progress data (including planner entries and subjects)
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setIsLoading(true);
        ensureFirebaseInitialized();
        const progressDocRef = doc(db!, 'userProgress', user.uid);
        try {
          const progressSnap = await getDoc(progressDocRef);
          if (progressSnap.exists()) {
            const data = progressSnap.data() as UserProgress;
            setPlannerEntries(data.studyPlanner || []);
            setSubjects(data.subjectMastery || []);
          } else {
            // Initialize if no progress doc exists (consider moving this to a central place)
            console.log("No progress data found, initializing.");
            setPlannerEntries([]);
            setSubjects([]);
          }
        } catch (error) {
          console.error("Error fetching study planner data:", error);
          toast({ title: "Error", description: "Could not load study planner data.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else if (!authLoading) {
      setIsLoading(false); // Stop loading if user is null after auth check
    }
  }, [user, authLoading, toast]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setFormDate(date); // Update form date when a new date is selected
      setEditingEntry(null); // Clear editing state when date changes
      resetForm();
    }
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    setViewStartDate((current) => addDays(current, direction === 'prev' ? -7 : 7));
  };

  const handleAddOrUpdateEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !task.trim()) return;

    setIsUpdating(true);
    const selectedSubject = subjects.find(s => s.subjectId === subjectId);
    const entryData: Omit<StudyPlannerEntry, 'id' | 'completed'> = {
      date: format(formDate, 'yyyy-MM-dd'),
      task: task.trim(),
      subjectId: subjectId && subjectId !== 'none' ? subjectId : undefined, // Store 'none' as undefined
      subjectName: selectedSubject?.subjectName,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      notes: notes.trim() || undefined,
    };

    const progressDocRef = doc(db!, 'userProgress', user.uid);

    try {
      ensureFirebaseInitialized();
      if (editingEntry) {
        // Update existing entry: remove old, add new
        // Ensure the old entry being removed matches exactly what's in Firestore
        const entryToRemove = plannerEntries.find(e => e.id === editingEntry.id);
        if (!entryToRemove) {
            throw new Error("Original entry not found for update.");
        }
        const newEntry = { ...entryToRemove, ...entryData, date: format(formDate, 'yyyy-MM-dd') }; // Create the updated version

        // Perform remove and add within a transaction for atomicity if needed, or just sequential updates
        await updateDoc(progressDocRef, {
          studyPlanner: arrayRemove(entryToRemove) // Remove the original entry
        });
        await updateDoc(progressDocRef, {
           studyPlanner: arrayUnion(newEntry) // Add the updated entry
        });

         setPlannerEntries(prev => prev.map(e => e.id === newEntry.id ? newEntry : e));
        toast({ title: "Success", description: "Study task updated." });

      } else {
        // Add new entry
        const newEntry: StudyPlannerEntry = {
          ...entryData,
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // Simple unique ID
          completed: false,
        };
        await updateDoc(progressDocRef, {
          studyPlanner: arrayUnion(newEntry)
        }, { merge: true }); // Use merge to create the field if it doesn't exist

        setPlannerEntries(prev => [...prev, newEntry]);
        toast({ title: "Success", description: "Study task added." });
      }
      resetForm();
      setEditingEntry(null);
    } catch (error: any) {
      console.error("Error saving study planner entry:", error);
       let errorDesc = "Could not save study task.";
       if (error.code === 'permission-denied') {
           errorDesc = "Permission denied. Check Firestore rules.";
       } else if (error instanceof Error) {
           errorDesc = error.message;
       }
      toast({ title: "Error", description: errorDesc, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteEntry = async (entryToDelete: StudyPlannerEntry) => {
    if (!user || !window.confirm(`Are you sure you want to delete the task "${entryToDelete.task}"?`)) return;

    setIsUpdating(true);
    const progressDocRef = doc(db!, 'userProgress', user.uid);
    // Ensure the entry being removed matches exactly what's in Firestore
    const entryToRemove = plannerEntries.find(e => e.id === entryToDelete.id);
     if (!entryToRemove) {
         toast({ title: "Error", description: "Task not found for deletion.", variant: "destructive" });
         setIsUpdating(false);
         return;
     }

    try {
      ensureFirebaseInitialized();
      await updateDoc(progressDocRef, {
        studyPlanner: arrayRemove(entryToRemove)
      });
      setPlannerEntries(prev => prev.filter(e => e.id !== entryToRemove.id));
       if (editingEntry?.id === entryToRemove.id) {
           resetForm();
           setEditingEntry(null);
       }
      toast({ title: "Success", description: "Study task deleted." });
    } catch (error: any) {
        console.error("Error deleting study planner entry:", error);
        let errorDesc = "Could not delete study task.";
       if (error.code === 'permission-denied') {
           errorDesc = "Permission denied. Check Firestore rules.";
       } else if (error instanceof Error) {
           errorDesc = error.message;
       }
        toast({ title: "Error", description: errorDesc, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

 const handleToggleComplete = async (entryToToggle: StudyPlannerEntry) => {
    if (!user) return;

    // Find the exact entry from the current state to ensure consistency
     const originalEntry = plannerEntries.find(e => e.id === entryToToggle.id);
    if (!originalEntry) {
        console.error("Could not find original entry for toggling completion.");
        toast({ title: "Error", description: "Could not update task status.", variant: "destructive"});
        return;
    }

    const updatedEntry = { ...originalEntry, completed: !originalEntry.completed };

    // Optimistically update UI first for better responsiveness
    setPlannerEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
     if (editingEntry?.id === updatedEntry.id) {
        setEditingEntry(updatedEntry); // Update editing state if applicable
     }

    // Then update Firestore
    const progressDocRef = doc(db!, 'userProgress', user.uid);
    try {
       ensureFirebaseInitialized();
        // Firestore update needs the original entry to remove and the new one to add
        await updateDoc(progressDocRef, {
           studyPlanner: arrayRemove(originalEntry) // Remove the original entry
       });
       await updateDoc(progressDocRef, {
           studyPlanner: arrayUnion(updatedEntry) // Add the updated entry
       });
        console.log("Task completion status updated in Firestore.");
    } catch (error: any) {
       console.error("Error toggling task completion:", error);
       // Revert optimistic UI update on error
       setPlannerEntries(prev => prev.map(e => e.id === originalEntry.id ? originalEntry : e));
        if (editingEntry?.id === originalEntry.id) {
           setEditingEntry(originalEntry);
       }
        let errorDesc = "Could not update task status.";
       if (error.code === 'permission-denied') {
           errorDesc = "Permission denied. Check Firestore rules.";
        } else if (error instanceof Error) {
            errorDesc = error.message;
        }
       toast({ title: "Update Failed", description: errorDesc, variant: "destructive" });
    }
};

  const resetForm = () => {
    setTask('');
    setSubjectId(''); // Reset to empty string, which will select the placeholder or 'None'
    setStartTime('');
    setEndTime('');
    setNotes('');
    // Keep formDate as the selectedDate by default
    setFormDate(selectedDate);
  };

   const startEditing = (entry: StudyPlannerEntry) => {
       setEditingEntry(entry);
       setTask(entry.task);
       setSubjectId(entry.subjectId || 'none'); // Use 'none' if subjectId is undefined/empty
       setStartTime(entry.startTime || '');
       setEndTime(entry.endTime || '');
       setNotes(entry.notes || '');
       setFormDate(parse(entry.date, 'yyyy-MM-dd', new Date())); // Parse date string back to Date object for the form
   };

  const weekDays = eachDayOfInterval({ start: viewStartDate, end: addDays(viewStartDate, 6) });

  const entriesForSelectedDate = plannerEntries.filter(entry =>
     isSameDay(parse(entry.date, 'yyyy-MM-dd', new Date()), selectedDate)
  ).sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99')); // Sort by start time

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Study Planner</h1>
      <p className="text-muted-foreground mb-8">
        Organize your study schedule, track tasks, and stay on top of your goals.
      </p>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Calendar View & Controls */}
        <Card className="lg:col-span-1">
           <CardHeader>
               <CardTitle>Calendar</CardTitle>
               <CardDescription>Select a date to view and manage tasks.</CardDescription>
           </CardHeader>
           <CardContent className="flex flex-col items-center">
               <Calendar
                   mode="single"
                   selected={selectedDate}
                   onSelect={handleDateSelect}
                   className="rounded-md border"
                    month={viewStartDate} // Control displayed month
                    onMonthChange={setViewStartDate} // Allow month navigation within calendar
                    // Highlight days with tasks (optional enhancement)
                     modifiers={{
                        hasTasks: plannerEntries.map(e => parse(e.date, 'yyyy-MM-dd', new Date())),
                    }}
                    modifiersClassNames={{
                        hasTasks: 'bg-accent/30 rounded-full',
                    }}
               />
                 <div className="flex justify-between w-full mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleWeekChange('prev')}>Previous Week</Button>
                    <Button variant="outline" size="sm" onClick={() => handleWeekChange('next')}>Next Week</Button>
                 </div>
           </CardContent>
        </Card>

         {/* Add/Edit Task Form */}
        <Card className="lg:col-span-2">
           <CardHeader>
              <CardTitle>{editingEntry ? 'Edit Task' : 'Add New Task'} for {format(formDate, 'PPP')}</CardTitle>
              <CardDescription>{editingEntry ? 'Update the details for this study task.' : 'Fill in the details for your new study task.'}</CardDescription>
           </CardHeader>
           <form onSubmit={handleAddOrUpdateEntry}>
             <CardContent className="space-y-4">
                 {/* Date Picker for the form */}
                  <div className="space-y-2">
                     <Label htmlFor="form-date">Date</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !formDate && "text-muted-foreground"
                            )}
                             disabled={isUpdating}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formDate ? format(formDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={formDate}
                            onSelect={(d) => d && setFormDate(d)}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                  </div>

                 <div className="space-y-2">
                 <Label htmlFor="task">Task Description</Label>
                 <Input
                    id="task"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="e.g., Read Chapter 5 Physics"
                    required
                    disabled={isUpdating}
                 />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                       <Label htmlFor="subject">Subject (Optional)</Label>
                       <Select value={subjectId} onValueChange={setSubjectId} disabled={isUpdating}>
                           <SelectTrigger id="subject">
                           <SelectValue placeholder="Select subject..." />
                           </SelectTrigger>
                           <SelectContent>
                           {/* Change value from "" to "none" */}
                           <SelectItem value="none">None</SelectItem>
                           {subjects.map(s => (
                              <SelectItem key={s.subjectId} value={s.subjectId}>{s.subjectName}</SelectItem>
                           ))}
                           </SelectContent>
                       </Select>
                    </div>
                     <div className="space-y-2">
                       <Label htmlFor="start-time">Start Time (Optional)</Label>
                       <Input
                           id="start-time"
                           type="time"
                           value={startTime}
                           onChange={(e) => setStartTime(e.target.value)}
                           disabled={isUpdating}
                       />
                    </div>
                     <div className="space-y-2">
                       <Label htmlFor="end-time">End Time (Optional)</Label>
                       <Input
                           id="end-time"
                           type="time"
                           value={endTime}
                           onChange={(e) => setEndTime(e.target.value)}
                           disabled={isUpdating}
                       />
                    </div>
                 </div>
                 <div className="space-y-2">
                 <Label htmlFor="notes">Notes (Optional)</Label>
                 <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any relevant notes here..."
                    rows={3}
                    disabled={isUpdating}
                 />
                 </div>
             </CardContent>
             <CardFooter className="flex justify-between">
                 <Button type="submit" disabled={isUpdating || !task.trim()}>
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingEntry ? 'Update Task' : <PlusCircle className="mr-2 h-4 w-4" />)}
                    {editingEntry ? 'Update Task' : 'Add Task'}
                 </Button>
                  {editingEntry && (
                    <Button type="button" variant="outline" onClick={() => {setEditingEntry(null); resetForm();}}>
                        Cancel Edit
                    </Button>
                  )}
             </CardFooter>
           </form>
        </Card>


        {/* Tasks for Selected Date */}
        <Card className="lg:col-span-3">
           <CardHeader>
             <CardTitle>Tasks for {format(selectedDate, 'PPP')}</CardTitle> {/* Use PPP for long date format */}
             <CardDescription>Here are your scheduled tasks for the selected date.</CardDescription>
           </CardHeader>
           <CardContent>
             {isLoading ? (
               <div className="flex justify-center items-center p-8">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
             ) : entriesForSelectedDate.length > 0 ? (
               <ul className="space-y-4">
                 {entriesForSelectedDate.map((entry) => (
                   <li key={entry.id} className="flex items-start gap-4 p-4 border rounded-md hover:bg-muted/50 transition-colors">
                     <Checkbox
                        id={`task-${entry.id}`}
                        checked={entry.completed}
                        onCheckedChange={() => handleToggleComplete(entry)}
                        className="mt-1"
                     />
                     <div className="flex-1">
                        <Label
                           htmlFor={`task-${entry.id}`}
                           className={cn("font-medium cursor-pointer", entry.completed && "line-through text-muted-foreground")}
                        >
                            {entry.task}
                        </Label>
                       <div className="text-xs text-muted-foreground space-x-2 mt-1">
                           {entry.startTime && <span>{entry.startTime}{entry.endTime ? ` - ${entry.endTime}` : ''}</span>}
                           {entry.subjectName && <span className="font-semibold">({entry.subjectName})</span>}
                       </div>
                       {entry.notes && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{entry.notes}</p>}
                     </div>
                     <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditing(entry)} title="Edit Task">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteEntry(entry)} title="Delete Task">
                           <Trash2 className="h-4 w-4" />
                        </Button>
                     </div>
                   </li>
                 ))}
               </ul>
             ) : (
               <p className="text-center text-muted-foreground p-8">No tasks scheduled for this date. Add one above!</p>
             )}
           </CardContent>
        </Card>
      </div>
    </div>
  );
}

