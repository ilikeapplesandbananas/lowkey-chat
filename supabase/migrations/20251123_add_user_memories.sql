-- Create user_memories table for storing user facts and preferences
create table if not exists user_memories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  key text not null,
  value text not null,
  is_sensitive boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for user_memories
alter table user_memories enable row level security;

-- Create RLS policy: users can only access their own memories
create policy "Users can access their own memories"
  on user_memories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create index for faster lookups
create index user_memories_user_id_key_idx on user_memories(user_id, key);
create index user_memories_created_at_idx on user_memories(created_at);
