import { createClient } from '@supabase/supabase-js';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(configuredUrl && configuredAnonKey);

// The app must remain usable in local/mobile demo mode even before Supabase is configured.
// Auth calls will simply return an empty session or a normal connection error instead of
// crashing the React module during startup and leaving a blank screen.
const supabaseUrl = configuredUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = configuredAnonKey || 'public-placeholder-key';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEMO_SESSION_KEY = 'bizsanj_demo_session';
const DEMO_ACCOUNTS_KEY = 'bizsanj_demo_accounts';
type DemoSession = { user: { id: string; email: string; user_metadata: { full_name: string } } };
type DemoAccount = { password: string; fullName: string };

export function getDemoSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    return raw ? JSON.parse(raw) as DemoSession : null;
  } catch {
    return null;
  }
}

export function saveDemoSession(email: string, fullName: string): DemoSession {
  const session: DemoSession = {
    user: { id: `demo-${btoa(email).replace(/[^a-z0-9]/gi, '').slice(0, 24)}`, email, user_metadata: { full_name: fullName } },
  };
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('bizsanj-auth-change'));
  return session;
}

export function registerDemoAccount(email: string, password: string, fullName: string): DemoSession {
  const accounts = getDemoAccounts();
  accounts[email.trim().toLowerCase()] = { password, fullName };
  localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
  return saveDemoSession(email.trim().toLowerCase(), fullName);
}

export function authenticateDemoAccount(email: string, password: string): DemoSession {
  const normalizedEmail = email.trim().toLowerCase();
  const account = getDemoAccounts()[normalizedEmail];
  if (!account || account.password !== password) throw new Error('ایمیل یا رمز عبور صحیح نیست. ابتدا ثبت‌نام کنید.');
  return saveDemoSession(normalizedEmail, account.fullName);
}

function getDemoAccounts(): Record<string, DemoAccount> {
  try { return JSON.parse(localStorage.getItem(DEMO_ACCOUNTS_KEY) || '{}') as Record<string, DemoAccount>; } catch { return {}; }
}

export function clearDemoSession() {
  localStorage.removeItem(DEMO_SESSION_KEY);
  window.dispatchEvent(new Event('bizsanj-auth-change'));
}

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
