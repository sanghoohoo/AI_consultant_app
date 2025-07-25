
import { supabase } from '../lib/supabaseClient';

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_profile')
    .select('hope_major')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
};
