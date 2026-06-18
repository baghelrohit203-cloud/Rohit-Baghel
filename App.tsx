
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ActivityEntry, ActivityGroup, ActivityStatus, AppState, ReportInterval, Note, NoteType, ProjectBlock, Goal, VaultEntry, PriceArticle, PriceRecord } from './types';
import { ACTIVITY_GROUPS, GROUP_COLORS, NOTE_TYPES, NOTE_COLORS } from './constants';
import { VaultWorkspace } from './components/VaultWorkspace';
import { PriceWatchlist } from './components/PriceWatchlist';
import ActivityItem from './components/ActivityItem';
import ActivityModal from './components/ActivityModal';
import NoteModal from './components/NoteModal';
import NoteCard from './components/NoteCard';
import { getProductivityAnalysis } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// Firebase Synchronisation imports
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { 
  auth, 
  subscribeToCloudCollections, 
  uploadLocalDataToCloud,
  cloudSaveActivity, 
  cloudDeleteActivity, 
  cloudSaveNote, 
  cloudDeleteNote, 
  cloudSaveGoal, 
  cloudDeleteGoal, 
  cloudSaveReflection, 
  cloudSaveVaultEntry, 
  cloudDeleteVaultEntry, 
  cloudSavePriceArticle, 
  cloudDeletePriceArticle 
} from './services/firebaseService';

import {
  getSupabaseConfig,
  saveSupabaseConfig,
  getSupabaseClient,
  uploadLocalDataToSupabase,
  subscribeToSupabaseCollections,
  supabaseSaveActivity,
  supabaseDeleteActivity,
  supabaseSaveNote,
  supabaseDeleteNote,
  supabaseSaveGoal,
  supabaseDeleteGoal,
  supabaseSaveReflection,
  supabaseSaveVaultEntry,
  supabaseDeleteVaultEntry,
  supabaseSavePriceArticle,
  supabaseDeletePriceArticle
} from './services/supabaseService';

