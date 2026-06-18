import React, { useState } from 'react';
import { VaultEntry, VaultCategory, VaultListItem } from '../types';

interface VaultWorkspaceProps {
  entries: VaultEntry[];
  onAddEntry: (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateEntry: (entry: VaultEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const CATEGORIES: { value: VaultCategory; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { 
    value: 'Journal', 
    label: 'Journal', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" />
        <path d="M6 10h10" />
        <path d="M6 14h10" />
      </svg>
    ),
    desc: 'Contemplate, reflect, and track your daily mental clarity.',
    color: 'border-[#7a523a] text-[#7a523a] bg-[#7a523a]/5 dark:bg-[#7a523a]/15 dark:text-[#f3dfc1]'
  },
  { 
    value: 'Checklist', 
    label: 'Checklist', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    desc: 'Interactive step-by-step checklist templates and study routines.',
    color: 'border-[#2d6a4f] text-[#2d6a4f] bg-[#2d6a4f]/5 dark:bg-[#2d6a4f]/15 dark:text-[#b7e4c7]'
  },
  { 
    value: 'Planner', 
    label: 'Planner', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    desc: 'Key study schedules, sub-goals, and focus intervals.',
    color: 'border-[#b87d14] text-[#b87d14] bg-[#b87d14]/5 dark:bg-[#b87d14]/15 dark:text-[#fde2e4]'
  },
  { 
    value: 'Idea', 
    label: 'Idea Box', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .6 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
    ),
    desc: 'Brainstorm tips, creative linkages, and flash thoughts.',
    color: 'border-[#c25e2d] text-[#c25e2d] bg-[#c25e2d]/5 dark:bg-[#c25e2d]/15 dark:text-[#ffd8be]'
  },
  { 
    value: 'ProjectInfo', 
    label: 'Project Info', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      </svg>
    ),
    desc: 'Core objectives, resource trackers, and project parameters.',
    color: 'border-[#2d5a7b] text-[#2d5a7b] bg-[#2d5a7b]/5 dark:bg-[#2d5a7b]/15 dark:text-[#cfe2fe]'
  },
  { 
    value: 'Other', 
    label: 'Other Info', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </svg>
    ),
    desc: 'General logs and dynamic bits of info worth saving.',
    color: 'border-stone-500 text-stone-600 bg-stone-500/5 dark:bg-stone-500/15 dark:text-stone-300'
  }
];

