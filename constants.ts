
import { ActivityType, TimeBlock } from './types';

export const ACTIVITY_TYPES: ActivityType[] = ['Work', 'Study', 'Home', 'Sleep', 'Workout', 'Other'];

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  Work: '#3b82f6',    // Bright Blue
  Study: '#f59e0b',   // Amber/Orange-Yellow
  Home: '#10b981',    // Emerald Green
  Sleep: '#8b5cf6',   // Vivid Purple
  Workout: '#ef4444', // Vibrant Red
  Other: '#ec4899',   // Pink/Magenta
};

// Added BLOCKS constant defining the six 4-hour cycles (6x4 = 24 hours) for the Karma Chakra structure
export const BLOCKS: TimeBlock[] = [
  { id: 1, label: 'Brahma Muhurta', startTime: '04:00', endTime: '08:00' },
  { id: 2, label: 'Pratah', startTime: '08:00', endTime: '12:00' },
  { id: 3, label: 'Madhyahna', startTime: '12:00', endTime: '16:00' },
  { id: 4, label: 'Aparahna', startTime: '16:00', endTime: '20:00' },
  { id: 5, label: 'Sayahna', startTime: '20:00', endTime: '00:00' },
  { id: 6, label: 'Nishita', startTime: '00:00', endTime: '04:00' },
];