const App: React.FC = () => {
  const [activities, setActivities] = useState<ActivityEntry[]>(() => {
    try {
      const saved = localStorage.getItem('karma_chakra_v7_activities');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem('karma_chakra_v7_notes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });
  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem('karma_chakra_v7_goals');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>(() => {
    try {
      const saved = localStorage.getItem('karma_chakra_v7_vault_entries');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });
  const [priceArticles, setPriceArticles] = useState<PriceArticle[]>(() => {
    try {
      const saved = localStorage.getItem('karma_chakra_v7_price_articles');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });
  const [reflection, setReflection] = useState<string>(() => {
    try {
      return localStorage.getItem('karma_chakra_v7_reflection') || '';
    } catch (e) {
      console.error(e);
      return '';
    }
  });
  const [currentView, setCurrentView] = useState<AppState['currentView']>('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportInterval, setReportInterval] = useState<ReportInterval>('Daily');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityEntry | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteFilter, setNoteFilter] = useState<NoteType | 'All'>('All');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [coachResponse, setCoachResponse] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAlarmTask, setActiveAlarmTask] = useState<ActivityEntry | null>(null);
  
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');

  // Supabase Auth & Sync State flags
  const [syncProvider, setSyncProvider] = useState<'firebase' | 'supabase'>('supabase');
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('karma_chakra_supabase_url') || '');
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem('karma_chakra_supabase_key') || '');
  const [currentUser, setCurrentUser] = useState<{ uid: string; email?: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('Offline Mode');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');
  const subscriptionUnsubscribersRef = useRef<(() => void)[]>([]);

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('karma_chakra_dark_mode');
    return saved ? saved === 'true' : false;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('karma_chakra_sidebar_open');
    // On desktop / wide viewports, keep sidebar open by default; on mobile, start closed
    if (saved) return saved === 'true';
    return window.innerWidth >= 1024;
  });

  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('karma_chakra_sidebar_open', String(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('karma_chakra_dark_mode', String(isDark));
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDark ? '#0a0a0a' : '#f5f2ea');
    }
  }, [isDark]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for Supabase user auth changes and handle real-time sync subscription
  useEffect(() => {
    // Unsubscribe existing listeners if any
    subscriptionUnsubscribersRef.current.forEach((unsub) => {
      try { unsub(); } catch (err) { console.error('Unsub error:', err); }
    });
    subscriptionUnsubscribersRef.current = [];

    const client = getSupabaseClient();
    if (!client) {
      setCurrentUser(null);
      setIsSyncing(false);
      setSyncStatusText('Supabase Config Missing (Offline Mode)');
      
      // Gracefully load local cached data
      const savedActivities = localStorage.getItem('karma_chakra_v7_activities');
      const savedNotes = localStorage.getItem('karma_chakra_v7_notes');
      const savedGoals = localStorage.getItem('karma_chakra_v7_goals');
      const savedReflection = localStorage.getItem('karma_chakra_v7_reflection');
      const savedVaultEntries = localStorage.getItem('karma_chakra_v7_vault_entries');
      const savedPriceArticles = localStorage.getItem('karma_chakra_v7_price_articles');

      if (savedActivities) setActivities(JSON.parse(savedActivities));
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      if (savedGoals) setGoals(JSON.parse(savedGoals));
      if (savedReflection) setReflection(savedReflection);
      if (savedVaultEntries) setVaultEntries(JSON.parse(savedVaultEntries));
      if (savedPriceArticles) setPriceArticles(JSON.parse(savedPriceArticles));
      return;
    }

    const setupSync = (userId: string) => {
      const syncCallbacks = {
        onActivitiesUpdate: (list: ActivityEntry[]) => {
          setActivities(prev => {
            if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
            return list;
          });
        },
        onNotesUpdate: (list: Note[]) => {
          setNotes(prev => {
            if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
            return list;
          });
        },
        onGoalsUpdate: (list: Goal[]) => {
          setGoals(prev => {
            if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
            return list;
          });
        },
        onReflectionUpdate: (text: string) => {
          setReflection(prev => prev === text ? prev : text);
        },
        onVaultUpdate: (list: VaultEntry[]) => {
          setVaultEntries(prev => {
            if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
            return list;
          });
        },
        onWatchlistUpdate: (list: PriceArticle[]) => {
          setPriceArticles(prev => {
            if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
            return list;
          });
        },
        onSyncStateChange: (syncing: boolean, text: string) => {
          setIsSyncing(syncing);
          setSyncStatusText(text);
        }
      };

      setSyncStatusText('Subscribing to Supabase channels...');
      const unsubs = subscribeToSupabaseCollections(userId, syncCallbacks);
      subscriptionUnsubscribersRef.current = unsubs;
    };

    // Get current session
    client.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (user) {
        setCurrentUser({
          uid: user.id,
          email: user.email
        });
        setupSync(user.id);
      } else {
        setCurrentUser(null);
        setIsSyncing(false);
        setSyncStatusText('Offline Mode (Local Cache)');
      }
    }).catch(err => {
      console.error('Supabase getSession error:', err);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      
      // Cleanup previous sync subscriptions on auth change
      subscriptionUnsubscribersRef.current.forEach((unsub) => {
        try { unsub(); } catch (err) { console.error('Unsub error:', err); }
      });
      subscriptionUnsubscribersRef.current = [];

      if (user) {
        setCurrentUser({
          uid: user.id,
          email: user.email
        });
        setupSync(user.id);
      } else {
        setCurrentUser(null);
        setIsSyncing(false);
        setSyncStatusText('Offline Mode (Local Cache)');
      }
    });

    // Gracefully load local cached data in background anyway
    const savedActivities = localStorage.getItem('karma_chakra_v7_activities');
    const savedNotes = localStorage.getItem('karma_chakra_v7_notes');
    const savedGoals = localStorage.getItem('karma_chakra_v7_goals');
    const savedReflection = localStorage.getItem('karma_chakra_v7_reflection');
    const savedVaultEntries = localStorage.getItem('karma_chakra_v7_vault_entries');
    const savedPriceArticles = localStorage.getItem('karma_chakra_v7_price_articles');

    if (savedActivities) {
      setActivities(JSON.parse(savedActivities));
    }
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
    if (savedReflection) {
      setReflection(savedReflection);
    }
    if (savedVaultEntries) {
      setVaultEntries(JSON.parse(savedVaultEntries));
    }
    if (savedPriceArticles) {
      setPriceArticles(JSON.parse(savedPriceArticles));
    } else {
          // Seed initial mock articles keeping user example in mind
          const seedData: PriceArticle[] = [
            {
              id: 'seed-onion',
              name: 'Alwar Onions (Special Fresh)',
              category: 'Vegetable',
              tags: ['fresh', 'organic', 'wholesale', 'essential'],
              createdAt: Date.now() - 86400000,
              updatedAt: Date.now(),
              records: [
                {
                  id: 'seed-rec-1',
                  price: 35,
                  currency: '₹',
                  dateRecorded: new Date(Date.now() - 43200000).toISOString().split('T')[0],
                  location: 'Khedli Mandi',
                  city: 'Alwar',
                  state: 'Rajasthan',
                  supplierName: 'Saini Farms Ltd',
                  unit: '1 Kg',
                  reliability: 5,
                  notes: 'Early morning wholesale rate. Exceptional fresh batch.'
                },
                {
                  id: 'seed-rec-2',
                  price: 45,
                  currency: '₹',
                  dateRecorded: new Date().toISOString().split('T')[0],
                  location: 'Local Supermarket',
                  city: 'Alwar',
                  state: 'Rajasthan',
                  supplierName: 'Reliance Smart Store',
                  unit: '1 Kg',
                  reliability: 4,
                  notes: 'Cleaned, pre-packaged grade-A red onions.'
                }
              ]
            },
            {
              id: 'seed-laptops',
              name: 'MacBook Air M3 (16GB RAM, 512GB SSD)',
              category: 'Electronics',
              tags: ['premium', 'laptop', 'workstation'],
              createdAt: Date.now() - 172800000,
              updatedAt: Date.now(),
              records: [
                {
                  id: 'seed-rec-laptop-1',
                  price: 114900,
                  currency: '₹',
                  dateRecorded: new Date().toISOString().split('T')[0],
                  location: 'Official Apple Store',
                  city: 'Delhi',
                  state: 'Delhi',
                  supplierName: 'Apple India Direct',
                  unit: '1 Unit',
                  reliability: 5,
                  notes: 'Standard official retail pricing with student discount applicable separately.'
                },
                {
                  id: 'seed-rec-laptop-2',
                  price: 109900,
                  currency: '₹',
                  dateRecorded: new Date().toISOString().split('T')[0],
                  location: 'Nehru Place Wholesale Market',
                  city: 'Delhi',
                  state: 'Delhi',
                  supplierName: 'Computer World Distributors',
                  unit: '1 Unit',
                  reliability: 4,
                  notes: 'Unopened box unit with native GST Invoice input option.'
                }
              ]
            }
          ];
          setPriceArticles(seedData);
          localStorage.setItem('karma_chakra_v7_price_articles', JSON.stringify(seedData));
        }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      subscriptionUnsubscribersRef.current.forEach((unsub) => {
        try { unsub(); } catch (err) { console.error('Unsub cleanup error:', err); }
      });
    };
  }, [supabaseUrl, supabaseKey]);

  useEffect(() => {
    localStorage.setItem('karma_chakra_sync_provider', 'supabase');
  }, []);

  useEffect(() => {
    localStorage.setItem('karma_chakra_v7_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('karma_chakra_v7_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('karma_chakra_v7_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('karma_chakra_v7_reflection', reflection);
    if (currentUser) {
      if (syncProvider === 'supabase') {
        supabaseSaveReflection(currentUser.uid, reflection);
      } else {
        cloudSaveReflection(currentUser.uid, reflection);
      }
    }
  }, [reflection]);

  useEffect(() => {
    localStorage.setItem('karma_chakra_v7_vault_entries', JSON.stringify(vaultEntries));
  }, [vaultEntries]);

  useEffect(() => {
    localStorage.setItem('karma_chakra_v7_price_articles', JSON.stringify(priceArticles));
  }, [priceArticles]);

  // Alarm checking logic
  useEffect(() => {
    const todayStr = currentTime.toISOString().split('T')[0];
    const currentHM = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
    
    const trigger = activities.find(a => 
      a.date === todayStr && 
      a.startTime === currentHM && 
      a.alarmEnabled && 
      a.status === 'Pending' &&
      !a.timer?.isActive
    );

    if (trigger && activeAlarmTask?.id !== trigger.id) {
      setActiveAlarmTask(trigger);
      playAlarmTone();
    }
  }, [currentTime, activities]);

  const playAlarmTone = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      const playBeep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      };

      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = window.setInterval(playBeep, 1000);
      playBeep();
    } catch (e) {
      console.warn("Audio Context failed to start (interaction required).");
    }
  };

  const stopAlarmTone = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

  const dismissAlarm = () => {
    stopAlarmTone();
    setActiveAlarmTask(null);
  };

  const startTaskFromAlarm = () => {
    if (activeAlarmTask) {
      handleUpdateTimer(activeAlarmTask.id, activeAlarmTask.timer?.totalElapsed || 0, true);
      dismissAlarm();
    }
  };

  // Unified provider-aware synchronization helpers
  const saveActivity = (item: ActivityEntry) => {
    if (!currentUser) return;
    if (syncProvider === 'supabase') {
      supabaseSaveActivity(currentUser.uid, item);
    } else {
      cloudSaveActivity(currentUser.uid, item);
    }
  };

  const deleteActivity = (activityId: string) => {
    if (syncProvider === 'supabase') {
      supabaseDeleteActivity(activityId);
    } else {
      cloudDeleteActivity(activityId);
    }
  };

  const saveNote = (item: Note) => {
    if (!currentUser) return;
    if (syncProvider === 'supabase') {
      supabaseSaveNote(currentUser.uid, item);
    } else {
      cloudSaveNote(currentUser.uid, item);
    }
  };

  const deleteNote = (noteId: string) => {
    if (syncProvider === 'supabase') {
      supabaseDeleteNote(noteId);
    } else {
      cloudDeleteNote(noteId);
    }
  };

  const saveGoal = (item: Goal) => {
    if (!currentUser) return;
    if (syncProvider === 'supabase') {
      supabaseSaveGoal(currentUser.uid, item);
    } else {
      cloudSaveGoal(currentUser.uid, item);
    }
  };

  const deleteGoalWrapper = (goalId: string) => {
    if (syncProvider === 'supabase') {
      supabaseDeleteGoal(goalId);
    } else {
      cloudDeleteGoal(goalId);
    }
  };

  const saveVaultEntry = (item: VaultEntry) => {
    if (!currentUser) return;
    if (syncProvider === 'supabase') {
      supabaseSaveVaultEntry(currentUser.uid, item);
    } else {
      cloudSaveVaultEntry(currentUser.uid, item);
    }
  };

  const deleteVaultEntry = (entryId: string) => {
    if (syncProvider === 'supabase') {
      supabaseDeleteVaultEntry(entryId);
    } else {
      cloudDeleteVaultEntry(entryId);
    }
  };

  const savePriceArticle = (item: PriceArticle) => {
    if (!currentUser) return;
    if (syncProvider === 'supabase') {
      supabaseSavePriceArticle(currentUser.uid, item);
    } else {
      cloudSavePriceArticle(currentUser.uid, item);
    }
  };

  const deletePriceArticle = (articleId: string) => {
    if (syncProvider === 'supabase') {
      supabaseDeletePriceArticle(articleId);
    } else {
      cloudDeletePriceArticle(articleId);
    }
  };

  const handleSaveNote = (title: string, content: string, type: NoteType, project?: string, blocks?: ProjectBlock[]) => {
    let targetNote: Note;
    if (editingNote) {
      targetNote = { ...editingNote, title, content, type, project, blocks, updatedAt: Date.now() };
      setNotes(prev => prev.map(n => n.id === editingNote.id ? targetNote : n));
    } else {
      targetNote = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        content,
        type,
        project,
        blocks,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setNotes(prev => [targetNote, ...prev]);
    }
    if (currentUser) {
      saveNote(targetNote);
    }
    setEditingNote(null);
    setIsNoteModalOpen(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (currentUser) {
      deleteNote(id);
    }
    setEditingNote(null);
    setIsNoteModalOpen(false);
  };

  const handleExportNotes = () => {
    const headers = [
      'Note ID',
      'Title',
      'Type',
      'Content',
      'Associated Project',
      'Created At',
      'Updated At'
    ];

    const rows = notes.map(note => [
      note.id || '',
      note.title || '',
      note.type || '',
      note.content || '',
      note.project || '',
      new Date(note.createdAt).toLocaleString(),
      new Date(note.updatedAt).toLocaleString()
    ]);

    const csvContent = [
      headers.map(val => `"${val.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Scribe_Notes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddVaultEntry = (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEntry: VaultEntry = {
      ...entry,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setVaultEntries(prev => [newEntry, ...prev]);
    if (currentUser) {
      saveVaultEntry(newEntry);
    }
  };

  const handleUpdateVaultEntry = (updated: VaultEntry) => {
    setVaultEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    if (currentUser) {
      saveVaultEntry(updated);
    }
  };

  const handleDeleteVaultEntry = (id: string) => {
    setVaultEntries(prev => prev.filter(e => e.id !== id));
    if (currentUser) {
      deleteVaultEntry(id);
    }
  };

  const handleAddPriceArticle = (art: Omit<PriceArticle, 'id' | 'createdAt' | 'updatedAt' | 'records'> & { initialRecord: Omit<PriceRecord, 'id'> }) => {
    const articleId = Math.random().toString(36).substr(2, 9);
    const newRecord: PriceRecord = {
      ...art.initialRecord,
      id: Math.random().toString(36).substr(2, 9)
    };
    const newArticle: PriceArticle = {
      id: articleId,
      name: art.name,
      category: art.category,
      tags: art.tags,
      records: [newRecord],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setPriceArticles(prev => [newArticle, ...prev]);
    if (currentUser) {
      savePriceArticle(newArticle);
    }
  };

  const handleAddPriceRecord = (articleId: string, record: Omit<PriceRecord, 'id'>) => {
    const newRecord: PriceRecord = {
      ...record,
      id: Math.random().toString(36).substr(2, 9)
    };
    setPriceArticles(prev => prev.map(art => {
      if (art.id === articleId) {
        const updated = {
          ...art,
          records: [newRecord, ...art.records],
          updatedAt: Date.now()
        };
        if (currentUser) {
          savePriceArticle(updated);
        }
        return updated;
      }
      return art;
    }));
  };

  const handleUpdatePriceRecord = (articleId: string, updatedRecord: PriceRecord) => {
    setPriceArticles(prev => prev.map(art => {
      if (art.id === articleId) {
        const updated = {
          ...art,
          records: art.records.map(rec => rec.id === updatedRecord.id ? updatedRecord : rec),
          updatedAt: Date.now()
        };
        if (currentUser) {
          savePriceArticle(updated);
        }
        return updated;
      }
      return art;
    }));
  };

  const handleDeletePriceRecord = (articleId: string, recordId: string) => {
    setPriceArticles(prev => prev.map(art => {
      if (art.id === articleId) {
        const updated = {
          ...art,
          records: art.records.filter(rec => rec.id !== recordId),
          updatedAt: Date.now()
        };
        if (currentUser) {
          savePriceArticle(updated);
        }
        return updated;
      }
      return art;
    }));
  };

  const handleDeletePriceArticle = (articleId: string) => {
    setPriceArticles(prev => prev.filter(art => art.id !== articleId));
    if (currentUser) {
      deletePriceArticle(articleId);
    }
  };

  const handleUpdatePriceArticle = (updatedArticle: PriceArticle) => {
    setPriceArticles(prev => prev.map(art => art.id === updatedArticle.id ? updatedArticle : art));
    if (currentUser) {
      savePriceArticle(updatedArticle);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please fill in both email and password.');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setAuthError('Supabase is not configured yet. Please configure Supabase URL and Anon Key first.');
      return;
    }

    try {
      if (isSignUpMode) {
        const { error, data } = await client.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        
        if (data?.session) {
          setAuthSuccess('Account created and logged in successfully!');
        } else {
          setAuthSuccess('Account created successfully! Check your inbox for a registration confirmation email.');
        }
      } else {
        const { error } = await client.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        setAuthSuccess('Logged in successfully! Subscribing to Supabase cloud...');
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Authentication error.');
    }
  };

  const handleLogout = async () => {
    try {
      const client = getSupabaseClient();
      if (client) {
        await client.auth.signOut();
      }
      setAuthSuccess('Logged out successfully.');
      setAuthEmail('');
      setAuthPassword('');
      setAuthError('');
    } catch (err: any) {
      console.error(err);
      setAuthError('Failed to log out.');
    }
  };

  const handleCloudUploadMigration = async () => {
    if (!currentUser) return;
    setMigrationStatus('Syncing all local cache entries to secure cloud database...');
    try {
      await uploadLocalDataToCloud(
        currentUser.uid, 
        {
          activities,
          notes,
          goals,
          reflection,
          vaultEntries,
          priceArticles
        },
        (text) => setMigrationStatus(text)
      );
      setTimeout(() => setMigrationStatus(''), 6000);
    } catch (err: any) {
      console.error(err);
      setMigrationStatus(`Sync failed: ${err.message || 'Unknown error'}`);
    }
  };

  const stats = useMemo(() => {
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const totalMins = 24 * 60;
    const remainingMins = totalMins - currentMins;
    const format = (m: number) => `${Math.floor(m/60).toString().padStart(2, '0')}:${(m%60).toString().padStart(2, '0')}`;
    return {
      total: '24:00',
      current: format(currentMins),
      remaining: format(remainingMins),
      percentPassed: (currentMins / totalMins) * 100
    };
  }, [currentTime]);

  const activeTask = useMemo(() => activities.find(a => a.timer?.isActive), [activities]);

  const handleAddOrEditActivity = (
    group: ActivityGroup, 
    description: string, 
    duration: number, 
    repeatMode: 'none' | 'weekdays' | 'weekends',
    project?: string,
    startTime?: string,
    alarmEnabled?: boolean,
    goalId?: string
  ) => {
    const datesToSync: string[] = [selectedDate];
    if (repeatMode !== 'none') {
      const baseDate = new Date(selectedDate);
      const dayOfWeek = baseDate.getDay();
      const diff = baseDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(baseDate.setDate(diff));
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        if (dateStr === selectedDate) continue;
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        if ((repeatMode === 'weekdays' && !isWeekend) || (repeatMode === 'weekends' && isWeekend)) datesToSync.push(dateStr);
      }
    }

    if (editingActivity) {
      setActivities(prev => prev.map(a => {
        if (a.id === editingActivity.id) {
          const updated = { ...a, group, description, project, estimatedDuration: duration, startTime, alarmEnabled, goalId };
          if (currentUser) {
            saveActivity(updated);
          }
          return updated;
        }
        if (repeatMode !== 'none' && datesToSync.includes(a.date) && a.description === editingActivity.description && a.group === editingActivity.group) {
           const updated = { ...a, group, description, project, estimatedDuration: duration, startTime, alarmEnabled, goalId };
           if (currentUser) {
             saveActivity(updated);
           }
           return updated;
        }
        return a;
      }));
      setEditingActivity(null);
    } else {
      const newEntries: ActivityEntry[] = datesToSync.map(date => ({
        id: Math.random().toString(36).substr(2, 9),
        date, group, description, project, timestamp: Date.now(),
        estimatedDuration: duration, status: 'Pending',
        timer: { isActive: false, lastStartTime: null, totalElapsed: 0 },
        startTime, alarmEnabled, goalId
      }));
      setActivities(prev => [...prev, ...newEntries]);
      if (currentUser) {
        newEntries.forEach(entry => {
          saveActivity(entry);
        });
      }
    }
    setIsModalOpen(false);
  };

  const handleAddDistraction = (activityId: string) => {
    const reason = prompt("What distracted you?");
    if (reason) {
      setActivities(prev => prev.map(a => {
        if (a.id === activityId) {
          const updated = { ...a, distractions: [...(a.distractions || []), reason] };
          if (currentUser) {
            saveActivity(updated);
          }
          return updated;
        }
        return a;
      }));
    }
  };

  const handleAddGoal = () => {
    if (!newGoalTitle.trim()) return;
    const goal: Goal = {
      id: Math.random().toString(36).substr(2, 9),
      title: newGoalTitle,
      description: newGoalDesc,
      targetDate: newGoalDate,
      isCompleted: false,
      createdAt: Date.now()
    };
    setGoals(prev => [...prev, goal]);
    if (currentUser) {
      saveGoal(goal);
    }
    setNewGoalTitle('');
    setNewGoalDesc('');
    setNewGoalDate('');
    setIsGoalModalOpen(false);
  };

  const toggleGoalCompletion = (id: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const updated = { ...g, isCompleted: !g.isCompleted };
        if (currentUser) {
          saveGoal(updated);
        }
        return updated;
      }
      return g;
    }));
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    if (currentUser) {
      deleteGoalWrapper(id);
    }
  };

  const updateActivityStatus = (id: string, status: ActivityStatus) => {
    setActivities(prev => prev.map(a => {
      if (a.id === id) {
        const updated = { ...a, status };
        if (currentUser) {
          saveActivity(updated);
        }
        return updated;
      }
      return a;
    }));
  };

  const handleMoveToDate = (id: string, newDate: string) => {
    setActivities(prev => prev.map(a => {
      if (a.id === id) {
        const updated: ActivityEntry = { ...a, date: newDate, status: 'Rescheduled', movedFromDate: a.date, movedAt: Date.now() };
        if (currentUser) {
          saveActivity(updated);
        }
        return updated;
      }
      return a;
    }));
  };

  const handleUpdateTimer = (id: string, elapsed: number, isActive: boolean) => {
    setActivities(prev => prev.map(a => {
      if (isActive && a.id !== id && a.timer?.isActive) {
        const othersElapsed = (a.timer.totalElapsed || 0) + (Date.now() - (a.timer.lastStartTime || 0));
        const updated = { ...a, timer: { isActive: false, totalElapsed: othersElapsed, lastStartTime: null }};
        if (currentUser) {
          saveActivity(updated);
        }
        return updated;
      }
      if (a.id === id) {
        const updated = { ...a, timer: { isActive, totalElapsed: elapsed, lastStartTime: isActive ? Date.now() : null } };
        if (currentUser) {
          saveActivity(updated);
        }
        return updated;
      }
      return a;
    }));
  };

  const dashboardActivities = useMemo(() => activities.filter(a => a.date === selectedDate), [activities, selectedDate]);
  
  const filteredNotes = useMemo(() => {
    if (noteFilter === 'All') return notes;
    return notes.filter(n => n.type === noteFilter);
  }, [notes, noteFilter]);

  const completionRate = useMemo(() => {
    if (dashboardActivities.length === 0) return 0;
    const completed = dashboardActivities.filter(a => a.status === 'Completed').length;
    return Math.round((completed / dashboardActivities.length) * 100);
  }, [dashboardActivities]);

  const backlogStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const pending = activities.filter(a => a.status === 'Pending' && a.date === todayStr);
    const backlog = activities.filter(a => a.status === 'Pending' && a.date < todayStr);
    const moved = activities.filter(a => a.status === 'Rescheduled');
    const sumMins = [...pending, ...backlog].reduce((acc, curr) => acc + curr.estimatedDuration, 0);
    return { pending, backlog, moved, totalHrsNeeded: (sumMins / 60).toFixed(1) };
  }, [activities]);

  const reportData = useMemo(() => {
    const now = new Date(selectedDate);
    const intervalActivities = activities.filter(a => {
      const actDate = new Date(a.date);
      if (reportInterval === 'Daily') return a.date === selectedDate;
      if (reportInterval === 'Weekly') return (now.getTime() - actDate.getTime()) / 86400000 < 7;
      if (reportInterval === 'Monthly') return actDate.getMonth() === now.getMonth() && actDate.getFullYear() === now.getFullYear();
      return false;
    });
    const summary = intervalActivities.reduce((acc, curr) => {
      acc[curr.group] = (acc[curr.group] || 0) + (curr.timer?.totalElapsed || 0) / (1000 * 60);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(summary).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [activities, selectedDate, reportInterval]);

  const productivityScore = useMemo(() => {
    if (dashboardActivities.length === 0) return 0;
    const completed = dashboardActivities.filter(a => a.status === 'Completed');
    const totalTargetMins = dashboardActivities.reduce((acc, curr) => acc + curr.estimatedDuration, 0);
    const totalActualMins = dashboardActivities.reduce((acc, curr) => acc + (curr.timer?.totalElapsed || 0) / (1000 * 60), 0);
    
    // Score based on completion rate and time efficiency
    const completionFactor = completed.length / dashboardActivities.length;
    const timeFactor = totalTargetMins > 0 ? Math.min(1.2, totalActualMins / totalTargetMins) : 1;
    
    return Math.round(completionFactor * timeFactor * 100);
  }, [dashboardActivities]);

  const groupStats = useMemo(() => {
    const stats = ACTIVITY_GROUPS.map(group => {
      const groupActs = dashboardActivities.filter(a => a.group === group);
      const mins = groupActs.reduce((acc, curr) => acc + (curr.timer?.totalElapsed || 0) / (1000 * 60), 0);
      return { name: group, mins: Math.round(mins) };
    });
    return stats;
  }, [dashboardActivities]);

  const getCoachAdvice = async () => {
    setIsAnalyzing(true);
    setCoachResponse(await getProductivityAnalysis(dashboardActivities));
    setIsAnalyzing(false);
  };

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex w-full bg-[#f5f2ea] dark:bg-[#0a0a0a] transition-colors duration-300 relative justify-center overflow-x-hidden selection:bg-[#c25e2d]/25">
      
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-stone-900/30 dark:bg-black/60 backdrop-blur-[2px] z-[90] lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed lg:sticky top-0 left-0 h-screen z-[100] flex flex-col justify-between py-10 px-6 bg-[#faf8f5]/98 dark:bg-[#0f0f0f] border-r border-[#e4e1d9] dark:border-stone-800 transition-all duration-300 w-64 flex-shrink-0 ${
          isSidebarOpen 
            ? 'translate-x-0 opacity-100 shadow-[4px_0_24px_-4px_rgba(43,41,37,0.06)] lg:shadow-none' 
            : '-translate-x-full lg:w-0 lg:px-0 lg:opacity-0 pointer-events-none overflow-hidden'
        }`}
      >
        <div className="space-y-8">
          {/* Header/Branding inside Sidebar */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tighter text-[#2b2925] dark:text-[#e5e5e5] leading-none">KARMA CHAKRA</h1>
              <span className="text-[8px] text-[#c25e2d] font-black tracking-[0.2em] uppercase block mt-1.5">Navigation Menu</span>
            </div>
            
            {/* Collapse button inside Sidebar for mobile screens */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-150 lg:hidden"
              title="Hide Navigation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            <button 
              onClick={() => { setCurrentView('dashboard'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all w-full text-left ${
                currentView === 'dashboard' 
                  ? 'bg-[#c25e2d]/10 text-[#c25e2d] dark:bg-[#c25e2d]/20' 
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100/60 dark:hover:bg-stone-900/60'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              <span>Home</span>
            </button>

            <button 
              onClick={() => { setCurrentView('focus'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all w-full text-left ${
                currentView === 'focus' 
                  ? 'bg-[#3b6e4c]/10 text-[#3b6e4c] dark:bg-[#3b6e4c]/20' 
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100/60 dark:hover:bg-stone-900/60'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Focus</span>
            </button>

            <button 
              onClick={() => { setCurrentView('goals'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all w-full text-left ${
                currentView === 'goals' 
                  ? 'bg-[#b87d14]/10 text-[#b87d14] dark:bg-[#b87d14]/20' 
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100/60 dark:hover:bg-stone-900/60'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span>Goals</span>
            </button>

            <button 
              onClick={() => { setCurrentView('log'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all w-full text-left ${
                currentView === 'log' 
                  ? 'bg-[#2d5a7b]/10 text-[#2d5a7b] dark:bg-[#2d5a7b]/20' 
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100/60 dark:hover:bg-stone-900/60'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <span>Log</span>
            </button>

            <button 
              onClick={() => { setCurrentView('stats'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all w-full text-left ${
                currentView === 'stats' 
                  ? 'bg-[#2d6a4f]/10 text-[#2d6a4f] dark:bg-[#2d6a4f]/20' 
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100/60 dark:hover:bg-stone-900/60'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
              <span>Stats</span>
            </button>

            <button 
              onClick={() => { setCurrentView('vault'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all w-full text-left ${
                currentView === 'vault' 
                  ? 'bg-[#7a523a]/10 text-[#7a523a] dark:bg-[#7a523a]/20' 
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100/60 dark:hover:bg-[#111111]'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5V15a2.5 2.5 0 0 1 2.5-2.5H14" /><path d="M20 19.5V5a2.5 2.5 0 0 0-2.5-2.5H14" /><path d="M12 2v20" /><path d="M4 6h16" /><path d="M4 10h16" /><path d="M4 14h16" /><path d="m19 19-3-3 3-3" /></svg>
              <span>Dharma Vault</span>
            </button>

            <button 
              onClick={() => { setCurrentView('watchlist'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all w-full text-left ${
                currentView === 'watchlist' 
                  ? 'bg-[#2d6a4f]/10 text-[#2d6a4f] dark:bg-[#2d6a4f]/20' 
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100/60 dark:hover:bg-stone-900/60'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/><path d="M6 12h12"/></svg>
              <span>Price Watchlist</span>
            </button>

            <button 
              onClick={() => { setCurrentView('sync'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              className={`flex items-center justify-between py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all w-full text-left ${
                currentView === 'sync' 
                  ? 'bg-[#823a9d]/10 text-[#823a9d] dark:bg-[#823a9d]/20' 
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100/60 dark:hover:bg-stone-900/60'
              }`}
            >
              <div className="flex items-center gap-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
                <span>Sync Server</span>
              </div>
              <span className={`inline-block w-2.4 h-2.4 rounded-full ${currentUser ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.5)]'}`} title={currentUser ? 'Connected & Synced' : 'Ready (Offline Mode)'} />
            </button>
          </nav>
        </div>

        {/* Hide sidebar button internally */}
        <div className="pt-4 border-t border-stone-200/40 dark:border-stone-850">
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center justify-between w-full py-2.5 px-3 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-xl text-[10px] font-black uppercase text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            <span>Collapse Sidebar</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Container Wrapper */}
      <div className="flex-1 w-full max-w-[96%] xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col relative pb-16">
      
      {/* Alarm Full-Screen Overlay */}
      {activeAlarmTask && (
        <div className="fixed inset-0 z-[200] bg-[#c25e2d] flex flex-col items-center justify-center p-8 text-white animate-in fade-in duration-500">
           <div className="absolute top-1/4 animate-bounce">
              <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
           </div>
           <div className="text-center space-y-4 mt-20">
              <span className="text-sm font-black uppercase tracking-[0.5em] opacity-70">Karma Alert</span>
              <h2 className="text-4xl font-black tracking-tighter leading-none">{activeAlarmTask.description}</h2>
              <div className="flex items-center justify-center gap-3 py-4">
                  <div className="px-4 py-2 bg-white/10 rounded-full border border-white/20 text-xl font-black mono">{activeAlarmTask.startTime}</div>
              </div>
           </div>
           <div className="flex flex-col w-full gap-4 mt-12 max-w-[280px]">
              <button onClick={startTaskFromAlarm} className="w-full py-6 bg-white text-[#c25e2d] font-black rounded-3xl text-lg shadow-2xl active:scale-95 transition-all">START NOW</button>
              <button onClick={dismissAlarm} className="w-full py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-all text-sm uppercase tracking-widest">Dismiss Alarm</button>
           </div>
        </div>
      )}

      {/* Running Activity Notification Sticky (Top) */}
      {activeTask && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-[#c25e2d] px-4 py-2 flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-300">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-orange-100 leading-none mb-0.5">Running Activity</span>
                  <span className="text-xs font-bold text-white truncate max-w-[200px]">{activeTask.description}</span>
              </div>
           </div>
           <div className="bg-white/10 px-3 py-1 rounded-full border border-white/20">
              <span className="text-sm font-black mono text-white">
                {formatMs((activeTask.timer?.totalElapsed || 0) + (Date.now() - (activeTask.timer?.lastStartTime || 0)))}
              </span>
           </div>
        </div>
      )}

      <header className="p-6 pt-14 sticky top-0 z-40 bg-[#f5f2ea]/90 backdrop-blur-xl border-b border-stone-200/60 shadow-[0_4px_20px_-10px_rgba(43,41,37,0.05)] transition-colors duration-300">
        <div className="flex justify-between items-start mb-6 w-full">
          <div className="flex items-start gap-3">
             {/* Sidebar toggle button */}
             <button 
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="p-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-850 dark:hover:bg-stone-800 rounded-xl transition-all border border-stone-200/40 dark:border-stone-700/60 font-bold flex items-center justify-center shadow-sm"
               title={isSidebarOpen ? "Hide Sidebar Menu" : "Show Sidebar Menu"}
             >
               {isSidebarOpen ? (
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-600 dark:text-stone-300">
                   <line x1="18" y1="6" x2="6" y2="18"></line>
                   <line x1="6" y1="6" x2="18" y2="18"></line>
                 </svg>
               ) : (
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-600 dark:text-stone-300">
                   <line x1="4" y1="12" x2="20" y2="12"></line>
                   <line x1="4" y1="6" x2="20" y2="6"></line>
                   <line x1="4" y1="18" x2="20" y2="18"></line>
                 </svg>
               )}
             </button>
             <div>
               <h1 className="text-3xl font-black tracking-tighter text-[#2b2925] leading-none transition-colors duration-300">KARMA CHAKRA</h1>
               <p className="text-[10px] text-[#c25e2d] font-black tracking-[0.2em] uppercase mt-2">Dharma Real-Time</p>
             </div>
          </div>
          <div className="text-right flex flex-col items-end gap-3">
             <div className="flex items-center gap-4 text-xs mono text-stone-500 font-bold uppercase tracking-widest">
                <div>Now: <span className="text-[#2b2925] font-extrabold transition-colors duration-300">{stats.current}</span></div>
                <div>Left: <span className="text-[#c25e2d] font-extrabold">{stats.remaining}</span></div>
             </div>
             <button 
               onClick={() => setIsDark(!isDark)} 
               className="p-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-850 dark:hover:bg-stone-800 rounded-xl transition-all border border-stone-200/40 dark:border-stone-700/60 font-bold flex items-center justify-center shadow-sm"
               id="theme-toggle-btn"
               title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
             >
               {isDark ? (
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M22 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
               ) : (
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-600"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
               )}
             </button>
          </div>
        </div>
        <div className="relative h-1.5 w-full bg-stone-200/80 rounded-full overflow-hidden">
           <div className="absolute top-0 left-0 h-full bg-[#c25e2d] shadow-[0_2px_8px_rgba(194,94,45,0.25)] transition-all duration-1000" style={{ width: `${stats.percentPassed}%` }} />
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6">
        {currentView === 'dashboard' && (
          <>
            {/* Productivity Score Card */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass p-5 rounded-3xl border-stone-200/40 flex flex-col items-center justify-center bg-white/95">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Productivity</span>
                <span className="text-4xl font-black text-[#2b2925] tracking-tighter">{productivityScore}</span>
                <span className="text-[9px] text-[#3b6e4c] font-bold uppercase mt-1">Daily Score</span>
              </div>
              <div className="glass p-5 rounded-3xl border-stone-200/40 flex flex-col items-center justify-center bg-white/95">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Completion</span>
                <span className="text-4xl font-black text-[#2b2925] tracking-tighter">{completionRate}%</span>
                <span className="text-[9px] text-[#2d5a7b] font-bold uppercase mt-1">{dashboardActivities.filter(a => a.status === 'Completed').length}/{dashboardActivities.length} Tasks</span>
              </div>
            </div>

            {/* Group Breakdown */}
            <div className="glass p-5 rounded-3xl border-stone-200/40 bg-white/95">
              <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">Time per Group (Mins)</h3>
              <div className="space-y-3">
                {groupStats.map(stat => (
                  <div key={stat.name} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span className="text-stone-500">{stat.name}</span>
                      <span className="text-[#2b2925] font-extrabold">{stat.mins}m</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500" 
                        style={{ 
                          width: `${Math.min(100, (stat.mins / 480) * 100)}%`, 
                          backgroundColor: GROUP_COLORS[stat.name as ActivityGroup] 
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass p-4 rounded-3xl flex items-center justify-between border-stone-200/40 group transition-all hover:border-[#c25e2d]/30 bg-white/95">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-stone-100 rounded-xl text-[#3b6e4c] border border-stone-200/50"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-lg font-black uppercase text-[#2b2925] outline-none cursor-pointer tracking-tighter" />
              </div>
              <button onClick={() => { setEditingActivity(null); setIsModalOpen(true); }} className="p-3 bg-[#c25e2d] hover:bg-[#b05023] text-white rounded-2xl shadow-md shadow-[#c25e2d]/10 active:scale-95 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
            </div>

            <div className="space-y-4">
              {dashboardActivities.map(activity => (
                <ActivityItem 
                  key={activity.id} 
                  activity={activity} 
                  onUpdateStatus={updateActivityStatus} 
                  onMoveDate={handleMoveToDate} 
                  onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }} 
                  onUpdateTimer={handleUpdateTimer} 
                  onAddDistraction={handleAddDistraction}
                />
              ))}
              {dashboardActivities.length === 0 && <div className="py-20 text-center glass rounded-3xl border-dashed border-stone-200/80 opacity-50 text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">No records for this date</div>}
            </div>
          </>
        )}

        {currentView === 'goals' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
               <h2 className="text-2xl font-black text-[#2b2925] tracking-tighter italic uppercase">Long-Term Goals</h2>
               <button 
                 onClick={() => setIsGoalModalOpen(true)} 
                 className="p-3 bg-[#c25e2d] text-white hover:bg-[#b05023] rounded-2xl shadow-md shadow-[#c25e2d]/15 active:scale-95 transition-all"
               >
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
               </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {goals.map(goal => (
                <div key={goal.id} className={`glass p-5 rounded-3xl border border-stone-200/40 bg-white/95 relative overflow-hidden ${goal.isCompleted ? 'opacity-50' : ''}`}>
                  {goal.isCompleted && <div className="absolute top-0 right-0 bg-[#3b6e4c] text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Completed</div>}
                  <h3 className={`text-lg font-black text-[#2b2925] tracking-tight pr-14 ${goal.isCompleted ? 'line-through' : ''}`}>{goal.title}</h3>
                  <p className="text-xs text-stone-500 mt-1">{goal.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[10px] mono text-[#c25e2d] font-bold uppercase tracking-widest">Target: {goal.targetDate}</span>
                    <div className="flex gap-2">
                      <button onClick={() => toggleGoalCompletion(goal.id)} className={`p-2 rounded-xl border ${goal.isCompleted ? 'bg-[#3b6e4c]/10 border-[#3b6e4c]/30 text-[#3b6e4c]' : 'bg-stone-50 border-stone-200 text-stone-400 hover:bg-stone-100'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button onClick={() => deleteGoal(goal.id)} className="p-2 bg-stone-50 border border-stone-200 text-red-600 hover:bg-red-50 rounded-xl">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {goals.length === 0 && (
                <div className="py-20 text-center glass rounded-3xl border-dashed border-stone-200/80 bg-white/20 opacity-50 text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">
                   Set your targets...
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'log' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-black text-[#2b2925] tracking-tighter italic uppercase">Activity Log</h2>
            <div className="space-y-3">
              {activities.filter(a => a.status === 'Completed').sort((a, b) => b.timestamp - a.timestamp).slice(0, 20).map(a => (
                <div key={a.id} className="glass p-4 rounded-2xl border border-stone-200/40 bg-white/95 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GROUP_COLORS[a.group] }} />
                      <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">{a.group}</span>
                    </div>
                    <h4 className="text-xs font-bold text-[#2b2925]">{a.description}</h4>
                    <span className="text-[9px] text-stone-400 mono">{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-[#3b6e4c] mono">+{Math.round((a.timer?.totalElapsed || 0) / 60000)}m</span>
                  </div>
                </div>
              ))}
              {activities.filter(a => a.status === 'Completed').length === 0 && (
                <div className="py-20 text-center glass rounded-3xl border-dashed border-stone-200/80 bg-white/30 text-[10px] font-black uppercase tracking-widest text-stone-400">No completed tasks yet</div>
              )}
            </div>
          </div>
        )}

        {currentView === 'focus' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="glass p-8 rounded-[40px] border border-[#c25e2d]/25 bg-[#faf8f5] flex flex-col items-center justify-center text-center shadow-sm">
              <h2 className="text-xl font-black text-[#2b2925] mb-8 uppercase tracking-widest">Focus Mode</h2>
              
              {activeTask ? (
                <>
                  <div className="w-48 h-48 rounded-full border-4 border-stone-100 flex items-center justify-center relative mb-8">
                    <div className="absolute inset-0 rounded-full border-4 border-[#c25e2d] border-t-transparent animate-spin" />
                    <span className="text-4xl font-black text-[#2b2925] mono">
                      {formatMs((activeTask.timer?.totalElapsed || 0) + (Date.now() - (activeTask.timer?.lastStartTime || 0)))}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#2b2925] mb-2">{activeTask.description}</h3>
                  <p className="text-xs text-stone-400 mb-8 uppercase tracking-widest font-black">{activeTask.group}</p>
                  
                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => handleUpdateTimer(activeTask.id, (activeTask.timer?.totalElapsed || 0) + (Date.now() - (activeTask.timer?.lastStartTime || 0)), false)}
                      className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-[#2b2925] font-black rounded-2xl border border-stone-200/80 uppercase tracking-widest text-xs transition-colors"
                    >
                      Pause
                    </button>
                    <button 
                      onClick={() => {
                        const final = (activeTask.timer?.totalElapsed || 0) + (Date.now() - (activeTask.timer?.lastStartTime || 0));
                        handleUpdateTimer(activeTask.id, final, false);
                        updateActivityStatus(activeTask.id, 'Completed');
                      }}
                      className="flex-1 py-4 bg-[#3b6e4c] hover:bg-[#2d5537] text-white font-black rounded-2xl shadow-md shadow-[#3b6e4c]/10 uppercase tracking-widest text-xs transition-colors"
                    >
                      Finish
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-12">
                   <div className="w-20 h-20 bg-stone-50 rounded-3xl border border-stone-200 flex items-center justify-center mx-auto mb-6">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#c25e2d]"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                   </div>
                   <p className="text-stone-400 text-sm font-medium max-w-[200px] mx-auto mb-8">Select a task from the dashboard to enter focus mode.</p>
                   <button onClick={() => setCurrentView('dashboard')} className="px-8 py-4 bg-[#c25e2d] text-white font-black rounded-2xl hover:bg-[#b05023] uppercase tracking-widest text-[10px] shadow-sm">Go to Dashboard</button>
                </div>
              )}
            </div>

            <div className="glass p-6 rounded-3xl border border-stone-200/40 bg-white/95 space-y-4 shadow-sm">
              <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Daily Reflection</h3>
              <textarea 
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="How was your discipline today? Any major distractions?" 
                className="w-full bg-stone-50 border border-stone-200/80 rounded-2xl p-4 text-sm text-[#2b2925] focus:outline-none focus:ring-2 focus:ring-[#3b6e4c]/20 focus:border-[#3b6e4c] min-h-[120px] placeholder:text-stone-300 font-medium"
              />
              <button 
                onClick={() => alert('Reflection saved for today!')}
                className="w-full py-3 bg-[#3b6e4c] text-white font-black rounded-xl uppercase tracking-widest text-[10px] hover:bg-[#2d5537] transition-colors shadow-sm"
              >
                Save Reflection
              </button>
            </div>

            {/* Study Cheatsheets / Creative Notes board */}
            <div className="glass p-6 rounded-3xl border border-stone-200/40 bg-white/95 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Study Notes & Cheat-Sheets</h3>
                  <p className="text-[10px] text-stone-400 mt-1">GK shortcuts, formulas, bank syllabus tips</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportNotes}
                    className="p-2.5 bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-[#c25e2d]/10 hover:text-[#c25e2d] rounded-xl shadow-md shadow-stone-100 dark:shadow-none active:scale-95 transition-all flex items-center justify-center"
                    title="Export Scribe Notes to Excel"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => { setEditingNote(null); setIsNoteModalOpen(true); }}
                    className="p-2.5 bg-[#c25e2d] hover:bg-[#b05023] text-white rounded-xl shadow-md shadow-[#c25e2d]/10 active:scale-95 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>
              </div>

              {/* Tag filters */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {(['All', ...NOTE_TYPES] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setNoteFilter(f)}
                    className={`px-3 py-1 text-[9px] font-black rounded-full border transition-all uppercase whitespace-nowrap ${
                      noteFilter === f 
                        ? 'bg-[#c25e2d] text-white border-transparent' 
                        : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredNotes.map(note => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    onClick={(n) => { setEditingNote(n); setIsNoteModalOpen(true); }} 
                  />
                ))}
                {filteredNotes.length === 0 && (
                  <div className="py-10 text-center border border-dashed border-stone-200 rounded-2xl text-[9px] font-black uppercase tracking-widest text-stone-400 bg-stone-50">
                    Your ink pad is clean. Start writing.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentView === 'stats' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="glass p-6 rounded-3xl border border-stone-200/40 bg-white/95">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-sm font-black uppercase tracking-widest text-stone-400 italic">Productivity Trends</h2>
                <select value={reportInterval} onChange={(e) => setReportInterval(e.target.value as ReportInterval)} className="bg-stone-100 border border-stone-200/80 rounded-xl px-4 py-2 text-xs font-black text-[#2b2925] outline-none cursor-pointer">
                  <option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option>
                </select>
              </div>
              
              {reportData.length > 0 ? (
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e1d9" vertical={false} />
                      <XAxis dataKey="name" stroke="#a39d8f" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#a39d8f" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: 'rgba(194,94,45,0.03)'}} contentStyle={{ backgroundColor: '#faf8f5', border: '1px solid #e4e1d9', borderRadius: '16px' }} itemStyle={{ color: '#2b2925', fontSize: '12px' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {reportData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={GROUP_COLORS[entry.name as ActivityGroup] || '#c25e2d'} />
                        ))}
                      </Bar>
                    </BarChart>
                   </ResponsiveContainer>
                </div>
              ) : <div className="py-20 text-center text-xs tracking-widest text-stone-400 uppercase">No data for this interval</div>}
            </div>

            <div className="glass p-6 rounded-3xl border border-[#c25e2d]/25 bg-white/95 shadow-sm">
              <h2 className="text-xl font-black italic text-[#2b2925] mb-2 uppercase tracking-tighter">AI Coach Analysis</h2>
              {!coachResponse && !isAnalyzing && <button onClick={getCoachAdvice} className="w-full py-6 bg-[#c25e2d] hover:bg-[#b05023] text-white font-black rounded-2xl transition-all uppercase tracking-widest text-[11px] shadow-md shadow-[#c25e2d]/10">Analyze My Performance</button>}
              {isAnalyzing && <div className="py-20 text-center text-[#c25e2d] animate-pulse font-black uppercase tracking-[0.5em]">Analyzing Patterns...</div>}
              {coachResponse && !isAnalyzing && <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200/60 text-sm text-stone-700 font-medium leading-relaxed whitespace-pre-wrap">{coachResponse}</div>}
            </div>
          </div>
        )}

        {currentView === 'vault' && (
          <VaultWorkspace 
            entries={vaultEntries}
            onAddEntry={handleAddVaultEntry}
            onUpdateEntry={handleUpdateVaultEntry}
            onDeleteEntry={handleDeleteVaultEntry}
          />
        )}

        {currentView === 'watchlist' && (
          <PriceWatchlist 
            articles={priceArticles}
            onAddArticle={handleAddPriceArticle}
            onAddPriceRecord={handleAddPriceRecord}
            onUpdatePriceRecord={handleUpdatePriceRecord}
            onDeletePriceRecord={handleDeletePriceRecord}
            onDeleteArticle={handleDeletePriceArticle}
            onUpdateArticle={handleUpdatePriceArticle}
          />
        )}

        {currentView === 'sync' && (
          <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            {/* Header & Status card */}
            <div className="glass p-8 rounded-[32px] border border-[#823a9d]/20 bg-gradient-to-br from-white via-[#faf8f5] to-[#fbf8ff] dark:from-[#110c14] dark:to-[#090509] shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#823a9d]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#823a9d]/10 text-[#823a9d] text-[10px] font-black tracking-widest uppercase">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentUser ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${currentUser ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    </span>
                    {currentUser ? 'Live Server Connected' : 'Offline Cache Mode'}
                  </div>
                  <h1 className="text-3xl font-black italic text-[#2b2925] dark:text-stone-100 uppercase tracking-tighter">Real-Time Sync Engine</h1>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-lg font-medium">
                    Synchronise activities, timers, alarms, comparisons, encrypted notebooks, and custom price watchlists live across your mobile and desktop devices.
                  </p>
                </div>
                
                <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md px-5 py-4 rounded-2xl border border-stone-200/60 dark:border-stone-800 flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${currentUser ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect width="16" height="11" x="4" y="9" rx="2" ry="2"/>
                      {currentUser ? <path d="M12 17h.01M7 9V5a5 5 0 0 1 10 0v4"/> : <path d="M7 9V5a5 5 0 0 1 9.5-2.5"/>}
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Connection State</div>
                    <div className="text-sm font-black text-stone-700 dark:text-stone-100">{syncStatusText}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Auth & Device Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Account Setup & Status */}
              <div className="lg:col-span-7 space-y-8">
                
                {/* Supabase Service Setup & Status Card */}
                <div className="glass p-8 rounded-[32px] border border-emerald-500/20 bg-white/95 dark:bg-[#121212]/95 shadow-sm space-y-6 animate-fadeIn">
                  <div className="flex items-center gap-4 border-b border-stone-100 dark:border-stone-900 pb-5">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black italic text-lg shadow-sm">
                      S
                    </div>
                    <div>
                      <div className="text-xs text-stone-400 font-bold uppercase tracking-wider font-sans">Active Sync Provider</div>
                      <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-sans uppercase">Supabase Relational Cloud</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-wider text-stone-400">Supabase Project URL</label>
                      <input 
                        type="text" 
                        placeholder="https://your-project-id.supabase.co" 
                        value={supabaseUrl}
                        onChange={(e) => {
                          setSupabaseUrl(e.target.value);
                          saveSupabaseConfig(e.target.value, supabaseKey);
                        }}
                        className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200/85 dark:border-stone-800 rounded-xl px-4 py-3.5 text-xs text-[#2b2925] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-wider text-stone-400">Supabase Anon Key / API Key</label>
                      <input 
                        type="password" 
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                        value={supabaseKey}
                        onChange={(e) => {
                          setSupabaseKey(e.target.value);
                          saveSupabaseConfig(supabaseUrl, e.target.value);
                        }}
                        className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200/85 dark:border-stone-800 rounded-xl px-4 py-3.5 text-xs text-[#2b2925] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Account / Sync State */}
                {(!supabaseUrl || !supabaseKey) ? (
                  <div className="glass p-8 rounded-[32px] border border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/10 shadow-sm text-center space-y-3">
                    <div className="text-amber-500 text-2xl">⚠️</div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Credentials Required</div>
                    <p className="text-xs text-stone-500 leading-relaxed max-w-md mx-auto">
                      Please supply your Supabase Project URL and Anon API key above. Once saved, the application can securely connect to use your custom backend for real-time authentication and database sync.
                    </p>
                  </div>
                ) : currentUser ? (
                  /* Logged In View */
                  <div className="glass p-8 rounded-[32px] border border-emerald-500/20 bg-white/95 dark:bg-[#121212]/95 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 border-b border-stone-100 dark:border-stone-900 pb-5">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center font-black italic text-lg shadow-sm">
                        {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="text-xs text-stone-400 font-bold uppercase tracking-wider">Active Supabase Account</div>
                        <div className="text-base font-black text-stone-800 dark:text-stone-100">{currentUser.email}</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase text-stone-400 tracking-widest">Database Migrations</h3>
                      
                      {activities.length > 0 || notes.length > 0 || priceArticles.length > 0 ? (
                        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#1a141c] border border-stone-200/40 dark:border-stone-800/80 space-y-3">
                          <p className="text-xs font-semibold leading-relaxed text-stone-600 dark:text-stone-300">
                            You have <strong className="text-emerald-600 font-extrabold">{activities.length}</strong> activities, <strong className="text-emerald-600 font-extrabold">{notes.length}</strong> scribe notes, and <strong className="text-emerald-600 font-extrabold">{priceArticles.length}</strong> watches stored locally. Move them to your clean Supabase tables instantly.
                          </p>
                          <button 
                            onClick={async () => {
                              setMigrationStatus('Upserting state variables to Supabase...');
                              try {
                                await uploadLocalDataToSupabase(
                                  currentUser.uid,
                                  { activities, notes, goals, reflection, vaultEntries, priceArticles },
                                  (txt) => setMigrationStatus(txt)
                                );
                                setTimeout(() => setMigrationStatus(''), 6000);
                              } catch (err: any) {
                                setMigrationStatus('Supabase migration failed: ' + err.message);
                              }
                            }}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/10"
                          >
                            Migrate Local Data to Supabase Table Index
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 text-xs font-semibold text-emerald-800 leading-relaxed">
                          Your cache database is perfectly empty or already fully uploaded to Supabase Relational tables!
                        </div>
                      )}

                      {migrationStatus && (
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 text-xs font-bold leading-relaxed">
                          {migrationStatus}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-stone-100 dark:border-stone-900 flex justify-between items-center">
                      <div className="text-[10px] text-stone-400 font-mono">User ID: {currentUser.uid.substring(0, 12)}...</div>
                      <button 
                        onClick={handleLogout}
                        className="px-5 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Disconnect Account
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Auth Login / Register Form for Supabase */
                  <div className="glass p-8 rounded-[32px] border border-stone-200/70 dark:border-stone-800 bg-white/95 dark:bg-[#121212]/95 shadow-sm">
                    <div className="flex gap-4 border-b border-stone-100 dark:border-stone-900 pb-4 mb-6">
                      <button 
                        onClick={() => { setIsSignUpMode(false); setAuthError(''); setAuthSuccess(''); }}
                        className={`flex-1 pb-2 text-xs font-black tracking-widest uppercase transition-all ${!isSignUpMode ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
                      >
                        Sign In
                      </button>
                      <button 
                        onClick={() => { setIsSignUpMode(true); setAuthError(''); setAuthSuccess(''); }}
                        className={`flex-1 pb-2 text-xs font-black tracking-widest uppercase transition-all ${isSignUpMode ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
                      >
                        Register
                      </button>
                    </div>

                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-wider text-stone-400">Email Address</label>
                        <input 
                          type="email" 
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="your.name@your-domain.com" 
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200/85 dark:border-stone-800 rounded-xl px-4 py-3.5 text-xs text-[#2b2925] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-wider text-stone-400">Secure Password</label>
                        <input 
                          type="password" 
                          placeholder="Minimum 6 characters" 
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200/85 dark:border-stone-800 rounded-xl px-4 py-3.5 text-xs text-[#2b2925] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          required
                        />
                      </div>

                      {authError && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-900/60 text-xs font-bold leading-relaxed rounded-xl">
                          {authError}
                        </div>
                      )}

                      {authSuccess && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 text-xs font-bold leading-relaxed rounded-xl">
                          {authSuccess}
                        </div>
                      )}

                      <button 
                        type="submit"
                        className="w-full py-4 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-600/10"
                      >
                        {isSignUpMode ? 'Register New Account' : 'Authenticate & Sync'}
                      </button>
                    </form>

                    <div className="mt-6 p-4 rounded-2xl bg-[#faf8f5] dark:bg-stone-900/40 border border-stone-200/40 dark:border-stone-800/80">
                      <div className="text-[10px] font-black uppercase text-stone-500 mb-1">💡 Sandbox Integration Rules</div>
                      <p className="text-[10px] text-stone-400 leading-normal">
                        Passwords must contain at least 6 characters. Once you login or sign up, your active session runs purely off Supabase cloud tables.
                      </p>
                    </div>
                  </div>
                )}

                {/* SQL Instruction block - always visible so they can run queries in Supabase */}
                <div className="p-5 bg-stone-950 border border-stone-900 rounded-[24px] space-y-3 shadow-inner">
                  <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-2 font-mono">
                    <span>⚡ Supabase SQL Schema Initializer</span>
                  </div>
                  <p className="text-[10px] text-stone-400 leading-normal font-medium">
                    Log into your Supabase Dashboard, open the SQL Editor, and paste the following commands to instantly create the required table structure:
                  </p>
                  <pre className="text-[9px] font-mono text-stone-300 bg-black/50 p-3 rounded-lg overflow-x-auto max-h-48 select-all">
{`-- 1. Create tables first with explicit public schema prefix
create table if not exists public.activities (
  id text primary key,
  user_id text,
  title text,
  estimated_duration integer,
  group_name text,
  status text,
  date text,
  timer jsonb,
  is_completed boolean,
  moved_from_date text,
  moved_at bigint,
  created_at bigint
);

create table if not exists public.notes (
  id text primary key,
  user_id text,
  title text,
  content text,
  type text,
  created_at bigint,
  updated_at bigint,
  is_pinned boolean
);

create table if not exists public.goals (
  id text primary key,
  user_id text,
  title text,
  description text,
  target_date text,
  is_completed boolean,
  created_at bigint
);

create table if not exists public.reflections (
  user_id text primary key,
  content text,
  updated_at bigint
);

create table if not exists public.vault_entries (
  id text primary key,
  user_id text,
  title text,
  content text,
  category text,
  created_at bigint,
  updated_at bigint
);

create table if not exists public.price_articles (
  id text primary key,
  user_id text,
  name text,
  category text,
  tags text[],
  records jsonb,
  created_at bigint,
  updated_at bigint
);

-- 2. Create Real-Time Publication safely
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
exception
  when others then null;
end $$;

-- 3. Add tables to replication safely (handles already added / missing tables gracefully)
do $$ begin
  alter publication supabase_realtime add table public.activities;
exception
  when duplicate_object then null;
  when undefined_table then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.notes;
exception
  when duplicate_object then null;
  when undefined_table then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.goals;
exception
  when duplicate_object then null;
  when undefined_table then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.reflections;
exception
  when duplicate_object then null;
  when undefined_table then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.vault_entries;
exception
  when duplicate_object then null;
  when undefined_table then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.price_articles;
exception
  when duplicate_object then null;
  when undefined_table then null;
end $$;`}
                  </pre>
                  
                  <div className="pt-2.5 border-t border-stone-900 space-y-2">
                    <div className="text-[9px] font-black uppercase text-emerald-400 tracking-wider font-mono">📍 Step-by-Step Dashboard Navigation:</div>
                    <ul className="text-[9px] text-stone-400 list-decimal list-inside space-y-1 leading-normal font-mono">
                      <li>Log in at <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">supabase.com/dashboard</a> and select your project.</li>
                      <li>On the left-side sidebar, click the <strong className="text-stone-200">"SQL Editor"</strong> icon (represented by <span className="text-amber-400 font-black">&gt;_</span>).</li>
                      <li>Click the <strong className="text-stone-200">"+ New Query"</strong> button at the top to open a blank page.</li>
                      <li>Paste the SQL script copied from above into the input area.</li>
                      <li>Click the green <strong className="text-emerald-400 font-bold">"Run"</strong> button (or press `Cmd + Enter` / `Ctrl + Enter`).</li>
                      <li>To confirm: Click the <strong className="text-stone-200">"Database"</strong> cylinder icon ➔ select <strong className="text-stone-200">"Replication"</strong> ➔ choose <strong className="text-stone-200">"supabase_realtime"</strong> active publication ➔ confirm all 6 tables are checked.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right Column: Multi-device Synchronisation instructions */}
              <div className="md:col-span-12 lg:col-span-5 space-y-6">
                <div className="glass p-6 rounded-[32px] border border-stone-200/70 dark:border-stone-800 bg-white/95 dark:bg-[#121212]/95 shadow-sm space-y-6">
                  <h3 className="text-sm font-black text-[#2b2925] dark:text-stone-100 uppercase tracking-wider border-b border-stone-100 dark:border-stone-900 pb-3">How to run on Mobile</h3>
                  
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#823a9d]/10 dark:bg-[#823a9d]/30 text-[#823a9d] font-bold text-xs flex items-center justify-center shrink-0">1</div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 font-medium leading-relaxed">
                        Copy the current platform URL from your desktop web browser:
                        <code className="block mt-1 p-2 bg-stone-50 dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded text-[10px] select-all truncate font-mono text-[#823a9d]">
                          {window.location.origin}
                        </code>
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#823a9d]/10 dark:bg-[#823a9d]/30 text-[#823a9d] font-bold text-xs flex items-center justify-center shrink-0">2</div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 font-medium leading-relaxed">
                        Open up this copied URL in Safari or Chrome web browser on your Mobile phone.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#823a9d]/10 dark:bg-[#823a9d]/30 text-[#823a9d] font-bold text-xs flex items-center justify-center shrink-0">3</div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 font-medium leading-relaxed">
                        Log in with your registered sync email and password on both systems.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#823a9d]/10 dark:bg-[#823a9d]/30 text-[#823a9d] font-bold text-xs flex items-center justify-center shrink-0">4</div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 font-bold leading-relaxed text-[#823a9d]">
                        Watch live! Any timers, alarms, finished tasks, price changes or notes entered on mobile will update on this desktop browser inside 100ms.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Secure vault / data promise block */}
                <div className="bg-[#faf8f5] dark:bg-stone-900/30 border border-stone-200/50 dark:border-stone-800/80 p-6 rounded-[32px] space-y-3">
                  <div className="flex items-center gap-2 text-[#823a9d]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span className="text-xs font-black uppercase tracking-wider">Privacy & Security Promise</span>
                  </div>
                  <p className="text-[10px] text-stone-400 leading-relaxed">
                    All Dharma Vault credentials are user-encrypted. Data uploaded is securely stored within Firebase Firestore databases using field-level authorization keys.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xl">
          <div className="w-full max-w-md bg-[#faf8f5] p-6 rounded-[32px] border border-stone-200/65 shadow-2xl">
            <h2 className="text-xl font-black mb-6 text-[#2b2925] text-center tracking-tighter uppercase">New Long-Term Goal</h2>
            <div className="space-y-4">
              <input type="text" autoComplete="off" autoCorrect="off" spellCheck={false} value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} placeholder="Goal Title (e.g. Clear SBI PO)" className="w-full bg-stone-50 border border-stone-200/80 rounded-xl px-4 py-4 text-sm text-[#2b2925] focus:outline-none focus:ring-2 focus:ring-[#c25e2d]/30 focus:border-[#c25e2d]" />
              <textarea value={newGoalDesc} onChange={(e) => setNewGoalDesc(e.target.value)} placeholder="Description or Motivation" className="w-full bg-stone-50 border border-stone-200/80 rounded-xl px-4 py-4 text-sm text-[#2b2925] focus:outline-none focus:ring-2 focus:ring-[#c25e2d]/30 focus:border-[#c25e2d] min-h-[100px]" />
              <input type="date" value={newGoalDate} onChange={(e) => setNewGoalDate(e.target.value)} className="w-full bg-stone-50 border border-stone-200/80 rounded-xl px-4 py-4 text-sm text-[#2b2925] focus:outline-none focus:ring-2 focus:ring-[#c25e2d]/30 focus:border-[#c25e2d]" />
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setIsGoalModalOpen(false)} className="flex-1 py-4 text-[10px] text-stone-400 uppercase font-black tracking-widest">Cancel</button>
              <button onClick={handleAddGoal} className="flex-[2] py-4 bg-[#c25e2d] hover:bg-[#b05023] text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-[#c25e2d]/10">Save Goal</button>
            </div>
          </div>
        </div>
      )}

      </div>

      {(isModalOpen || editingActivity) && (
        <ActivityModal 
          initialData={editingActivity}
          goals={goals}
          onClose={() => { setIsModalOpen(false); setEditingActivity(null); }} 
          onSave={handleAddOrEditActivity} 
        />
      )}

      {(isNoteModalOpen || editingNote) && (
        <NoteModal 
          initialData={editingNote}
          onClose={() => { setIsNoteModalOpen(false); setEditingNote(null); }}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
        />
      )}
    </div>
  );
};

export default App;
