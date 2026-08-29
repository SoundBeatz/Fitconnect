-- My Twin generated render storage compatibility v1
-- OpenAI GPT-Image-2 may return validated PNG output. The private avatars bucket
-- therefore permits PNG for generated derivatives while keeping the existing
-- 5 MB object limit and private visibility. Client source ingest remains JPEG-only
-- at the Edge Function boundary.

update storage.buckets
set allowed_mime_types = array['image/jpeg','image/webp','image/png']::text[],
    file_size_limit = 5242880,
    public = false
where id = 'avatars';
