
import { ActivityGroup, TimeBlock, NoteType } from './types';

export const ACTIVITY_GROUPS: ActivityGroup[] = ['Daily Maintenance', 'Office Work', 'Target Work'];

export const GROUP_COLORS: Record<ActivityGroup, string> = {
  'Daily Maintenance': '#3b6e4c', // Moss Green (Environment & grounding)
  'Office Work': '#2d5a7b',       // Deep Slate Lake (Professional stability)
  'Target Work': '#c25e2d',       // Terracotta/Clay (Creative focus & action)
};

export const NOTE_TYPES: NoteType[] = ['Journal', 'Reflection', 'Goal', 'Distraction'];

export const NOTE_COLORS: Record<NoteType, string> = {
  Journal: '#7a523a',       // Warm Chestnut
  Reflection: '#2d6a4f',    // Forest Pine
  Goal: '#b87d14',          // Harvest Bronze
  Distraction: '#c53030'    // Rosewood / Wild Berry
};


export const BLOCKS: TimeBlock[] = [
  { id: 1, label: 'Brahma Muhurta', startTime: '04:00', endTime: '08:00' },
  { id: 2, label: 'Pratah', startTime: '08:00', endTime: '12:00' },
  { id: 3, label: 'Madhyahna', startTime: '12:00', endTime: '16:00' },
  { id: 4, label: 'Aparahna', startTime: '16:00', endTime: '20:00' },
  { id: 5, label: 'Sayahna', startTime: '20:00', endTime: '00:00' },
  { id: 6, label: 'Nishita', startTime: '00:00', endTime: '04:00' },
];
