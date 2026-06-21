import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ActivityEntry, Note, Goal, VaultEntry, PriceArticle, ContentIndexEntry } from '../types';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseConfig = () => {
  const url = localStorage.getItem('karma_chakra_supabase_url') || 'https://igzwmydbmxlruocfgnmo.supabase.co';
  const key = localStorage.getItem('karma_chakra_supabase_key') || 'sb_publishable_yXH0OAkw6HE15lxEKvdozw_LGENqiNs';
  return { url, key };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('karma_chakra_supabase_url', url);
  localStorage.setItem('karma_chakra_supabase_key', key);
  try {
    const dbRequest = indexedDB.open('KarmaChakraPersistentStorage', 1);
    dbRequest.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('keyvalue')) {
        db.createObjectStore('keyvalue');
      }
    };
    dbRequest.onsuccess = (e: any) => {
      const db = e.target.result;
      const transaction = db.transaction('keyvalue', 'readwrite');
      const store = transaction.objectStore('keyvalue');
      store.put(url, 'karma_chakra_supabase_url');
      store.put(key, 'karma_chakra_supabase_key');
    };
  } catch (err) {
    console.error('Failed to write credentials to IndexedDB persistent storage:', err);
  }
  supabaseInstance = null; // Reset cached client on credentials change
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    return null;
  }

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: {
          getItem: (k) => localStorage.getItem(k),
          setItem: (k, v) => {
            localStorage.setItem(k, v);
            try {
              const dbRequest = indexedDB.open('KarmaChakraPersistentStorage', 1);
              dbRequest.onupgradeneeded = (e: any) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('keyvalue')) {
                  db.createObjectStore('keyvalue');
                }
              };
              dbRequest.onsuccess = (e: any) => {
                const db = e.target.result;
                const transaction = db.transaction('keyvalue', 'readwrite');
                const store = transaction.objectStore('keyvalue');
                store.put(v, k);
                
                transaction.oncomplete = () => {
                  db.close();
                };
                transaction.onerror = () => {
                  db.close();
                };
              };
              dbRequest.onerror = () => {
                console.error('IndexedDB open error in Supabase storage setItem');
              };
            } catch (err) {
              console.error('Failed to write Supabase auth to IndexedDB persistent storage:', err);
            }
          },
          removeItem: (k) => {
            localStorage.removeItem(k);
            try {
              const dbRequest = indexedDB.open('KarmaChakraPersistentStorage', 1);
              dbRequest.onsuccess = (e: any) => {
                const db = e.target.result;
                const transaction = db.transaction('keyvalue', 'readwrite');
                const store = transaction.objectStore('keyvalue');
                store.delete(k);
                
                transaction.oncomplete = () => {
                  db.close();
                };
                transaction.onerror = () => {
                  db.close();
                };
              };
              dbRequest.onerror = () => {
                console.error('IndexedDB open error in Supabase storage removeItem');
              };
            } catch (err) {
              console.error('Failed to delete Supabase auth from IndexedDB persistent storage:', err);
            }
          }
        }
      },
    });
    return supabaseInstance;
  } catch (error) {
    console.error('Supabase Initialization Error:', error);
    return null;
  }
};

