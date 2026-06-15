CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  full_name text
);

CREATE TABLE IF NOT EXISTS public.conversation (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.message (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversation(id) on delete cascade not null,
  sender text not null,
  content text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.email (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  recipient text not null,
  subject text not null,
  body text not null,
  status text default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Voice Agent Configurations Table
CREATE TABLE IF NOT EXISTS public.voice_agent_configurations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  prompt text not null,
  voice_id text default 'josh',
  temperature numeric default 0.7,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  status text default 'draft',
  voice_agent_config_id uuid references public.voice_agent_configurations(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Call Logs Table
CREATE TABLE IF NOT EXISTS public.call_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  contact_name text,
  contact_phone text not null,
  status text not null,
  duration integer default 0,
  recording_url text,
  summary text,
  transcript text,
  vapi_call_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Junction table for Campaign Contacts
CREATE TABLE IF NOT EXISTS public.campaign_contacts (
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  primary key (campaign_id, contact_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_agent_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

-- Define RLS Policies
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own conversations" ON public.conversation FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own messages" ON public.message FOR ALL USING (
  conversation_id IN (SELECT id FROM public.conversation WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own emails" ON public.email FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own contacts" ON public.contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own voice configs" ON public.voice_agent_configurations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own campaigns" ON public.campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own call logs" ON public.call_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own campaign contacts" ON public.campaign_contacts FOR ALL USING (
  campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid())
);
