
export type ActivityGroup = 'Daily Maintenance' | 'Office Work' | 'Target Work';
export type ActivityStatus = 'Pending' | 'Completed' | 'Rescheduled';
export type ReportInterval = 'Daily' | 'Weekly' | 'Monthly';

export type NoteType = 'Journal' | 'Reflection' | 'Goal' | 'Distraction';

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  isCompleted: boolean;
  createdAt: number;
}

export interface Distraction {
  id: string;
  activityId: string;
  description: string;
  timestamp: number;
}

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

export interface ProjectBlock {
  id: string;
  topic: string;
  content: string;
  timestamp: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  project?: string;
  blocks?: ProjectBlock[]; // Specifically for Current Project type
  createdAt: number;
  updatedAt: number;
}

export interface ActivityEntry {
  id: string;
  date: string; // YYYY-MM-DD
  group: ActivityGroup;
  project?: string;
  description: string;
  timestamp: number;
  estimatedDuration: number; // minutes
  actualDuration?: number; // minutes, from timer
  status: ActivityStatus;
  rescheduledTo?: string; // date string
  movedFromDate?: string; // original date before rescheduling
  movedAt?: number; // timestamp of when it was moved
  timer?: TimerState;
  startTime?: string; // HH:mm format
  alarmEnabled?: boolean;
  goalId?: string; // Link to a long-term goal
  distractions?: string[]; // List of distraction descriptions
  imageUrl?: string; // Image proof for task check / completion
}

export type VaultCategory = 'Journal' | 'Checklist' | 'Planner' | 'Idea' | 'ProjectInfo' | 'Other';

export interface VaultListItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface VaultEntry {
  id: string;
  category: VaultCategory;
  title: string;
  content: string; // Used for Journal, Idea, Other, ProjectInfo content
  listItems?: VaultListItem[]; // Used for Checklist, Planner
  date?: string; // Used for Planner date, Journal day
  projectTag?: string; // Used for ProjectInfo tag reference
  impactRating?: number; // Used for Idea impact rating (1-5)
  status?: 'active' | 'completed' | 'on-hold' | 'backlog'; // Used for ProjectInfo status
  createdAt: number;
  updatedAt: number;
}

export interface PriceRecord {
  id: string;
  price: number;
  currency: string;
  dateRecorded: string;
  location?: string;
  city?: string;
  state?: string;
  supplierName?: string;
  unit?: string; // e.g., 1 Kg, 1 Litre, 100g, Per Unit
  notes?: string;
  contact?: string; // Phone, Email or Shop detail
  reliability?: number; // 1-5 rating on reliability or quality
}

export interface PriceArticle {
  id: string;
  name: string; // e.g. "Alwar Onions", "Gold (24K)", "Mustard Oil"
  category: string; // e.g. "Vegetables", "Electronics", "Groceries", "Fuel", "Custom"
  tags: string[]; // e.g. ["fresh", "organic", "mains", "wholesale"]
  records: PriceRecord[];
  createdAt: number;
  updatedAt: number;
}

export interface ContentIndexEntry {
  id: string;
  contentType: 'vault' | 'price_article';
  sourceId: string;
  title: string;
  category: string;
  sequenceOrder: number;
  uniqueKey: string;
  highPrice?: number;
  lowPrice?: number;
  currency?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  activities: ActivityEntry[];
  notes: Note[];
  goals: Goal[];
  currentView: 'dashboard' | 'stats' | 'goals' | 'log' | 'focus' | 'vault' | 'watchlist' | 'sync' | 'summary';
  selectedDate: string;
  reportInterval: ReportInterval;
}
