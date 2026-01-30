
import React, { useState, useEffect } from 'react';
import { Note, NoteType } from '../types';
import { NOTE_TYPES, NOTE_COLORS } from '../constants';

interface NoteModalProps {
  initialData?: Note | null;
  onClose: () => void;
  onSave: (title: string, content: string, type: NoteType) => void;
  onDelete?: (id: string) => void;
}

const NoteModal: React.FC<NoteModalProps> = ({ initialData, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NoteType>('Journal');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setType(initialData.type);
    }
  }, [initialData]);

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col animate-in fade-in duration-300">
      <header className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]">
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
        <div className="flex gap-2">
           {initialData && onDelete && (
             <button 
               onClick={() => { if(confirm('Delete this entry?')) onDelete(initialData.id); }}
               className="px-4 py-2 text-xs font-black text-red-500 hover:bg-red-500/10 rounded-xl transition-all uppercase tracking-widest"
             >
               Delete
             </button>
           )}
           <button 
             onClick={() => onSave(title, content, type)}
             disabled={!title.trim() || !content.trim()}
             className="px-6 py-2 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-500 transition-all uppercase tracking-widest disabled:opacity-30"
           >
             Save Entry
           </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-2xl mx-auto w-full">
        <div className="flex flex-wrap gap-2 justify-center">
          {NOTE_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 text-[10px] font-black rounded-full border transition-all uppercase tracking-tighter ${
                type === t 
                  ? 'text-white border-transparent' 
                  : 'bg-white/5 border-white/5 text-gray-500'
              }`}
              style={type === t ? { backgroundColor: NOTE_COLORS[t] } : {}}
            >
              {t}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry Title..."
          className="w-full bg-transparent text-3xl font-black text-white outline-none placeholder:text-gray-800 tracking-tighter"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Pour your thoughts into the Dharma void..."
          className="w-full flex-1 min-h-[50vh] bg-transparent text-gray-300 outline-none resize-none mono text-lg leading-relaxed placeholder:text-gray-900"
        />
      </div>
    </div>
  );
};

export default NoteModal;
