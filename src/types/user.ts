export interface UserProfile {
  uid: string; // Firebase Auth UID
  name: string;
  email: string; // From Firebase Auth, stored for convenience
  avatarUrl?: string;
  schoolBoard?: string; // e.g., 'cbse', 'icse'
  grade?: string; // e.g., '10', '12'
  joinDate?: Date | string; // Store as Timestamp in Firestore, handle conversion
  lastLogin?: Date | string; // Store as Timestamp
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
  lastUpdated: Date | string;
}

export interface HomeworkAssignment {
    id: string; // Unique ID for the homework
    subjectId: string;
    subjectName: string;
    title: string;
    description?: string;
    dueDate: Date | string; // Store as Timestamp
    completed: boolean;
    score?: number; // Optional score
}

export interface ExamSchedule {
    id: string; // Unique ID for the exam
    subjectId: string;
    subjectName: string;
    title: string; // e.g., 'Midterm Exam'
    date: Date | string; // Store as Timestamp
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
    generatedDate: Date | string;
}

export interface QuizQuestion {
    question: string;
    type: 'multiple-choice' | 'fill-in-the-blanks' | 'true/false' | 'short-answer';
    answers?: string[];
    correctAnswer: string;
}

export interface QuizResult {
    quizId: string; // Unique ID for this quiz instance
    generatedDate: Date | string;
    sourceContent?: string; // Optional: snippet of the source text
    questions: QuizQuestion[];
    userAnswers: (string | undefined)[];
    score: number;
    totalQuestions: number;
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

export interface UserProgress {
  uid: string; // Corresponds to UserProfile uid
  subjectMastery: SubjectMastery[];
  upcomingHomework: HomeworkAssignment[];
  upcomingExams: ExamSchedule[];
  studyRecommendations: StudyRecommendation[];
  quizHistory?: QuizResult[]; // Add quiz history
  studyPlanner?: StudyPlannerEntry[]; // Add study planner entries
  lastUpdated: Date | string;
}