export const uploadLocalDataToSupabase = async (
  userId: string,
  data: {
    activities: ActivityEntry[];
    notes: Note[];
    goals: Goal[];
    reflection: string;
    vaultEntries: VaultEntry[];
    priceArticles: PriceArticle[];
  },
  onStatus: (text: string) => void
) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase Client is not configured.');
  }

  try {
    onStatus('Uploading local items to secure Supabase cloud...');

    // Synchronize activities
    if (data.activities.length > 0) {
      const records = data.activities.map(item => ({
        id: item.id,
        user_id: userId,
        title: item.description,
        estimated_duration: item.estimatedDuration,
        group_name: item.group,
        status: item.status,
        date: item.date,
        timer: item.timer || null,
        is_completed: item.status === 'Completed',
        moved_from_date: item.movedFromDate || null,
        moved_at: item.movedAt || null,
        created_at: item.timestamp || Date.now(),
        project: item.project || null,
        start_time: item.startTime || null,
        alarm_enabled: item.alarmEnabled || false,
        goal_id: item.goalId || null,
        distractions: item.distractions || null,
        actual_duration: item.actualDuration || null,
        rescheduled_to: item.rescheduledTo || null,
        image_url: item.imageUrl || null,
      }));

      const { error } = await client.from('activities').upsert(records);
      if (error) {
        console.error('Supabase activities sync warning:', error);
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          onStatus('Legacy activities table detected. Falling back to metadata encoding...');
          const basicRecords = data.activities.map(item => {
            const meta = {
              status: item.status,
              date: item.date,
              project: item.project,
              startTime: item.startTime,
              alarmEnabled: item.alarmEnabled,
              timer: item.timer,
              distractions: item.distractions,
              actualDuration: item.actualDuration,
              rescheduledTo: item.rescheduledTo,
              movedFromDate: item.movedFromDate,
              movedAt: item.movedAt,
              timestamp: item.timestamp,
              imageUrl: item.imageUrl,
            };
            return {
              id: item.id,
              user_id: userId,
              title: `${item.description} __META__${JSON.stringify(meta)}`,
              estimated_duration: item.estimatedDuration,
              group_name: item.group,
            };
          });
          const { error: retryError } = await client.from('activities').upsert(basicRecords);
          if (retryError) console.error('Failed fallback upsert in bulk upload:', retryError);
        }
      }
    }

    // Synchronize notes
    if (data.notes.length > 0) {
      const records = data.notes.map(item => ({
        id: item.id,
        user_id: userId,
        title: item.title,
        content: item.content,
        type: item.type,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        project: item.project || null,
        blocks: item.blocks || null,
      }));

      const { error } = await client.from('notes').upsert(records);
      if (error) {
        console.error('Supabase notes sync warning:', error);
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          onStatus('Legacy notes table detected. Falling back to basic content upload...');
          const basicRecords = data.notes.map(item => ({
            id: item.id,
            user_id: userId,
            title: item.title,
            content: item.content,
            type: item.type,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
          }));
          const { error: retryError } = await client.from('notes').upsert(basicRecords);
          if (retryError) console.error('Failed fallback upsert in notes bulk upload:', retryError);
        }
      }
    }

    // Synchronize goals
    if (data.goals.length > 0) {
      const records = data.goals.map(item => ({
        id: item.id,
        user_id: userId,
        title: item.title,
        description: item.description,
        target_date: item.targetDate,
        is_completed: item.isCompleted,
        created_at: item.createdAt,
      }));

      const { error } = await client.from('goals').upsert(records);
      if (error) console.error('Supabase goals sync warning:', error);
    }

    // Synchronize reflection
    if (data.reflection.trim()) {
      const { error } = await client.from('reflections').upsert({
        user_id: userId,
        content: data.reflection,
        updated_at: Date.now(),
      });
      if (error) console.error('Supabase reflections sync warning:', error);
    }

    // Synchronize vault entries
    if (data.vaultEntries.length > 0) {
      const records = data.vaultEntries.map(item => ({
        id: item.id,
        user_id: userId,
        title: item.title,
        content: item.content,
        category: item.category,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        list_items: item.listItems || null,
        date: item.date || null,
        project_tag: item.projectTag || null,
        impact_rating: item.impactRating || null,
        status: item.status || null,
      }));

      const { error } = await client.from('vault_entries').upsert(records);
      if (error) {
        console.error('Supabase vault entries sync warning:', error);
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          onStatus('Legacy vault entries table detected. Falling back to basic vault upload...');
          const basicRecords = data.vaultEntries.map(item => ({
            id: item.id,
            user_id: userId,
            title: item.title,
            content: item.content,
            category: item.category,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
          }));
          const { error: retryError } = await client.from('vault_entries').upsert(basicRecords);
          if (retryError) console.error('Failed fallback upsert in vault bulk upload:', retryError);
        }
      }
    }

    // Synchronize price articles
    if (data.priceArticles.length > 0) {
      const records = data.priceArticles.map(item => ({
        id: item.id,
        user_id: userId,
        name: item.name,
        category: item.category,
        tags: item.tags,
        records: item.records,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      }));

      const { error } = await client.from('price_articles').upsert(records);
      if (error) console.error('Supabase price articles sync warning:', error);
    }

    onStatus('Supabase Cloud Sync completed successfully!');
  } catch (error: any) {
    console.error('Supabase Data Upload Error:', error);
    onStatus('Error merging records: ' + (error.message || error));
  }
};

