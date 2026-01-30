
export type ActivityType = 'Work' | 'Study' | 'Home' | 'Sleep' | 'Workout' | 'Other';
export type ActivityStatus = 'Pending' | 'Completed' | 'Rescheduled';
export type ReportInterval = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';

export type NoteType = 'Journal' | 'Planner' | 'Reflection' | 'Idea';

export interface TimeBlock {
  id: number;
  label: string;
  startTime: string;
  endTime: string;
}

export interface TimerState {
  isActive: boolean;
  lastStartTime: number | null;
  totalElapsed: number; // in milliseconds
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  project?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ActivityEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: ActivityType;
  project?: string;
  description: string;
  timestamp: number;
  estimatedDuration: number; // minutes
  overtime: number; // minutes
  status: ActivityStatus;
  rescheduledTo?: string; // date string
  movedFromDate?: string; // date string
  movedAt?: number; // timestamp
  blockId?: number;
  timer?: TimerState;
  startTime?: string; // HH:mm format
  alarmEnabled?: boolean;
}

export interface AppState {
  activities: ActivityEntry[];
  notes: Note[];
  currentView: 'dashboard' | 'stats' | 'coach' | 'backlog' | 'scribe';
  selectedDate: string;
  reportInterval: ReportInterval;
}
