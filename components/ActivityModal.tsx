
import React, { useState, useEffect } from 'react';
import { ActivityType, ActivityEntry } from '../types';
import { ACTIVITY_TYPES, ACTIVITY_COLORS } from '../constants';

interface ActivityModalProps {
  initialData?: ActivityEntry | null;
  onClose: () => void;
  onSave: (
    type: ActivityType, 
    description: string, 
    duration: number, 
    overtime: number, 
    repeatMode: 'none' | 'weekdays' | 'weekends',
    startTime?: string,
    alarmEnabled?: boolean
  ) => void;
}

const ActivityModal: React.FC<ActivityModalProps> = ({ initialData, onClose, onSave }) => {
  const [type, setType] = useState<ActivityType>('Work');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [overtime, setOvertime] = useState('0');
  const [repeatMode, setRepeatMode] = useState<'none' | 'weekdays' | 'weekends'>('none');
  const [startTime, setStartTime] = useState('');
  const [alarmEnabled, setAlarmEnabled] = useState(false);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setDescription(initialData.description);
      setDuration(initialData.estimatedDuration.toString());
      setOvertime(initialData.overtime.toString());
      setStartTime(initialData.startTime || '');
      setAlarmEnabled(initialData.alarmEnabled || false);
    }
  }, [initialData]);
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <div className="w-full max-w-md glass p-6 rounded-3xl border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-black mb-6 text-white text-center tracking-tighter">
          {initialData ? 'EDIT KARMA' : 'NEW KARMA ACTION'}
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase text-gray-500 font-black mb-3 tracking-[0.2em] text-center">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-3 text-[10px] font-black rounded-xl border transition-all uppercase tracking-tighter relative overflow-hidden ${
                    type === t 
                      ? 'text-white border-transparent' 
                      : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                  }`}
                  style={type === t ? { backgroundColor: ACTIVITY_COLORS[t], boxShadow: `0 0 15px ${ACTIVITY_COLORS[t]}66` } : {}}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] uppercase text-gray-500 font-black mb-2 tracking-[0.2em]">Activity Details</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Study advanced React patterns"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-white font-medium placeholder:text-gray-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="block text-[10px] uppercase text-gray-500 font-black mb-2 tracking-[0.2em]">Target (Mins)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-white mono"
                />
             </div>
             <div className="space-y-1">
                <label className="block text-[10px] uppercase text-gray-500 font-black mb-2 tracking-[0.2em]">Overtime (Mins)</label>
                <input
                  type="number"
                  value={overtime}
                  onChange={(e) => setOvertime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 text-white mono"
                />
             </div>
          </div>

          <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase text-gray-500 font-black tracking-[0.2em]">Start Time</label>
                <span className="text-[9px] text-gray-600 font-bold">Scheduled activation</span>
              </div>
              <input 
                type="time" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white mono text-sm outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase text-gray-500 font-black tracking-[0.2em]">Enable Alarm</label>
                <span className="text-[9px] text-gray-600 font-bold">Use alarm tone at start</span>
              </div>
              <button 
                onClick={() => setAlarmEnabled(!alarmEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${alarmEnabled ? 'bg-blue-600' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${alarmEnabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
            <label className="block text-[10px] uppercase text-gray-500 font-black mb-4 tracking-[0.2em]">Batch Sync (Weekday/Weekend)</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={repeatMode === 'weekdays'} 
                  onChange={() => setRepeatMode(prev => prev === 'weekdays' ? 'none' : 'weekdays')}
                  className="hidden peer"
                />
                <div className="w-5 h-5 border-2 border-white/20 rounded peer-checked:bg-blue-600 peer-checked:border-blue-400 transition-all flex items-center justify-center">
                  {repeatMode === 'weekdays' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">Weekdays</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={repeatMode === 'weekends'} 
                  onChange={() => setRepeatMode(prev => prev === 'weekends' ? 'none' : 'weekends')}
                  className="hidden peer"
                />
                <div className="w-5 h-5 border-2 border-white/20 rounded peer-checked:bg-blue-600 peer-checked:border-blue-400 transition-all flex items-center justify-center">
                  {repeatMode === 'weekends' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">Weekends</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-10 pb-2">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-[10px] text-gray-600 hover:text-white transition-colors uppercase font-black tracking-[0.2em]"
          >
            Discard
          </button>
          <button 
            onClick={() => onSave(type, description, parseInt(duration) || 0, parseInt(overtime) || 0, repeatMode, startTime, alarmEnabled)}
            disabled={!description.trim()}
            className="flex-[2] py-4 bg-white text-black font-black rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-[10px] shadow-xl shadow-white/10 active:scale-95"
          >
            {initialData ? 'Update Karma' : 'Record Cycle'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;
