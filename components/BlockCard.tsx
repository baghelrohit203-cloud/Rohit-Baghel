
import React from 'react';
import { TimeBlock, ActivityEntry, ActivityStatus } from '../types';
import { ACTIVITY_COLORS } from '../constants';

interface BlockCardProps {
  block: TimeBlock;
  activities: ActivityEntry[];
  isActive: boolean;
  onAdd: (blockId: number) => void;
  onUpdateStatus: (activityId: string, status: ActivityStatus) => void;
  onReschedule: (activityId: string) => void;
}

const BlockCard: React.FC<BlockCardProps> = ({ block, activities, isActive, onAdd, onUpdateStatus, onReschedule }) => {
  return (
    <div className={`p-4 rounded-2xl transition-all duration-300 ${isActive ? 'glass border-blue-500/50 active-ring' : 'glass border-white/5 opacity-80'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className={`font-bold text-sm uppercase tracking-wider ${isActive ? 'text-blue-400' : 'text-gray-400'}`}>
            {block.label}
          </h3>
          <p className="text-xs text-gray-500 mono">{block.startTime} — {block.endTime}</p>
        </div>
        {isActive && (
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
        )}
      </div>

      <div className="space-y-3 min-h-[60px]">
        {activities.length === 0 ? (
          <p className="text-xs italic text-gray-600">Cycle clear...</p>
        ) : (
          activities.map((a) => (
            <div key={a.id} className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACTIVITY_COLORS[a.type] }} />
                    <span className={`font-bold text-xs ${a.status === 'Completed' ? 'line-through opacity-50' : ''}`}>{a.type}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {a.status === 'Completed' ? (
                      <span className="text-emerald-400">Time Taken: {a.estimatedDuration + (a.overtime || 0)}m</span>
                    ) : (
                      <span>Target: {a.estimatedDuration}m | Over: {a.overtime || 0}m</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1 items-center">
                  {a.status === 'Pending' && (
                    <>
                      <button 
                        onClick={() => onUpdateStatus(a.id, 'Completed')}
                        className="p-1.5 hover:bg-emerald-500/20 text-emerald-500 rounded transition-colors"
                        title="Complete"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button 
                        onClick={() => onReschedule(a.id)}
                        className="p-1.5 hover:bg-orange-500/20 text-orange-400 rounded transition-colors"
                        title="Move to Next Block"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </button>
                    </>
                  )}
                  {a.status === 'Completed' && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-500 font-black px-2 py-0.5 rounded uppercase">Done</span>
                  )}
                  {a.status === 'Rescheduled' && (
                    <span className="text-[9px] bg-orange-500/20 text-orange-400 font-black px-2 py-0.5 rounded uppercase">Moved</span>
                  )}
                </div>
              </div>
              <p className={`text-xs text-gray-400 mt-1 leading-tight ${a.status === 'Completed' ? 'opacity-40' : ''}`}>
                {a.description}
              </p>
            </div>
          ))
        )}
      </div>

      <button 
        onClick={() => onAdd(block.id)}
        className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs rounded-lg transition-colors border border-white/5 flex items-center justify-center gap-2 font-bold"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Action
      </button>
    </div>
  );
};

export default BlockCard;
