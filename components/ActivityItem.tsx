
import React, { useState, useEffect } from 'react';
import { ActivityEntry, ActivityStatus } from '../types';
import { ACTIVITY_COLORS } from '../constants';

interface ActivityItemProps {
  activity: ActivityEntry;
  onUpdateStatus: (id: string, status: ActivityStatus) => void;
  onMoveDate: (id: string, newDate: string) => void;
  onEdit: (activity: ActivityEntry) => void;
  onUpdateTimer: (id: string, elapsed: number, isActive: boolean) => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onUpdateStatus, onMoveDate, onEdit, onUpdateTimer }) => {
  const [displayElapsed, setDisplayElapsed] = useState(activity.timer?.totalElapsed || 0);
  const isDone = activity.status === 'Completed';

  useEffect(() => {
    let interval: number;
    if (activity.timer?.isActive && activity.timer.lastStartTime) {
      interval = window.setInterval(() => {
        const currentSession = Date.now() - (activity.timer?.lastStartTime || 0);
        setDisplayElapsed((activity.timer?.totalElapsed || 0) + currentSession);
      }, 1000);
    } else {
      setDisplayElapsed(activity.timer?.totalElapsed || 0);
    }
    return () => clearInterval(interval);
  }, [activity.timer?.isActive, activity.timer?.lastStartTime, activity.timer?.totalElapsed]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    if (activity.timer?.isActive) {
      const total = activity.timer.totalElapsed + (Date.now() - (activity.timer.lastStartTime || 0));
      onUpdateTimer(activity.id, total, false);
    } else {
      onUpdateTimer(activity.id, activity.timer?.totalElapsed || 0, true);
    }
  };

  const stopTimer = () => {
    let finalElapsed = activity.timer?.totalElapsed || 0;
    if (activity.timer?.isActive && activity.timer.lastStartTime) {
      finalElapsed += Date.now() - activity.timer.lastStartTime;
    }
    onUpdateTimer(activity.id, finalElapsed, false);
    onUpdateStatus(activity.id, 'Completed');
  };

  const daysSinceMoved = activity.movedAt ? Math.floor((Date.now() - activity.movedAt) / (1000 * 60 * 60 * 24)) : 0;
  const isUrgent = activity.movedAt && daysSinceMoved >= 5;
  const daysRemaining = activity.movedAt ? Math.max(0, 7 - daysSinceMoved) : null;

  return (
    <div className={`p-4 rounded-2xl transition-all duration-300 glass ${isDone ? 'opacity-60 bg-white/5' : 'bg-white/[0.02]'} ${isUrgent && !isDone ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-white/5'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1 pr-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isUrgent && !isDone ? '#f97316' : ACTIVITY_COLORS[activity.type] }} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDone ? 'text-gray-500' : isUrgent ? 'text-orange-500' : 'text-blue-400'}`}>
                {activity.type} {isUrgent && !isDone && "— URGENT"}
              </span>
            </div>
            {activity.startTime && (
              <div className="flex items-center gap-1.5 opacity-80">
                <span className={`text-[10px] mono font-bold ${activity.alarmEnabled ? 'text-blue-400' : 'text-gray-500'}`}>
                  {activity.startTime}
                </span>
                {activity.alarmEnabled && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-400"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                )}
              </div>
            )}
          </div>
          <h3 className={`font-bold text-sm ${isDone ? 'line-through text-gray-500' : 'text-white'}`}>
            {activity.description}
          </h3>
          {activity.movedFromDate && (
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[9px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/5 font-bold uppercase">
                Moved from {activity.movedFromDate}
              </span>
              {!isDone && daysRemaining !== null && (
                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase ${isUrgent ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-white/5 border-white/5 text-gray-500'}`}>
                  {daysRemaining} days left to finish
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          <button onClick={() => onEdit(activity)} className="p-1.5 hover:bg-white/10 text-gray-500 rounded-lg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <div className="relative group">
            <button className="p-1.5 hover:bg-white/10 text-gray-500 rounded-lg transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </button>
            <input 
              type="date" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => onMoveDate(activity.id, e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex flex-col">
          <span className="text-[10px] mono text-gray-500 uppercase tracking-widest font-bold">Progress</span>
          <span className={`text-lg font-black mono ${activity.timer?.isActive ? 'text-blue-400 animate-pulse' : 'text-white'}`}>
            {formatTime(displayElapsed)}
            <span className="text-[10px] text-gray-600 ml-1">/ {activity.estimatedDuration}m</span>
          </span>
        </div>

        {!isDone && (
          <div className="flex gap-2">
            <button 
              onClick={toggleTimer}
              className={`p-3 rounded-xl transition-all border ${activity.timer?.isActive ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/20'}`}
            >
              {activity.timer?.isActive ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              )}
            </button>
            <button 
              onClick={stopTimer}
              className="p-3 bg-white/5 border border-white/10 text-emerald-500 rounded-xl hover:bg-emerald-500/10 transition-all"
              title="Complete Karma"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityItem;