// Real-time listener for Supabase with dual-direction recovery sync
export const subscribeToSupabaseCollections = (
  userId: string,
  callbacks: {
    onActivitiesUpdate: (activities: ActivityEntry[]) => void;
    onNotesUpdate: (notes: Note[]) => void;
    onGoalsUpdate: (goals: Goal[]) => void;
    onReflectionUpdate: (content: string) => void;
    onVaultUpdate: (entries: VaultEntry[]) => void;
    onWatchlistUpdate: (articles: PriceArticle[]) => void;
    onSyncStateChange: (syncing: boolean, text: string) => void;
  },
  localData?: {
    activities: ActivityEntry[];
    notes: Note[];
    goals: Goal[];
    reflection: string;
    vaultEntries: VaultEntry[];
    priceArticles: PriceArticle[];
  }
) => {
  const client = getSupabaseClient();
  if (!client) return [];

  callbacks.onSyncStateChange(true, 'Connecting to Supabase realtime channel...');

  // Helper mapping functions
  const mapActivity = (row: any): ActivityEntry => {
    let title = row.title || '';
    let meta: any = {};
    if (title.includes(' __META__')) {
      const parts = title.split(' __META__');
      title = parts[0];
      try {
        meta = JSON.parse(parts[1]);
      } catch (e) {
        console.error('Error parsing activity fallback metadata:', e);
      }
    }

    return {
      id: row.id,
      description: title,
      estimatedDuration: row.estimated_duration || 0,
      group: row.group_name || 'Personal Development',
      status: meta.status || row.status || 'Pending',
      date: meta.date || row.date || new Date().toISOString().split('T')[0],
      timer: meta.timer || row.timer,
      movedFromDate: meta.movedFromDate || row.moved_from_date,
      movedAt: meta.movedAt || row.moved_at,
      timestamp: meta.timestamp || row.created_at || Date.now(),
      project: meta.project || row.project || undefined,
      startTime: meta.startTime || row.start_time || undefined,
      alarmEnabled: meta.alarmEnabled !== undefined ? meta.alarmEnabled : (row.alarm_enabled !== undefined ? row.alarm_enabled : undefined),
      goalId: meta.goalId || row.goal_id || undefined,
      distractions: meta.distractions || row.distractions || undefined,
      actualDuration: meta.actualDuration || row.actual_duration || undefined,
      rescheduledTo: meta.rescheduledTo || row.rescheduled_to || undefined,
      imageUrl: meta.imageUrl || row.image_url || undefined,
    };
  };

  const mapNote = (row: any): Note => ({
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    project: row.project || undefined,
    blocks: row.blocks || undefined,
  });

  const mapGoal = (row: any): Goal => ({
    id: row.id,
    title: row.title,
    description: row.description,
    targetDate: row.target_date,
    isCompleted: row.is_completed,
    createdAt: row.created_at,
  });

  const mapVault = (row: any): VaultEntry => ({
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    listItems: row.list_items || undefined,
    date: row.date || undefined,
    projectTag: row.project_tag || undefined,
    impactRating: row.impact_rating || undefined,
    status: row.status || undefined,
  });

  const mapPriceArticle = (row: any): PriceArticle => ({
    id: row.id,
    name: row.name,
    category: row.category,
    tags: row.tags,
    records: row.records,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  // Pull initial values from Supabase REST API with error resilience
  const pullInitialData = async () => {
    try {
      callbacks.onSyncStateChange(true, 'Pulling user tables from Supabase...');
      
      let resActivities = await client.from('activities').select('*').eq('user_id', userId);
      if (resActivities.error && (resActivities.error.code === '42703' || resActivities.error.message?.includes('column') || resActivities.error.message?.includes('does not exist'))) {
        console.warn('Activities table might be legacy schema, trying to select basic columns only...');
        resActivities = await client.from('activities').select('id, user_id, title, estimated_duration, group_name').eq('user_id', userId);
      }

      let resNotes = await client.from('notes').select('*').eq('user_id', userId);
      if (resNotes.error && (resNotes.error.code === '42703' || resNotes.error.message?.includes('column') || resNotes.error.message?.includes('does not exist'))) {
        console.warn('Notes table might be legacy schema, trying to select basic columns only...');
        resNotes = await client.from('notes').select('id, user_id, title, content, type, created_at, updated_at').eq('user_id', userId);
      }

      const resGoals = await client.from('goals').select('*').eq('user_id', userId);
      const resReflections = await client.from('reflections').select('*').eq('user_id', userId).maybeSingle();

      let resVault = await client.from('vault_entries').select('*').eq('user_id', userId);
      if (resVault.error && (resVault.error.code === '42703' || resVault.error.message?.includes('column') || resVault.error.message?.includes('does not exist'))) {
        console.warn('Vault entries table might be legacy schema, trying to select basic columns only...');
        resVault = await client.from('vault_entries').select('id, user_id, title, content, category, created_at, updated_at').eq('user_id', userId);
      }

      const resPrice = await client.from('price_articles').select('*').eq('user_id', userId);

      const errors = [
        resActivities.error,
        resNotes.error,
        resGoals.error,
        resReflections.error,
        resVault.error,
        resPrice.error
      ].filter(Boolean);

      if (errors.length > 0) {
        // Check for missing table / relation error
        const isMissingRelationObj = errors.find(err => err && (err.code === '42P01' || err.message?.includes('does not exist')));
        if (isMissingRelationObj) {
          callbacks.onSyncStateChange(false, '⚠️ Supabase tables do not exist. Please go to Credentials / SQL Editor and initialize them.');
          return;
        }

        // Check for missing column error (code 42703 is Postgres undefined_column)
        const isMissingColumnObj = errors.find(err => err && (err.code === '42703' || err.message?.includes('column') || err.message?.includes('does not exist')));
        if (isMissingColumnObj) {
          callbacks.onSyncStateChange(false, '⚠️ Columns missing / schema outdated in Supabase. Paste the upgrade SQL script under "SQL Schema Initializer".');
          return;
        }

        callbacks.onSyncStateChange(false, `Sync Error: ${errors[0]?.message || 'Unknown error'}`);
        return;
      }

      // Check if we need to auto-seed local data to empty cloud tables so the user doesn't lose anything
      let anySeeding = false;

      // 1. Sync activities
      if (resActivities.data) {
        if (resActivities.data.length === 0 && localData && localData.activities && localData.activities.length > 0) {
          anySeeding = true;
          callbacks.onSyncStateChange(true, 'Seeding local activities to cloud...');
          const records = localData.activities.map(item => ({
            id: item.id,
            user_id: userId,
            title: item.description,
            estimated_duration: item.estimatedDuration,
            group_name: item.group,
            status: item.status,
            date: item.date,
            timer: item.timer || null,
            is_completed: item.status === 'Completed',
            moved_from_date: item.movedFromDate || null,
            moved_at: item.movedAt || null,
            created_at: item.timestamp || Date.now(),
            project: item.project || null,
            start_time: item.startTime || null,
            alarm_enabled: item.alarmEnabled || false,
            goal_id: item.goalId || null,
            distractions: item.distractions || null,
            actual_duration: item.actualDuration || null,
            rescheduled_to: item.rescheduledTo || null,
            image_url: item.imageUrl || null,
          }));
          const { error: seedError } = await client.from('activities').upsert(records);
          if (seedError) {
            console.error('Activities seed error:', seedError);
            if (seedError.code === '42703' || seedError.message?.includes('column') || seedError.message?.includes('does not exist')) {
              // Retry seeding by packing extra metadata (including the crucial status checkbox checks!) in the title
              const basicRecords = localData.activities.map(item => {
                const meta = {
                  status: item.status,
                  date: item.date,
                  project: item.project,
                  startTime: item.startTime,
                  alarmEnabled: item.alarmEnabled,
                  timer: item.timer,
                  distractions: item.distractions,
                  actualDuration: item.actualDuration,
                  rescheduledTo: item.rescheduledTo,
                  movedFromDate: item.movedFromDate,
                  movedAt: item.movedAt,
                  timestamp: item.timestamp,
                  imageUrl: item.imageUrl,
                };
                return {
                  id: item.id,
                  user_id: userId,
                  title: `${item.description} __META__${JSON.stringify(meta)}`,
                  estimated_duration: item.estimatedDuration,
                  group_name: item.group,
                };
              });
              const { error: retryError } = await client.from('activities').upsert(basicRecords);
              if (retryError) {
                console.error('Failed to seed even with basic records:', retryError);
                callbacks.onSyncStateChange(false, '⚠️ Activities table missing columns and basic seed failed.');
              } else {
                console.log('Seeded activities with basic columns fallback successfully!');
                callbacks.onSyncStateChange(false, '⚠️ Synced with basic column fallbacks. Paste full database schema under credentials for full support.');
              }
            } else {
              callbacks.onSyncStateChange(false, `Activities seed error: ${seedError.message}`);
            }
          }
        } else {
          callbacks.onActivitiesUpdate(resActivities.data.map(mapActivity));
        }
      }

      // 2. Sync notes
      if (resNotes.data) {
        if (resNotes.data.length === 0 && localData && localData.notes && localData.notes.length > 0) {
          anySeeding = true;
          callbacks.onSyncStateChange(true, 'Seeding local notes to cloud...');
          const records = localData.notes.map(item => ({
            id: item.id,
            user_id: userId,
            title: item.title,
            content: item.content,
            type: item.type,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
            project: item.project || null,
            blocks: item.blocks || null,
          }));
          const { error: seedError } = await client.from('notes').upsert(records);
          if (seedError && (seedError.code === '42703' || seedError.message?.includes('column') || seedError.message?.includes('does not exist'))) {
            const basicRecords = localData.notes.map(item => ({
              id: item.id,
              user_id: userId,
              title: item.title,
              content: item.content,
              type: item.type,
              created_at: item.createdAt,
              updated_at: item.updatedAt,
            }));
            await client.from('notes').upsert(basicRecords);
          }
        } else {
          callbacks.onNotesUpdate(resNotes.data.map(mapNote));
        }
      }

      // 3. Sync goals
      if (resGoals.data) {
        if (resGoals.data.length === 0 && localData && localData.goals && localData.goals.length > 0) {
          anySeeding = true;
          callbacks.onSyncStateChange(true, 'Seeding local goals to cloud...');
          const records = localData.goals.map(item => ({
            id: item.id,
            user_id: userId,
            title: item.title,
            description: item.description,
            target_date: item.targetDate,
            is_completed: item.isCompleted,
            created_at: item.createdAt,
          }));
          await client.from('goals').upsert(records);
        } else {
          callbacks.onGoalsUpdate(resGoals.data.map(mapGoal));
        }
      }

      // 4. Reflections
      if (resReflections.data) {
        callbacks.onReflectionUpdate(resReflections.data.content || '');
      } else if (localData && localData.reflection && localData.reflection.trim()) {
        anySeeding = true;
        await client.from('reflections').upsert({
          user_id: userId,
          content: localData.reflection,
          updated_at: Date.now()
        });
      }

      // 5. Vault entries
      if (resVault.data) {
        if (resVault.data.length === 0 && localData && localData.vaultEntries && localData.vaultEntries.length > 0) {
          anySeeding = true;
          callbacks.onSyncStateChange(true, 'Seeding local vault entries to cloud...');
          const records = localData.vaultEntries.map(item => ({
            id: item.id,
            user_id: userId,
            title: item.title,
            content: item.content,
            category: item.category,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
            list_items: item.listItems || null,
            date: item.date || null,
            project_tag: item.projectTag || null,
            impact_rating: item.impactRating || null,
            status: item.status || null,
          }));
          const { error: seedError } = await client.from('vault_entries').upsert(records);
          if (seedError && (seedError.code === '42703' || seedError.message?.includes('column') || seedError.message?.includes('does not exist'))) {
            const basicRecords = localData.vaultEntries.map(item => ({
              id: item.id,
              user_id: userId,
              title: item.title,
              content: item.content,
              category: item.category,
              created_at: item.createdAt,
              updated_at: item.updatedAt,
            }));
            await client.from('vault_entries').upsert(basicRecords);
          }
        } else {
          callbacks.onVaultUpdate(resVault.data.map(mapVault));
        }
      }

      // 6. Price watchlist
      if (resPrice.data) {
        if (resPrice.data.length === 0 && localData && localData.priceArticles && localData.priceArticles.length > 0) {
          anySeeding = true;
          callbacks.onSyncStateChange(true, 'Seeding watchlist items to cloud...');
          const records = localData.priceArticles.map(item => ({
            id: item.id,
            user_id: userId,
            name: item.name,
            category: item.category,
            tags: item.tags,
            records: item.records,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
          }));
          await client.from('price_articles').upsert(records);
        } else {
          callbacks.onWatchlistUpdate(resPrice.data.map(mapPriceArticle));
        }
      }

      // If we performed any custom cloud seeding, pull again to get unified server results
      if (anySeeding) {
        let refActivities = await client.from('activities').select('*').eq('user_id', userId);
        if (refActivities.error && (refActivities.error.code === '42703' || refActivities.error.message?.includes('column'))) {
          refActivities = await client.from('activities').select('id, user_id, title, estimated_duration, group_name').eq('user_id', userId);
        }

        let refNotes = await client.from('notes').select('*').eq('user_id', userId);
        if (refNotes.error && (refNotes.error.code === '42703' || refNotes.error.message?.includes('column'))) {
          refNotes = await client.from('notes').select('id, user_id, title, content, type, created_at, updated_at').eq('user_id', userId);
        }

        const refGoals = await client.from('goals').select('*').eq('user_id', userId);

        let refVault = await client.from('vault_entries').select('*').eq('user_id', userId);
        if (refVault.error && (refVault.error.code === '42703' || refVault.error.message?.includes('column'))) {
          refVault = await client.from('vault_entries').select('id, user_id, title, content, category, created_at, updated_at').eq('user_id', userId);
        }

        const refPrice = await client.from('price_articles').select('*').eq('user_id', userId);

        if (refActivities.data) callbacks.onActivitiesUpdate(refActivities.data.map(mapActivity));
        if (refNotes.data) callbacks.onNotesUpdate(refNotes.data.map(mapNote));
        if (refGoals.data) callbacks.onGoalsUpdate(refGoals.data.map(mapGoal));
        if (refVault.data) callbacks.onVaultUpdate(refVault.data.map(mapVault));
        if (refPrice.data) callbacks.onWatchlistUpdate(refPrice.data.map(mapPriceArticle));
      }

      callbacks.onSyncStateChange(false, 'Synced with Supabase Cloud');
    } catch (e: any) {
      console.error('Supabase initial fetch caught error:', e);
      callbacks.onSyncStateChange(false, '⚠️ Connection check completed (Using legacy fallback support)');
    }
  };

  pullInitialData();

  // Create Postgres changes subscriptions for user's tables (useful if tables have CDC enabled)
  const uniqueChannelName = `supabase-sync-${userId}-${Math.random().toString(36).substring(2, 10)}`;
  const channel = client
    .channel(uniqueChannelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `user_id=eq.${userId}` }, () => {
      pullInitialData();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${userId}` }, () => {
      pullInitialData();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` }, () => {
      pullInitialData();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reflections', filter: `user_id=eq.${userId}` }, () => {
      pullInitialData();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vault_entries', filter: `user_id=eq.${userId}` }, () => {
      pullInitialData();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'price_articles', filter: `user_id=eq.${userId}` }, () => {
      pullInitialData();
    })
    .subscribe((status) => {
      console.log('Supabase real-time stream subscription status:', status);
    });

  return [() => {
    client.removeChannel(channel);
  }];
};

// WRITE LOGIC FOR SUPABASE
export const supabaseSaveActivity = async (userId: string, item: ActivityEntry) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('activities').upsert({
    id: item.id,
    user_id: userId,
    title: item.description,
    estimated_duration: item.estimatedDuration,
    group_name: item.group,
    status: item.status,
    date: item.date,
    timer: item.timer || null,
    is_completed: item.status === 'Completed',
    moved_from_date: item.movedFromDate || null,
    moved_at: item.movedAt || null,
    created_at: item.timestamp || Date.now(),
    project: item.project || null,
    start_time: item.startTime || null,
    alarm_enabled: item.alarmEnabled || false,
    goal_id: item.goalId || null,
    distractions: item.distractions || null,
    actual_duration: item.actualDuration || null,
    rescheduled_to: item.rescheduledTo || null,
    image_url: item.imageUrl || null,
  });
  if (error) {
    if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
      console.warn('Saving activity failed due to missing columns, trying basic columns fallback with metadata packing...', error);
      const meta = {
        status: item.status,
        date: item.date,
        project: item.project,
        startTime: item.startTime,
        alarmEnabled: item.alarmEnabled,
        timer: item.timer,
        distractions: item.distractions,
        actualDuration: item.actualDuration,
        rescheduledTo: item.rescheduledTo,
        movedFromDate: item.movedFromDate,
        movedAt: item.movedAt,
        timestamp: item.timestamp,
        imageUrl: item.imageUrl,
      };
      const { error: retryError } = await client.from('activities').upsert({
        id: item.id,
        user_id: userId,
        title: `${item.description} __META__${JSON.stringify(meta)}`,
        estimated_duration: item.estimatedDuration,
        group_name: item.group,
      });
      if (retryError) {
        console.error('Basic metadata fallback save failed:', retryError);
      } else {
        console.log('Successfully saved activity using basic columns + metadata fallback.');
      }
    } else {
      console.error('Error saving activity to Supabase activities table:', error);
    }
  }
};

