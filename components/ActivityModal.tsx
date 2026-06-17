
import React, { useState, useEffect } from 'react';
import { ActivityGroup, ActivityEntry, Goal } from '../types';
import { ACTIVITY_GROUPS, GROUP_COLORS } from '../constants';

interface ActivityModalProps {
  initialData?: ActivityEntry | null;
  goals: Goal[];
  onClose: () => void;
  onSave: (
    group: ActivityGroup, 
    description: string, 
    duration: number, 
    repeatMode: 'none' | 'weekdays' | 'weekends',
    project?: string,
    startTime?: string,
    alarmEnabled?: boolean,
    goalId?: string
  ) => void;
}

const ActivityModal: React.FC<ActivityModalProps> = ({ initialData, goals, onClose, onSave }) => {
  const [group, setGroup] = useState<ActivityGroup>('Daily Maintenance');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('');
  const [duration, setDuration] = useState('30');
  const [repeatMode, setRepeatMode] = useState<'none' | 'weekdays' | 'weekends'>('none');
  const [startTime, setStartTime] = useState('');
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [goalId, setGoalId] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setGroup(initialData.group);
      setDescription(initialData.description);
      setProject(initialData.project || '');
      setDuration(initialData.estimatedDuration.toString());
      setStartTime(initialData.startTime || '');
      setAlarmEnabled(initialData.alarmEnabled || false);
      setGoalId(initialData.goalId || '');
    }
  }, [initialData]);
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xl">
      <div className="w-full max-w-md bg-[#faf8f5] p-6 rounded-[32px] border border-stone-200/65 shadow-2xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-black mb-6 text-[#2b2925] text-center tracking-tighter">
          {initialData ? 'EDIT TASK' : 'NEW TASK'}
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase text-stone-400 font-black mb-3 tracking-[0.2em] text-center">Group</label>
            <div className="grid grid-cols-1 gap-2">
              {ACTIVITY_GROUPS.map(g => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={`py-3 px-4 text-[10px] font-black rounded-xl border transition-all uppercase tracking-tighter relative overflow-hidden flex items-center justify-between ${
                    group === g 
                      ? 'text-white border-transparent' 
                      : 'bg-stone-50 border-stone-200/50 text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                  }`}
                  style={group === g ? { backgroundColor: GROUP_COLORS[g], boxShadow: `0 4px 12px ${GROUP_COLORS[g]}33` } : {}}
                >
                  {g}
                  {group === g && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase text-stone-400 font-black mb-2 tracking-[0.2em]">Activity Details</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Study Quantitative Aptitude"
                className="w-full bg-stone-50 border border-stone-200/80 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#c25e2d]/30 focus:border-[#c25e2d] text-[#2b2925] font-medium placeholder:text-stone-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase text-stone-400 font-black mb-2 tracking-[0.2em]">Project / Tag (Optional)</label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Ex: Banking Exam, Office Project"
                className="w-full bg-stone-50 border border-stone-200/80 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c25e2d]/30 focus:border-[#c25e2d] text-[#c25e2d] mono font-bold placeholder:text-stone-400"
              />
            </div>

            {group === 'Target Work' && goals.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-stone-400 font-black mb-2 tracking-[0.2em]">Align with Goal</label>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200/80 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c25e2d]/30 focus:border-[#c25e2d] text-[#2b2925] font-bold"
                >
                  <option value="">No specific goal</option>
                  {goals.map(goal => (
                    <option key={goal.id} value={goal.id}>{goal.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="block text-[10px] uppercase text-stone-400 font-black mb-2 tracking-[0.2em]">Duration (Mins)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200/80 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#c25e2d]/30 focus:border-[#c25e2d] text-[#2b2925] mono font-bold"
                />
             </div>
             <div className="space-y-1">
                <label className="block text-[10px] uppercase text-stone-400 font-black mb-2 tracking-[0.2em]">Start Time</label>
                <input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200/80 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#c25e2d]/30 focus:border-[#c25e2d] text-[#2b2925] mono font-bold"
                />
             </div>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase text-stone-500 font-black tracking-[0.2em]">Enable Alarm</label>
                <span className="text-[9px] text-stone-400 font-bold">Use alarm tone at start</span>
              </div>
              <button 
                onClick={() => setAlarmEnabled(!alarmEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${alarmEnabled ? 'bg-[#c25e2d]' : 'bg-stone-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${alarmEnabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/40">
            <label className="block text-[10px] uppercase text-stone-500 font-black mb-4 tracking-[0.2em]">Repeat Mode</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={repeatMode === 'weekdays'} 
                  onChange={() => setRepeatMode(prev => prev === 'weekdays' ? 'none' : 'weekdays')}
                  className="hidden peer"
                />
                <div className="w-5 h-5 border-2 border-stone-300 rounded peer-checked:bg-[#c25e2d] peer-checked:border-[#c25e2d] transition-all flex items-center justify-center">
                  {repeatMode === 'weekdays' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span className="text-xs font-bold text-stone-500 group-hover:text-stone-800 transition-colors">Weekdays</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={repeatMode === 'weekends'} 
                  onChange={() => setRepeatMode(prev => prev === 'weekends' ? 'none' : 'weekends')}
                  className="hidden peer"
                />
                <div className="w-5 h-5 border-2 border-stone-300 rounded peer-checked:bg-[#c25e2d] peer-checked:border-[#c25e2d] transition-all flex items-center justify-center">
                  {repeatMode === 'weekends' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span className="text-xs font-bold text-stone-500 group-hover:text-stone-800 transition-colors">Weekends</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-10 pb-2">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-[10px] text-stone-400 hover:text-stone-700 transition-colors uppercase font-black tracking-[0.2em]"
          >
            Discard
          </button>
          <button 
            onClick={() => onSave(group, description, parseInt(duration) || 0, repeatMode, project, startTime, alarmEnabled, goalId)}
            disabled={!description.trim()}
            className="flex-[2] py-4 bg-[#c25e2d] text-white font-black rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-[10px] shadow-lg shadow-[#c25e2d]/15 active:scale-95 hover:bg-[#b05023]"
          >
            {initialData ? 'Update Task' : 'Save Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;
