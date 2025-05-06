
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string; // Firebase Auth UID
  name: string;
  email: string; // From Firebase Auth, stored for convenience
  avatarUrl?: string;
  schoolBoard?: string; // e.g., 'cbse', 'icse'
  grade?: string; // e.g., '10', '12'
  joinDate?: Timestamp | Date | string; // Store as Timestamp in Firestore, handle conversion
  lastLogin?: Timestamp | Date | string; // Store as Timestamp
  // User preferences (can be expanded)
  preferences?: {
    darkMode?: boolean;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    voiceCommands?: boolean;
  };
}

export interface SubjectMastery {
  subjectId: string; // e.g., 'math', 'physics'
  subjectName: string; // e.g., 'Mathematics', 'Physics'
  progress: number; // Percentage (0-100)
  lastUpdated: Timestamp | Date | string;
}

export interface HomeworkAssignment {
    id: string; // Unique ID for the homework
    subjectId: string;
    subjectName: string;
    title: string;
    description?: string;
    dueDate: Timestamp | Date | string; // Store as Timestamp
    completed: boolean;
    score?: number; // Optional score
}

export interface ExamSchedule {
    id: string; // Unique ID for the exam
    subjectId: string;
    subjectName: string;
    title: string; // e.g., 'Midterm Exam'
    date: Timestamp | Date | string; // Store as Timestamp
    topics?: string[]; // Optional list of topics
}

export interface StudyRecommendation {
    id: string; // Unique ID
    type: 'topic_review' | 'practice_quiz' | 'concept_clarification';
    subjectId: string;
    subjectName: string;
    title: string; // e.g., 'Review Newton\'s Laws'
    reason: string; // e.g., 'Low score on last quiz'
    priority: 'high' | 'medium' | 'low';
    generatedDate: Timestamp | Date | string;
}

// Represents a single question within a quiz, consistent with Genkit Flow output
export interface QuizQuestion {
    question: string;
    type: 'multiple-choice' | 'fill-in-the-blanks' | 'true/false' | 'short-answer';
    answers?: string[]; // Options for multiple-choice
    correctAnswer: string;
    // subjectId?: string; // Optional: If flow can provide subject context
}

// Represents the result of a completed quiz attempt saved in Firestore
export interface QuizResult {
    quizId: string; // Unique ID for this quiz instance
    generatedDate: Timestamp | Date | string; // Use Firestore Timestamp for reliable sorting/querying
    sourceContent?: string; // Optional: snippet of the source text for context
    questions: QuizQuestion[]; // Array of the questions in the quiz
    userAnswers: (string | undefined)[]; // User's answers corresponding to questions array
    score: number; // Number of correct answers
    totalQuestions: number; // Total number of questions
    difficulty?: 'easy' | 'medium' | 'hard'; // Store the quiz difficulty
}

export interface StudyPlannerEntry {
    id: string; // Unique ID for the entry
    date: string; // Store as YYYY-MM-DD string for simplicity
    subjectId?: string;
    subjectName?: string;
    task: string; // e.g., "Read Chapter 5", "Practice Algebra Problems"
    startTime?: string; // e.g., "10:00" (Optional)
    endTime?: string; // e.g., "11:30" (Optional)
    completed: boolean;
    notes?: string; // Optional notes
}

// Represents the main progress document for a user in Firestore
export interface UserProgress {
  uid: string; // Corresponds to UserProfile uid
  subjectMastery: SubjectMastery[];
  upcomingHomework: HomeworkAssignment[];
  upcomingExams: ExamSchedule[];
  studyRecommendations: StudyRecommendation[];
  quizHistory?: QuizResult[]; // Array to store past quiz results
  studyPlanner?: StudyPlannerEntry[]; // Array to store study plan entries
  lastUpdated: Timestamp | Date | string; // Store as Timestamp
}