export const supabaseDeleteActivity = async (activityId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('activities').delete().eq('id', activityId);
  if (error) {
    console.error('Error deleting activity from Supabase activities table:', error);
  }
};

export const supabaseSaveNote = async (userId: string, item: Note) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('notes').upsert({
    id: item.id,
    user_id: userId,
    title: item.title,
    content: item.content,
    type: item.type,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    project: item.project || null,
    blocks: item.blocks || null,
  });
  if (error) {
    if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
      console.warn('Saving note failed due to missing columns, trying basic columns fallback', error);
      const { error: retryError } = await client.from('notes').upsert({
        id: item.id,
        user_id: userId,
        title: item.title,
        content: item.content,
        type: item.type,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      });
      if (retryError) console.error('Basic fallback save failed for note:', retryError);
    } else {
      console.error('Error saving note to Supabase notes table:', error);
    }
  }
};

export const supabaseDeleteNote = async (noteId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('notes').delete().eq('id', noteId);
  if (error) {
    console.error('Error deleting note from Supabase notes table:', error);
  }
};

export const supabaseSaveGoal = async (userId: string, item: Goal) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('goals').upsert({
    id: item.id,
    user_id: userId,
    title: item.title,
    description: item.description,
    target_date: item.targetDate,
    is_completed: item.isCompleted,
    created_at: item.createdAt,
  });
  if (error) {
    console.error('Error saving goal to Supabase goals table:', error);
  }
};