export const VaultWorkspace: React.FC<VaultWorkspaceProps> = ({
  entries,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry
}) => {
  const [activeTab, setActiveTab] = useState<VaultCategory>('Journal');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpenCreator, setIsOpenCreator] = useState(false);

  // Form states for creating new entry
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [projectTag, setProjectTag] = useState('');
  const [date, setDate] = useState('');
  const [impactRating, setImpactRating] = useState(3);
  const [status, setStatus] = useState<'active' | 'completed' | 'on-hold' | 'backlog'>('active');

  // Multi-item checklist builder states
  const [checklistInput, setChecklistInput] = useState('');
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);

  // Editing direct entries
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setProjectTag('');
    setDate('');
    setImpactRating(3);
    setStatus('active');
    setChecklistInput('');
    setChecklistItems([]);
    setIsOpenCreator(false);
    setEditingId(null);
  };

  const handleExportVault = () => {
    const headers = [
      'Entry ID',
      'Category',
      'Title',
      'Content / Notes',
      'Checklist Items',
      'Associated Date',
      'Project Tag',
      'Impact Rating (1-5)',
      'Status',
      'Created At',
      'Updated At'
    ];

    const rows = entries.map(entry => {
      const checklistText = entry.listItems 
        ? entry.listItems.map(item => `[${item.completed ? 'X' : ' '}] ${item.text}`).join('; ')
        : '';

      return [
        entry.id || '',
        entry.category || '',
        entry.title || '',
        entry.content || '',
        checklistText,
        entry.date || '',
        entry.projectTag || '',
        entry.impactRating !== undefined ? String(entry.impactRating) : '',
        entry.status || '',
        new Date(entry.createdAt).toLocaleString(),
        new Date(entry.updatedAt).toLocaleString()
      ];
    });

    const csvContent = [
      headers.map(val => `"${val.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Dharma_Vault_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddChecklistTemplateItem = () => {
    if (!checklistInput.trim()) return;
    const newItem: VaultListItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: checklistInput.trim(),
      completed: false
    };
    setChecklistItems([...checklistItems, newItem]);
    setChecklistInput('');
  };

  const handleRemoveChecklistTemplateItem = (id: string) => {
    setChecklistItems(checklistItems.filter(item => item.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const data: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      category: activeTab,
      title: title.trim(),
      content: content.trim(),
      projectTag: projectTag.trim() ? projectTag.trim() : undefined,
      date: date || undefined,
      impactRating: activeTab === 'Idea' ? impactRating : undefined,
      status: activeTab === 'ProjectInfo' ? status : undefined,
      listItems: (activeTab === 'Checklist' || activeTab === 'Planner') ? checklistItems : undefined
    };

    if (editingId) {
      // Find original and update
      const original = entries.find(x => x.id === editingId);
      if (original) {
        onUpdateEntry({
          ...original,
          ...data,
          updatedAt: Date.now()
        });
      }
    } else {
      onAddEntry(data);
    }

    resetForm();
  };

  const startEdit = (entry: VaultEntry) => {
    setEditingId(entry.id);
    setActiveTab(entry.category);
    setTitle(entry.title);
    setContent(entry.content);
    setProjectTag(entry.projectTag || '');
    setDate(entry.date || '');
    setImpactRating(entry.impactRating || 3);
    setStatus(entry.status || 'active');
    setChecklistItems(entry.listItems || []);
    setIsOpenCreator(true);
  };

  const toggleChecklistItem = (entryId: string, itemId: string) => {
    const entry = entries.find(x => x.id === entryId);
    if (!entry || !entry.listItems) return;

    const updatedList = entry.listItems.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    onUpdateEntry({
      ...entry,
      listItems: updatedList,
      updatedAt: Date.now()
    });
  };

  // Filter components
  const activeCategoryConfig = CATEGORIES.find(c => c.value === activeTab);

  const filteredEntries = entries.filter(entry => {
    if (entry.category !== activeTab) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const matchTitle = entry.title.toLowerCase().includes(query);
    const matchContent = entry.content.toLowerCase().includes(query);
    const matchTag = entry.projectTag?.toLowerCase().includes(query) || false;
    return matchTitle || matchContent || matchTag;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Title & Stats Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#2b2925] dark:text-[#e5e5e5] tracking-tighter italic uppercase">Valuable Info Hub</h2>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider mt-1">
            Store and recall categorised records, snippets & checklists
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Export Vault Button */}
          <button
            onClick={handleExportVault}
            className="p-3 bg-white border border-stone-200 dark:bg-stone-905 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-850 rounded-2xl shadow-sm transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider"
            title="Export Entire Information Vault to Excel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export Vault</span>
          </button>

          <button
            onClick={() => {
              if (isOpenCreator) {
                resetForm();
              } else {
                setIsOpenCreator(true);
              }
            }}
            className={`p-3 rounded-2xl shadow-sm transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider ${
              isOpenCreator 
                ? 'bg-stone-200 dark:bg-stone-850 text-stone-600 dark:text-stone-300' 
                : 'bg-[#7a523a] text-white hover:bg-[#633f2a] shadow-[#7a523a]/10'
            }`}
          >
            {isOpenCreator ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                <span>Cancel</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <span>Save Info</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab Selectors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {CATEGORIES.map(category => {
          const isActive = activeTab === category.value;
          const count = entries.filter(e => e.category === category.value).length;
          return (
            <button
              key={category.value}
              onClick={() => {
                setActiveTab(category.value);
                if (!editingId) {
                  // Keep creator open but swap the context category
                  setChecklistItems([]);
                }
              }}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center border transition-all relative ${
                isActive 
                  ? 'border-transparent shadow-md bg-[#faf8f5] dark:bg-[#121212] font-extrabold active-ring' 
                  : 'bg-white/50 dark:bg-white/5 border-stone-200/40 hover:border-stone-300 dark:hover:border-stone-700/80 font-medium'
              }`}
              style={isActive ? { 
                boxShadow: '0 8px 30px rgba(122, 82, 58, 0.08)',
                borderColor: '#7a523a30'
              } : {}}
            >
              <div className={`p-1.5 rounded-lg mb-1.5 text-stone-500 ${isActive ? 'text-[#7a523a]' : 'text-stone-400 dark:text-stone-500'}`}>
                {category.icon}
              </div>
              <span className={`text-[10px] uppercase tracking-wider ${isActive ? 'text-[#7a523a] dark:text-[#f3dfc1] font-black' : 'text-stone-500 dark:text-stone-400'}`}>
                {category.label}
              </span>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#c25e2d] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[16px]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active tab guidance description strip */}
      <div className="px-5 py-3 text-xs bg-stone-50 dark:bg-[#121212]/50 border border-stone-200/40 rounded-xl text-stone-500 flex items-center justify-between">
         <span>
           <strong>{activeCategoryConfig?.label} workspace:</strong> {activeCategoryConfig?.desc}
         </span>
      </div>

      {/* Creator Form Section (Collapsible) */}
      {isOpenCreator && (
        <form onSubmit={handleSave} className="glass p-6 rounded-3xl border border-stone-200/60 bg-white/95 space-y-5 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-stone-200/40 pb-3">
            <h3 className="text-xs font-black text-stone-500 uppercase tracking-widest flex items-center gap-1.5 dark:text-stone-300">
              <span>{activeCategoryConfig?.icon}</span>
              <span>{editingId ? 'Edit Retained Record' : `Create New ${activeCategoryConfig?.label}`}</span>
            </h3>
            {editingId && (
              <span className="text-[9px] mono text-[#c25e2d] font-bold bg-[#c25e2d]/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
                Editing Mode
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Descriptive Title */}
            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Record Title / Main Header</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required
                placeholder={
                  activeTab === 'Journal' ? 'Insights from RBI Prelims mock'
                  : activeTab === 'Checklist' ? 'Static GK: National Parks checklist'
                  : activeTab === 'Planner' ? 'Mains Banking Awareness focus schedule'
                  : activeTab === 'Idea' ? 'Idea: Short note cheat-sheet on dynamic memory allocation'
                  : activeTab === 'ProjectInfo' ? 'SBI PO Revision Strategy tracker'
                  : 'Valuable note snippet name...'
                }
                className="w-full bg-stone-50 border border-stone-200/80 rounded-xl px-4 py-3 text-sm text-[#2b2925] focus:outline-none focus:ring-2 focus:ring-[#7a523a]/20 focus:border-[#7a523a]"
              />
            </div>

            {/* Context Fields based on active category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Project Tag for reference */}
              <div>
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Reference Tag / Project</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-stone-400 mono font-extrabold text-xs">#</span>
                  <input 
                    type="text" 
                    value={projectTag}
                    onChange={(e) => setProjectTag(e.target.value.replace(/\s+/g, '-').toLowerCase())}
                    placeholder="sbi-po-2026"
                    className="w-full bg-stone-50 border border-stone-200/80 rounded-xl pl-8 pr-4 py-3 text-xs mono text-stone-600 focus:outline-none focus:ring-2 focus:ring-[#7a523a]/20"
                  />
                </div>
              </div>

              {/* DATE selector (Planner & Journal) */}
              {(activeTab === 'Planner' || activeTab === 'Journal') && (
                <div>
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Schedule / Journal Date</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required={activeTab === 'Planner'}
                    className="w-full bg-stone-50 border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs text-[#2b2925] focus:outline-none focus:ring-2 focus:ring-[#7a523a]/20"
                  />
                </div>
              )}

              {/* IMPACT rating (Idea Box only) */}
              {activeTab === 'Idea' && (
                <div>
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Idea Priority / Clarification</label>
                  <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200/80 rounded-xl p-2.5 h-[42px]">
                    {[1, 2, 3, 4, 5].map(starNum => (
                      <button
                        key={starNum}
                        type="button"
                        onClick={() => setImpactRating(starNum)}
                        className="transition-transform active:scale-95"
                      >
                        <svg 
                          width="18" 
                          height="18" 
                          viewBox="0 0 24 24" 
                          fill={starNum <= impactRating ? '#b87d14' : 'none'} 
                          stroke={starNum <= impactRating ? '#b87d14' : '#a39d8f'} 
                          strokeWidth="2.5"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    ))}
                    <span className="text-[10px] font-black uppercase text-stone-400 ml-auto mr-1 tracking-wider mono">{impactRating}/5 Rated</span>
                  </div>
                </div>
              )}

              {/* STATUS selector (ProjectInfo only) */}
              {activeTab === 'ProjectInfo' && (
                <div>
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Project Current Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-stone-50 border border-stone-200/80 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider text-[#2b2925] outline-none cursor-pointer"
                  >
                    <option value="active">🟢 Active Revision</option>
                    <option value="completed">🏆 Exam Done / Complete</option>
                    <option value="on-hold">🟡 Slow Revision / On-hold</option>
                    <option value="backlog">🔴 Backlog / Upcoming Topic</option>
                  </select>
                </div>
              )}
            </div>

            {/* Checklist items dynamic creator (Checklist / Planner categories) */}
            {(activeTab === 'Checklist' || activeTab === 'Planner') && (
              <div className="space-y-3 bg-stone-50 dark:bg-stone-900/40 p-4 border border-stone-200/40 rounded-2xl">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">Add Checklist Steps / Items</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={checklistInput}
                    onChange={(e) => setChecklistInput(e.target.value)}
                    placeholder="Enter item description..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistTemplateItem();
                      }
                    }}
                    className="flex-1 bg-white border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs text-[#2b2925] focus:outline-none focus:ring-2 focus:ring-[#7a523a]/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistTemplateItem}
                    className="px-4 py-2 bg-[#7a523a] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors hover:bg-[#633f2a] shrink-0"
                  >
                    Add
                  </button>
                </div>
                
                {/* Visualizer for items during creation */}
                {checklistItems.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pt-2">
                    {checklistItems.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-stone-200/40 text-[11px] font-bold text-stone-700">
                        <span className="mono text-stone-400 font-extrabold text-[9px] w-4">{idx + 1}.</span>
                        <span className="flex-1">{item.text}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistTemplateItem(item.id)}
                          className="p-1 hover:bg-stone-50 text-stone-400 hover:text-red-500 rounded"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#7a523a]/60 text-center py-2">Add components to draft the list</p>
                )}
              </div>
            )}

            {/* Structured Content Area */}
            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Main Notes / Detailed Description</label>
              <textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                required={activeTab === 'Journal' || activeTab === 'Idea' || activeTab === 'ProjectInfo' || activeTab === 'Other'}
                placeholder={
                  activeTab === 'Journal' ? 'Insights: I finished mock exam in time but quantitative aptitude sections need speedy shortcuts...'
                  : activeTab === 'Idea' ? 'Strategy outline: Compile flashcards using key Indian economy GK parameters...'
                  : activeTab === 'ProjectInfo' ? 'Syllabus elements: Quant (time & work, SI/CI, simplification), Reasoning (syllogisms, inequality), English (RC, error spot)...'
                  : 'Write down key summaries, tips, formulas, and pointers to retain in your hub...'
                }
                className="w-full bg-stone-50 border border-stone-200/80 rounded-2xl p-4 text-xs text-[#2b2925] focus:outline-none focus:ring-2 focus:ring-[#7a523a]/20 focus:border-[#7a523a] min-h-[140px] placeholder:text-stone-300 font-medium leading-relaxed font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-200/40">
            <button 
              type="button" 
              onClick={resetForm}
              className="px-5 py-2.5 text-xs font-black text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-xl uppercase tracking-widest"
            >
              Clear
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 bg-[#7a523a] text-white text-xs font-black rounded-xl hover:bg-[#633f2a] uppercase tracking-widest transition-all shadow-md shadow-[#7a523a]/10"
            >
              {editingId ? 'Update Record' : 'Save Entry'}
            </button>
          </div>
        </form>
      )}

      {/* Database Search Strip */}
      <div className="relative">
        <span className="absolute left-4 top-3.5 text-stone-400">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </span>
        <input 
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search saved ${activeCategoryConfig?.label} entries (titles, content, tags)...`}
          className="w-full bg-[#faf8f5]/80 dark:bg-[#121212]/30 border border-stone-200/60 rounded-2xl pl-11 pr-4 py-3 text-xs text-[#2b2925] focus:outline-none focus:ring-2 focus:ring-[#7a523a]/10 focus:bg-white"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-3.5 text-stone-400 hover:text-stone-600 font-bold"
          >
            Clear
          </button>
        )}
      </div>

      {/* Retained Records Listing */}
      <div className="space-y-4">
        {filteredEntries.map(entry => {
          const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          // Compute checklist completion percentage
          const totalItems = entry.listItems?.length || 0;
          const completedItems = entry.listItems?.filter(i => i.completed).length || 0;
          const completePercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

          return (
            <div 
              key={entry.id} 
              className="glass p-5 rounded-3xl border border-stone-200/40 bg-white/95 relative overflow-hidden group shadow-sm transition-all hover:border-[#7a523a]/30"
            >
              {/* Colored Indicator */}
              <div className="absolute top-0 left-0 w-1 h-full bg-[#7a523a]" />

              {/* Card Header information block */}
              <div className="md:flex justify-between items-start gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-[#7a523a]/10 text-[#7a523a] px-2 py-0.5 rounded-full">
                      {entry.category}
                    </span>
                    {entry.projectTag && (
                      <span className="text-[8px] font-black tracking-widest text-[#c25e2d] uppercase bg-[#c25e2d]/5 px-2 py-0.5 rounded-full border border-[#c25e2d]/10">
                        #{entry.projectTag}
                      </span>
                    )}
                    {entry.date && (
                      <span className="text-[8px] font-mono font-bold text-stone-500 uppercase tracking-widest bg-stone-100 rounded-md px-1.5 py-0.5">
                        📅 {entry.date}
                      </span>
                    )}

                    {/* Project Status badges */}
                    {entry.status && (
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        entry.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200'
                        : entry.status === 'completed' ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : entry.status === 'on-hold' ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {entry.status}
                      </span>
                    )}

                    {/* Idea Star Ratings */}
                    {entry.impactRating && (
                      <div className="flex items-center gap-0.5 ml-2">
                        {Array.from({ length: entry.impactRating }).map((_, i) => (
                          <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill="#b87d14" stroke="none">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-base font-black text-[#2b2925] tracking-tight leading-snug">
                    {entry.title}
                  </h3>
                </div>

                {/* Edit & Delete Action Panel */}
                <div className="flex gap-2 self-start mt-2 md:mt-0 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => startEdit(entry)} 
                    className="p-2 hover:bg-stone-100 dark:hover:bg-stone-850 text-stone-500 hover:text-stone-800 rounded-lg transition-colors"
                    title="Edit Record"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <button 
                    onClick={() => { if(confirm('Delete this record permanently?')) onDeleteEntry(entry.id); }}
                    className="p-2 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Delete Record"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>

              {/* Dynamic rendering structures */}
              {entry.content && (
                <p className="text-xs text-stone-600 mt-3 whitespace-pre-wrap leading-relaxed bg-[#fbf9f4]/80 dark:bg-stone-900/30 p-3.5 rounded-2xl border border-stone-200/40 font-mono">
                  {entry.content}
                </p>
              )}

              {/* Checklist rendering */}
              {entry.listItems && entry.listItems.length > 0 && (
                <div className="mt-4 space-y-2 bg-[#fbf9f4]/50 p-4 rounded-2xl border border-stone-200/30">
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Checklist Items</span>
                     <span className="text-[10px] font-black text-[#7a523a] mono">{completedItems}/{totalItems} ({completePercent}%)</span>
                  </div>
                  
                  {/* Progress Line */}
                  <div className="h-1 w-full bg-stone-200/60 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full bg-[#7a523a] transition-all duration-300"
                      style={{ width: `${completePercent}%` }}
                    />
                  </div>

                  {/* Checklist Sub-items List */}
                  <div className="space-y-1.5">
                    {entry.listItems.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => toggleChecklistItem(entry.id, item.id)}
                        className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-stone-100/40 rounded-xl cursor-pointer select-none transition-colors"
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          item.completed 
                            ? 'bg-[#7a523a] border-[#7a523a] text-white' 
                            : 'border-stone-300 bg-white'
                        }`}>
                          {item.completed && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-[11px] font-bold ${
                          item.completed 
                            ? 'line-through text-stone-400 font-medium' 
                            : 'text-stone-700'
                        }`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Card Footer metadata block */}
              <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-stone-200/40 text-[9px] text-stone-400 font-mono">
                <span>Created {formattedDate}</span>
                {entry.updatedAt > entry.createdAt && (
                  <span>Updated {new Date(entry.updatedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          );
        })}

        {filteredEntries.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-stone-200/80 rounded-[30px] bg-white/30 text-stone-400 md:px-10">
             <div className="w-12 h-12 rounded-full border border-stone-200 flex items-center justify-center bg-stone-50 mx-auto mb-4">
               {activeCategoryConfig?.icon}
             </div>
             <p className="text-xs font-black uppercase tracking-[0.2em]">{activeCategoryConfig?.label} is empty</p>
             <p className="text-[10px] text-stone-500 max-w-[280px] mx-auto mt-2 leading-relaxed">
               Click "Save Info" or add an entry above to start retaining dynamic, high-value information under #{activeTab.toLowerCase()}.
             </p>
          </div>
        )}
      </div>
    </div>
  );
};
