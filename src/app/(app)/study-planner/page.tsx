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
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, Timestamp, runTransaction } from 'firebase/firestore'; // Import runTransaction
import { format, parse, addDays, startOfWeek, eachDayOfInterval, isSameDay, isValid } from 'date-fns'; // Import isValid
import { Loader2, PlusCircle, Trash2, CalendarIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyPlannerEntry, UserProgress, SubjectMastery } from '@/types/user';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Added AlertTitle
import { Badge } from '@/components/ui/badge'; // Added Badge


export default function StudyPlannerPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [plannerEntries, setPlannerEntries] = useState<StudyPlannerEntry[]>([]);
  const [subjects, setSubjects] = useState<SubjectMastery[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Use this for page loading
  const [isUpdating, setIsUpdating] = useState(false); // For form submission/deletion loading state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewStartDate, setViewStartDate] = useState<Date>(startOfWeek(new Date()));
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form state for adding/editing entries
  const [editingEntry, setEditingEntry] = useState<StudyPlannerEntry | null>(null);
  const [task, setTask] = useState('');
  const [subjectId, setSubjectId] = useState<string>('none'); // Default to 'none'
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [formDate, setFormDate] = useState<Date>(new Date()); // Date for the entry being added/edited

  // Fetch user progress data (including planner entries and subjects)
  useEffect(() => {
      // Start loading if auth is not finished or no user yet
      if (authLoading || !user) {
           setIsLoading(true);
           return; // Wait for auth
      }

      // Proceed with fetch if user exists
      const fetchData = async () => {
        // setIsLoading(true); // Already true or set above
        setFetchError(null); // Reset error on fetch
        try {
          ensureFirebaseInitialized();
          const progressDocRef = doc(db!, 'userProgress', user.uid);
          const progressSnap = await getDoc(progressDocRef);

          if (progressSnap.exists()) {
            const data = progressSnap.data() as UserProgress;
             // Ensure entries are valid and sort them
             const validEntries = (data.studyPlanner || []).filter(entry => entry && entry.id && entry.date && entry.task);
             const sortedEntries = validEntries.sort((a, b) => {
                 const timeA = parseEntryTime(a.startTime);
                 const timeB = parseEntryTime(b.startTime);
                 return timeA - timeB;
             });

            setPlannerEntries(sortedEntries);
            setSubjects(data.subjectMastery || []);
          } else {
            console.log("No progress data found for study planner, initializing with empty.");
            setPlannerEntries([]);
            setSubjects([]);
            // Optionally create the document here if needed, or let the first save handle it
          }
        } catch (error: any) {
          console.error("Error fetching study planner data:", error);
           let errorDesc = "Could not load study planner data.";
           if (error.code === 'permission-denied') {
                errorDesc = "Permission denied. Check Firestore rules.";
                 console.error("Firestore permission denied. Check your security rules in firestore.rules and ensure they are deployed.");
           } else if (error.code === 'unavailable') {
                 errorDesc = "Network error. Could not load planner data.";
           }
           setFetchError(errorDesc);
          toast({ title: "Error", description: errorDesc, variant: "destructive" });
        } finally {
          setIsLoading(false); // Stop loading after fetch attempt
        }
      };
      fetchData();
  }, [user, authLoading, toast]); // Dependencies

  // Helper to parse time for sorting
  const parseEntryTime = (timeStr?: string): number => {
      if (!timeStr) return Infinity; // Put entries without time at the end
      try {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
      } catch {
          return Infinity;
      }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && isValid(date)) { // Ensure date is valid
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
    if (!user) {
        toast({title: "Error", description: "You must be logged in.", variant: "destructive"});
        return;
    }
    if (!task.trim()) {
         toast({title: "Error", description: "Task description cannot be empty.", variant: "destructive"});
        return;
    }
     if (!isValid(formDate)) {
         toast({title: "Error", description: "Invalid date selected for the task.", variant: "destructive"});
        return;
    }

    setIsUpdating(true);
    const selectedSubject = subjects.find(s => s.subjectId === subjectId);
    const formattedDate = format(formDate, 'yyyy-MM-dd');

    const entryData: Omit<StudyPlannerEntry, 'id' | 'completed'> = {
      date: formattedDate,
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
        await runTransaction(db!, async (transaction) => {
            console.log(`Transaction started for ${editingEntry ? 'updating' : 'adding'} task.`);
            const progressSnap = await transaction.get(progressDocRef);
            let currentEntries: StudyPlannerEntry[] = [];

            if (progressSnap.exists()) {
                currentEntries = (progressSnap.data() as UserProgress)?.studyPlanner || [];
            } else {
                 console.log("UserProgress document does not exist, will create it.");
                 // No need to do anything here, set/update logic below handles creation
            }

            let updatedEntries: StudyPlannerEntry[];

            if (editingEntry) {
                 // Update: find index, replace entry
                 const entryIndex = currentEntries.findIndex(e => e.id === editingEntry.id);
                 if (entryIndex === -1) {
                      console.error("Original entry not found in Firestore during update. ID:", editingEntry.id);
                      throw new Error("Could not find the original task to update.");
                 }
                 const updatedEntryObject: StudyPlannerEntry = {
                    ...editingEntry, // Keep original ID and completion status
                    ...entryData, // Apply new data
                    date: formattedDate, // Ensure date is updated if changed in form
                 };
                 updatedEntries = [...currentEntries];
                 updatedEntries[entryIndex] = updatedEntryObject;
                 console.log("Prepared updated entry:", updatedEntryObject);

            } else {
                 // Add new entry
                 const newEntry: StudyPlannerEntry = {
                     ...entryData,
                     id: `task-${Date.now()}-${user.uid.substring(0,5)}`, // More robust unique ID
                     completed: false,
                 };
                 updatedEntries = [...currentEntries, newEntry];
                 console.log("Prepared new entry:", newEntry);
            }

            // Sort entries after modification before saving
            const sortedUpdatedEntries = updatedEntries.sort((a, b) => {
                const timeA = parseEntryTime(a.startTime);
                const timeB = parseEntryTime(b.startTime);
                return timeA - timeB;
            });

            // Update or set the document
            if (progressSnap.exists()) {
                 transaction.update(progressDocRef, { studyPlanner: sortedUpdatedEntries, lastUpdated: Timestamp.now() });
                 console.log("Updating existing document with new planner.");
            } else {
                  // Create the document if it doesn't exist
                   const defaultProgress: UserProgress = {
                       uid: user.uid,
                       subjectMastery: subjects, // Use current subjects if available
                       upcomingHomework: [],
                       upcomingExams: [],
                       studyRecommendations: [],
                       quizHistory: [],
                       studyPlanner: sortedUpdatedEntries,
                       lastUpdated: Timestamp.now(),
                  };
                 transaction.set(progressDocRef, defaultProgress);
                 console.log("Creating new document with planner.");
            }
        });

        console.log("Transaction successful.");
        // Optimistically update UI after successful transaction (fetch again or update state)
        // Fetching again is safer to ensure consistency
         const updatedSnap = await getDoc(progressDocRef);
         if (updatedSnap.exists()) {
             const updatedData = updatedSnap.data() as UserProgress;
             const sortedEntries = (updatedData.studyPlanner || []).sort((a, b) => parseEntryTime(a.startTime) - parseEntryTime(b.startTime));
             setPlannerEntries(sortedEntries);
         }

        toast({ title: "Success", description: `Study task ${editingEntry ? 'updated' : 'added'}.` });
        resetForm();
        setEditingEntry(null);

    } catch (error: any) {
        console.error("Error saving study planner entry:", error);
        let errorDesc = `Could not ${editingEntry ? 'update' : 'add'} study task.`;
        if (error.code === 'permission-denied') {
           errorDesc = "Permission denied. Check Firestore rules.";
        } else if (error.message.includes("transaction")) {
            errorDesc = `Database error: ${error.message}. Please try again.`;
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

    // Optimistically remove from UI
    const originalEntries = [...plannerEntries];
    setPlannerEntries(prev => prev.filter(e => e.id !== entryToDelete.id));
    if (editingEntry?.id === entryToDelete.id) {
        resetForm();
        setEditingEntry(null);
    }

    setIsUpdating(true); // Use the same loading state, or a dedicated one
    const progressDocRef = doc(db!, 'userProgress', user.uid);

    try {
        ensureFirebaseInitialized();
        // We need the exact object stored in Firestore to remove it with arrayRemove
        // Fetch the current document state within a transaction for safety
        await runTransaction(db!, async (transaction) => {
             const progressSnap = await transaction.get(progressDocRef);
             if (!progressSnap.exists()) {
                 console.warn("Tried to delete entry, but user progress document doesn't exist.");
                 throw new Error("User data not found."); // Abort transaction
             }
             const currentData = progressSnap.data() as UserProgress;
             const currentEntries = currentData.studyPlanner || [];
             // Find the *exact* entry object to remove from the potentially stale server state
             const entryToRemoveFromServer = currentEntries.find(e => e.id === entryToDelete.id);

             if (!entryToRemoveFromServer) {
                  console.warn(`Task with ID ${entryToDelete.id} not found in Firestore document during delete transaction.`);
                  // Decide how to handle: maybe the task was already deleted?
                  // For now, we'll proceed assuming it's okay, but log a warning.
                  // If strict consistency is required, throw an error here.
                  // throw new Error("Task to delete was not found on the server.");
             } else {
                  // Only attempt removal if found
                 transaction.update(progressDocRef, {
                     studyPlanner: arrayRemove(entryToRemoveFromServer),
                     lastUpdated: Timestamp.now()
                 });
             }
        });

        toast({ title: "Success", description: "Study task deleted." });
        // UI already updated optimistically
    } catch (error: any) {
        console.error("Error deleting study planner entry:", error);
        // Revert optimistic UI update on error
        setPlannerEntries(originalEntries);
        let errorDesc = "Could not delete study task.";
        if (error.code === 'permission-denied') {
           errorDesc = "Permission denied. Check Firestore rules.";
        } else if (error.message.includes("transaction")) {
             errorDesc = `Database error: ${error.message}. Please try again.`;
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

    const updatedEntry = { ...entryToToggle, completed: !entryToToggle.completed };

    // Optimistically update UI first
    setPlannerEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e).sort((a,b)=> parseEntryTime(a.startTime) - parseEntryTime(b.startTime)));
    if (editingEntry?.id === updatedEntry.id) {
        setEditingEntry(updatedEntry);
    }

    // Update Firestore using transaction
    const progressDocRef = doc(db!, 'userProgress', user.uid);
    try {
       ensureFirebaseInitialized();
        await runTransaction(db!, async (transaction) => {
             const progressSnap = await transaction.get(progressDocRef);
             if (!progressSnap.exists()) {
                  throw new Error("User data not found.");
             }
             const currentData = progressSnap.data() as UserProgress;
             const currentEntries = currentData.studyPlanner || [];
             const entryIndex = currentEntries.findIndex(e => e.id === entryToToggle.id);

             if (entryIndex === -1) {
                 console.warn(`Task with ID ${entryToToggle.id} not found in Firestore during toggle complete.`);
                 throw new Error("Task to update was not found on the server.");
             }

             const entriesWithToggled = [...currentEntries];
             entriesWithToggled[entryIndex] = updatedEntry;

             // Sort again before saving
             const sortedEntries = entriesWithToggled.sort((a, b) => parseEntryTime(a.startTime) - parseEntryTime(b.startTime));

             transaction.update(progressDocRef, {
                 studyPlanner: sortedEntries,
                 lastUpdated: Timestamp.now()
             });
        });
        console.log("Task completion status updated in Firestore.");
    } catch (error: any) {
       console.error("Error toggling task completion:", error);
       // Revert optimistic UI update on error
       setPlannerEntries(prev => prev.map(e => e.id === entryToToggle.id ? entryToToggle : e).sort((a,b)=> parseEntryTime(a.startTime) - parseEntryTime(b.startTime)));
       if (editingEntry?.id === entryToToggle.id) {
           setEditingEntry(entryToToggle);
       }
        let errorDesc = "Could not update task status.";
       if (error.code === 'permission-denied') {
           errorDesc = "Permission denied. Check Firestore rules.";
        } else if (error.message.includes("transaction")) {
             errorDesc = `Database error: ${error.message}. Please try again.`;
        } else if (error instanceof Error) {
            errorDesc = error.message;
        }
       toast({ title: "Update Failed", description: errorDesc, variant: "destructive" });
    }
};

  const resetForm = () => {
    setTask('');
    setSubjectId('none'); // Reset to 'none'
    setStartTime('');
    setEndTime('');
    setNotes('');
    setFormDate(selectedDate); // Reset form date to currently selected calendar date
  };

   const startEditing = (entry: StudyPlannerEntry) => {
       setEditingEntry(entry);
       setTask(entry.task);
       setSubjectId(entry.subjectId || 'none'); // Use 'none' if subjectId is undefined/empty
       setStartTime(entry.startTime || '');
       setEndTime(entry.endTime || '');
       setNotes(entry.notes || '');
        try {
            const parsedDate = parse(entry.date, 'yyyy-MM-dd', new Date());
            if (isValid(parsedDate)) {
                setFormDate(parsedDate); // Set form date to the entry's date
            } else {
                 console.warn("Invalid date format in entry being edited:", entry.date);
                 setFormDate(selectedDate); // Fallback to selected date
            }
        } catch (e) {
            console.error("Error parsing date for editing:", e);
             setFormDate(selectedDate); // Fallback
        }
   };

  const weekDays = eachDayOfInterval({ start: viewStartDate, end: addDays(viewStartDate, 6) });

  const entriesForSelectedDate = plannerEntries.filter(entry =>
     {
         try {
              const entryDate = parse(entry.date, 'yyyy-MM-dd', new Date());
              return isValid(entryDate) && isSameDay(entryDate, selectedDate);
         } catch {
              return false; // Ignore entries with invalid dates
         }
     }
  ); // Sorting is now done when setting state

  // Consolidated Loading State
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading planner...</p>
      </div>
    );
  }

   // Handle fetch error state
   if (fetchError) {
        return (
            <div className="container mx-auto py-8 text-center">
                <h1 className="text-3xl font-bold mb-6">Study Planner</h1>
                 <Alert variant="destructive" className="max-w-md mx-auto">
                     <AlertTriangle className="h-4 w-4" />
                     <AlertTitle>Error Loading Data</AlertTitle>
                     <AlertDescription>{fetchError}</AlertDescription>
                 </Alert>
            </div>
        );
    }
   // Handle no user after loading
   if (!user) {
        return (
            <div className="container mx-auto py-8 text-center">
                <h1 className="text-3xl font-bold mb-6">Study Planner</h1>
                 <Alert variant="destructive" className="max-w-md mx-auto">
                     <AlertTriangle className="h-4 w-4" />
                     <AlertTitle>Authentication Required</AlertTitle>
                     <AlertDescription>Please log in to use the study planner.</AlertDescription>
                 </Alert>
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
                   className="rounded-md border shadow-sm"
                    month={viewStartDate} // Control displayed month
                    onMonthChange={setViewStartDate} // Allow month navigation within calendar
                    // Highlight days with tasks (optional enhancement)
                     modifiers={{
                        hasTasks: plannerEntries.map(e => {
                            try { return parse(e.date, 'yyyy-MM-dd', new Date()) } catch { return undefined }
                        }).filter(d => d && isValid(d)) as Date[], // Filter out invalid dates
                    }}
                    modifiersClassNames={{
                        hasTasks: 'bg-primary/10 dark:bg-primary/20 font-bold rounded-full', // Example styling
                    }}
                    disabled={isUpdating} // Disable calendar during updates
               />
                 <div className="flex justify-between w-full mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleWeekChange('prev')} disabled={isUpdating}>Previous Week</Button>
                    <Button variant="outline" size="sm" onClick={() => handleWeekChange('next')} disabled={isUpdating}>Next Week</Button>
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
                            id="form-date"
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !formDate && "text-muted-foreground"
                            )}
                             disabled={isUpdating}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formDate && isValid(formDate) ? format(formDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={formDate}
                            onSelect={(d) => d && isValid(d) && setFormDate(d)} // Only set valid dates
                            initialFocus
                            disabled={isUpdating}
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
             <CardFooter className="flex justify-between items-center gap-2">
                 <Button type="submit" disabled={isUpdating || !task.trim()}>
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingEntry ? null : <PlusCircle className="mr-2 h-4 w-4" />)}
                    {isUpdating ? 'Saving...' : (editingEntry ? 'Update Task' : 'Add Task')}
                 </Button>
                  {editingEntry && (
                    <Button type="button" variant="ghost" onClick={() => {setEditingEntry(null); resetForm();}} disabled={isUpdating}>
                        Cancel Edit
                    </Button>
                  )}
             </CardFooter>
           </form>
        </Card>


        {/* Tasks for Selected Date */}
        <Card className="lg:col-span-3">
           <CardHeader>
             <CardTitle>Tasks for {format(selectedDate, 'PPP')}</CardTitle>
             <CardDescription>Your scheduled tasks for the selected date.</CardDescription>
           </CardHeader>
           <CardContent>
             {entriesForSelectedDate.length > 0 ? (
               <ul className="space-y-3">
                 {entriesForSelectedDate.map((entry) => (
                   <li key={entry.id} className="flex items-start gap-4 p-3 border rounded-md bg-card hover:bg-muted/50 transition-colors shadow-sm">
                     <Checkbox
                        id={`task-${entry.id}`}
                        checked={entry.completed}
                        onCheckedChange={() => handleToggleComplete(entry)}
                        className="mt-1 flex-shrink-0"
                        aria-labelledby={`task-label-${entry.id}`}
                        disabled={isUpdating} // Disable checkbox while any update is happening
                     />
                     <div className="flex-1 space-y-0.5">
                        <Label
                           id={`task-label-${entry.id}`}
                           htmlFor={`task-${entry.id}`}
                           className={cn("font-medium cursor-pointer", entry.completed && "line-through text-muted-foreground")}
                        >
                            {entry.task}
                        </Label>
                       <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
                           {entry.startTime && <span>{entry.startTime}{entry.endTime ? ` - ${entry.endTime}` : ''}</span>}
                           {entry.subjectName && <Badge variant="outline" className="text-xs">{entry.subjectName}</Badge>}
                       </div>
                       {entry.notes && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap pt-1 border-t border-dashed border-border/50">{entry.notes}</p>}
                     </div>
                     <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditing(entry)} title="Edit Task" disabled={isUpdating}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                             <span className="sr-only">Edit Task</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteEntry(entry)} title="Delete Task" disabled={isUpdating}>
                           <Trash2 className="h-4 w-4" />
                           <span className="sr-only">Delete Task</span>
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