export const supabaseDeleteGoal = async (goalId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('goals').delete().eq('id', goalId);
  if (error) {
    console.error('Error deleting goal from Supabase goals table:', error);
  }
};

export const supabaseSaveReflection = async (userId: string, content: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('reflections').upsert({
    user_id: userId,
    content: content,
    updated_at: Date.now(),
  });
  if (error) {
    console.error('Error saving reflection to Supabase reflections table:', error);
  }
};

export const supabaseSaveVaultEntry = async (userId: string, item: VaultEntry) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('vault_entries').upsert({
    id: item.id,
    user_id: userId,
    title: item.title,
    content: item.content,
    category: item.category,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    list_items: item.listItems || null,
    date: item.date || null,
    project_tag: item.projectTag || null,
    impact_rating: item.impactRating || null,
    status: item.status || null,
  });
  if (error) {
    if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
      console.warn('Saving vault entry failed due to missing columns, trying basic columns fallback', error);
      const { error: retryError } = await client.from('vault_entries').upsert({
        id: item.id,
        user_id: userId,
        title: item.title,
        content: item.content,
        category: item.category,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      });
      if (retryError) console.error('Basic fallback save failed for vault entry:', retryError);
    } else {
      console.error('Error saving vault entry to Supabase vault_entries table:', error);
    }
  }
};

