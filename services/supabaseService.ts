import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ActivityEntry, Note, Goal, VaultEntry, PriceArticle } from '../types';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseConfig = () => {
  const url = localStorage.getItem('karma_chakra_supabase_url') || '';
  const key = localStorage.getItem('karma_chakra_supabase_key') || '';
  return { url, key };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('karma_chakra_supabase_url', url);
  localStorage.setItem('karma_chakra_supabase_key', key);
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
      }));

      const { error } = await client.from('activities').upsert(records);
      if (error) console.error('Supabase activities sync warning:', error);
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
      }));

      const { error } = await client.from('notes').upsert(records);
      if (error) console.error('Supabase notes sync warning:', error);
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
      }));

      const { error } = await client.from('vault_entries').upsert(records);
      if (error) console.error('Supabase vault entries sync warning:', error);
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

// Real-time listener for Supabase
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
  }
) => {
  const client = getSupabaseClient();
  if (!client) return [];

  callbacks.onSyncStateChange(true, 'Connecting to Supabase realtime channel...');

  // Helper mapping functions
  const mapActivity = (row: any): ActivityEntry => ({
    id: row.id,
    description: row.title,
    estimatedDuration: row.estimated_duration,
    group: row.group_name,
    status: row.status,
    date: row.date,
    timer: row.timer,
    movedFromDate: row.moved_from_date,
    movedAt: row.moved_at,
    timestamp: row.created_at,
  });

  const mapNote = (row: any): Note => ({
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

  // Pull initial values from Supabase REST API
  const pullInitialData = async () => {
    try {
      callbacks.onSyncStateChange(true, 'Pulling user tables from Supabase...');
      
      const [
        resActivities,
        resNotes,
        resGoals,
        resReflections,
        resVault,
        resPrice
      ] = await Promise.all([
        client.from('activities').select('*').eq('user_id', userId),
        client.from('notes').select('*').eq('user_id', userId),
        client.from('goals').select('*').eq('user_id', userId),
        client.from('reflections').select('*').eq('user_id', userId).maybeSingle(),
        client.from('vault_entries').select('*').eq('user_id', userId),
        client.from('price_articles').select('*').eq('user_id', userId)
      ]);

      const errors = [
        resActivities.error,
        resNotes.error,
        resGoals.error,
        resReflections.error,
        resVault.error,
        resPrice.error
      ].filter(Boolean);

      if (errors.length > 0) {
        const isMissingRelationObj = errors.find(err => err && (err.code === '42P01' || err.message?.includes('does not exist')));
        if (isMissingRelationObj) {
          callbacks.onSyncStateChange(false, 'Sync Warning: Tables missing in Supabase. Click "Credentials" to run SQL script.');
          return;
        }
        callbacks.onSyncStateChange(false, `Sync Error: ${errors[0]?.message || 'Unknown error'}`);
        return;
      }

      if (resActivities.data) callbacks.onActivitiesUpdate(resActivities.data.map(mapActivity));
      if (resNotes.data) callbacks.onNotesUpdate(resNotes.data.map(mapNote));
      if (resGoals.data) callbacks.onGoalsUpdate(resGoals.data.map(mapGoal));
      if (resReflections.data) callbacks.onReflectionUpdate(resReflections.data.content || '');
      if (resVault.data) callbacks.onVaultUpdate(resVault.data.map(mapVault));
      if (resPrice.data) callbacks.onWatchlistUpdate(resPrice.data.map(mapPriceArticle));

      callbacks.onSyncStateChange(false, 'Synced with Supabase Cloud');
    } catch (e: any) {
      console.error('Supabase initial fetch caught error:', e);
      callbacks.onSyncStateChange(false, 'Supabase pull warning');
    }
  };

  pullInitialData();

  // Create Postgres changes subscriptions for user's tables (useful if tables have CDC enabled)
  const channel = client
    .channel('supabase-sync-changes')
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
  await client.from('activities').upsert({
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
  });
};

export const supabaseDeleteActivity = async (activityId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from('activities').delete().eq('id', activityId);
};

export const supabaseSaveNote = async (userId: string, item: Note) => {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from('notes').upsert({
    id: item.id,
    user_id: userId,
    title: item.title,
    content: item.content,
    type: item.type,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  });
};

export const supabaseDeleteNote = async (noteId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from('notes').delete().eq('id', noteId);
};

export const supabaseSaveGoal = async (userId: string, item: Goal) => {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from('goals').upsert({
    id: item.id,
    user_id: userId,
    title: item.title,
    description: item.description,
    target_date: item.targetDate,
    is_completed: item.isCompleted,
    created_at: item.createdAt,
  });
};

export const supabaseDeleteGoal = async (goalId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from('goals').delete().eq('id', goalId);
};

export const supabaseSaveReflection = async (userId: string, content: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from('reflections').upsert({
    user_id: userId,
    content: content,
    updated_at: Date.now(),
  });
};

export const supabaseSaveVaultEntry = async (userId: string, item: VaultEntry) => {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from('vault_entries').upsert({
    id: item.id,
    user_id: userId,
    title: item.title,
    content: item.content,
    category: item.category,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  });
};

export const supabaseDeleteVaultEntry = async (entryId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from('vault_entries').delete().eq('id', entryId);
};

export const supabaseSavePriceArticle = async (userId: string, item: PriceArticle) => {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from('price_articles').upsert({
    id: item.id,
    user_id: userId,
    name: item.name,
    category: item.category,
    tags: item.tags,
    records: item.records,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  });
};

export const supabaseDeletePriceArticle = async (articleId: string) => {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from('price_articles').delete().eq('id', articleId);
};
