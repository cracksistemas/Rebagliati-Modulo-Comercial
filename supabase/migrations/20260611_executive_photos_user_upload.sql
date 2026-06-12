drop policy if exists "executive photos own folder upload" on storage.objects;
drop policy if exists "executive photos own folder update" on storage.objects;

create policy "executive photos own folder upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'executive-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "executive photos own folder update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'executive-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'executive-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
