import { supabase } from '../supabaseClient';
import { ProfileTree } from '../types';

const STORAGE_KEY_PREFIX = 'basestack.profileTree.';

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function readLocalProfileTree(userId: string): ProfileTree | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(getStorageKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ProfileTree;
  } catch {
    return null;
  }
}

function writeLocalProfileTree(userId: string, tree: ProfileTree) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(tree));
}

export async function loadProfileTree(userId: string): Promise<ProfileTree | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('tree')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error loading from Supabase, falling back to local storage:', error.message);
      return readLocalProfileTree(userId);
    }

    if (data?.tree) {
      const tree = data.tree as ProfileTree;
      // Sync to local as backup
      writeLocalProfileTree(userId, tree);
      return tree;
    }
  } catch (err: any) {
    console.warn('Exception loading from Supabase, falling back to local storage:', err.message);
  }

  // If no data in Supabase, check local storage (e.g., from before the DB was set up)
  const localTree = readLocalProfileTree(userId);
  
  if (localTree) {
    // Automatically migrate local data to Supabase
    saveProfileTree(userId, localTree).catch((err) => {
      console.error('Failed to migrate local profile tree to Supabase:', err);
    });
  }

  return localTree;
}

export async function saveProfileTree(userId: string, tree: ProfileTree): Promise<void> {
  // Always update local backup
  writeLocalProfileTree(userId, tree);

  try {
    const { error } = await supabase
      .from('user_profiles')
      .upsert(
        { user_id: userId, tree, updated_at: new Date().toISOString() }, 
        { onConflict: 'user_id' }
      );

    if (error) {
      console.warn('Error saving to Supabase. Data is saved locally as backup:', error.message);
      throw error;
    }
  } catch (err: any) {
    console.error('Failed to save to Supabase:', err.message);
    throw err;
  }
}

export async function deleteProfileTree(userId: string): Promise<void> {
  // Remove from local storage
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(getStorageKey(userId));
  }

  // Remove from Supabase
  try {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
  } catch (err: any) {
    console.error('Failed to delete from Supabase:', err.message);
    throw err;
  }
}
