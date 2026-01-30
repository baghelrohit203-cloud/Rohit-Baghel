
import React from 'react';
import { Note } from '../types';
import { NOTE_COLORS } from '../constants';

interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick }) => {
  const dateStr = new Date(note.updatedAt).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <div 
      onClick={() => onClick(note)}
      className="glass p-5 rounded-3xl border-white/5 hover:border-white/20 transition-all active:scale-[0.98] cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span 
            className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest text-white/80"
            style={{ backgroundColor: `${NOTE_COLORS[note.type]}33`, border: `1px solid ${NOTE_COLORS[note.type]}55` }}
          >
            {note.type}
          </span>
          {note.project && (
            <span className="text-[9px] mono font-bold text-gray-600 lowercase tracking-tighter">
              #{note.project}
            </span>
          )}
        </div>
        <span className="text-[10px] mono text-gray-600 font-bold uppercase">{dateStr}</span>
      </div>
      <h3 className="text-lg font-black text-white leading-tight mb-2 group-hover:text-blue-400 transition-colors">
        {note.title}
      </h3>
      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mono opacity-80">
        {note.content}
      </p>
    </div>
  );
};

export default NoteCard;
