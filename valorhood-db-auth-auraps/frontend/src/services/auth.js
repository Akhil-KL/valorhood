import { supabase } from '../supabase'; // Your existing Supabase client

export const signUp = async (email, password, username) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  });
  return { data, error };
};
