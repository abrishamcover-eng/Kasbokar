import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('متغیرهای محیطی Supabase در فایل .env تنظیم نشده‌اند.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// توابع احراز هویت
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// دریافت پروفایل کاربر از دیتابیس
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, role, subscription_tier')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}