export interface UserProfile {
  uid: string; // Firebase Auth UID
  name: string;
  email: string; // From Firebase Auth, stored for convenience
  avatarUrl?: string;
  schoolBoard?: string; // e.g., 'cbse', 'icse'
  grade?: string; // e.g., '10', '12'
  joinDate?: Date | string; // Store as Timestamp in Firestore, handle conversion
  lastLogin?: Date | string; // Store as Timestamp
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


export interface UserProgress {
  uid: string; // Corresponds to UserProfile uid
  subjectMastery: SubjectMastery[];
  upcomingHomework: HomeworkAssignment[];
  upcomingExams: ExamSchedule[];
  studyRecommendations: StudyRecommendation[];
  lastUpdated: Date | string;
}
