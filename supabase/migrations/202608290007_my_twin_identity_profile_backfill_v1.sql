insert into public.my_twin_identity_profiles (user_id, avatar_id, source_sha256, prompt_revision)
select ua.user_id, ua.id, ua.source_sha256, 'canonical-v1'
from public.user_avatars ua
where ua.avatar_type = 'ai'
  and ua.source_photo is not null
  and ua.source_sha256 is not null
on conflict (user_id) do nothing;
