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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own conversations" ON public.conversation FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own messages" ON public.message FOR ALL USING (
  conversation_id IN (SELECT id FROM public.conversation WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own emails" ON public.email FOR ALL USING (auth.uid() = user_id);