export const supabaseDeleteVaultEntry = async (entryId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('vault_entries').delete().eq('id', entryId);
  if (error) {
    console.error('Error deleting vault entry from Supabase vault_entries table:', error);
  }
};

export const supabaseSavePriceArticle = async (userId: string, item: PriceArticle) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('price_articles').upsert({
    id: item.id,
    user_id: userId,
    name: item.name,
    category: item.category,
    tags: item.tags,
    records: item.records,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  });
  if (error) {
    console.error('Error saving price article to Supabase price_articles table:', error);
  }
};

export const supabaseDeletePriceArticle = async (articleId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('price_articles').delete().eq('id', articleId);
  if (error) {
    console.error('Error deleting price article from Supabase price_articles table:', error);
  }
};

export const supabaseSaveContentIndexes = async (userId: string, items: ContentIndexEntry[]) => {
  const client = getSupabaseClient();
  if (!client) return;
  
  try {
    // Delete existing indexes to avoid orphans
    await client.from('content_indexes').delete().eq('user_id', userId);
    
    if (items.length === 0) return;
    
    const records = items.map(item => ({
      id: item.id,
      user_id: userId,
      content_type: item.contentType,
      source_id: item.sourceId,
      title: item.title,
      category: item.category,
      sequence_order: item.sequenceOrder,
      unique_key: item.uniqueKey,
      high_price: item.highPrice,
      low_price: item.lowPrice,
      currency: item.currency,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    }));
    
    const { error } = await client.from('content_indexes').upsert(records);
    if (error) {
      console.error('Error saving content indexes to Supabase:', error);
    }
  } catch (err) {
    console.error('Failed to sync content indexes on Supabase:', err);
  }
};

/**
 * Uploads a file to the private Supabase Storage bucket "app-files".
 * Folder rule: every uploaded file path must start with the user id.
 * Format: ${auth.uid()}/${featureName}/${itemId}/${uuid}.${extension}
 */
export const supabaseUploadFile = async (
  userId: string,
  featureName: string,
  itemId: string,
  file: File
): Promise<string> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase Client is not configured.');
  }

  // Extract clean extension or default to png
  const ext = file.name.split('.').pop() || 'png';
  const randomUuid = Math.random().toString(36).substring(2, 12);
  const filePath = `${userId}/${featureName}/${itemId}/${randomUuid}.${ext}`;

  const { data, error } = await client.storage
    .from('app-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return filePath;
};

/**
 * Displays or retrieves private files using temporary signed URLs since the bucket is private.
 */
export const supabaseGetSignedUrl = async (filePath: string): Promise<string> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase Client is not configured.');
  }

  const { data, error } = await client.storage
    .from('app-files')
    .createSignedUrl(filePath, 3600); // 1 hour expiration

  if (error) {
    throw error;
  }

  if (!data?.signedUrl) {
    throw new Error('Failed to retrieve signed URL from Supabase storage.');
  }

  return data.signedUrl;
};

/**
 * Removes the given file from Supabase Storage.
 */
export const supabaseDeleteFile = async (filePath: string): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.storage
    .from('app-files')
    .remove([filePath]);

  if (error) {
    console.warn(`Could not completely clean up file ${filePath} from Storage:`, error.message);
  }
};
