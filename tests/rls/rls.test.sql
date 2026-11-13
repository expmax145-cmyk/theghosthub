\set ON_ERROR_STOP on
-- Helpers -------------------------------------------------------------
create table if not exists _results (name text, ok boolean, detail text);
create or replace function pg_temp_assert(n text, cond boolean, d text default '') returns void language plpgsql as
$$ begin insert into public._results values (n, coalesce(cond,false), d); end $$;
grant all on _results to anon, authenticated;
grant execute on function pg_temp_assert(text, boolean, text) to anon, authenticated;

-- Fixtures (as superuser) ---------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@x.dev'),   -- first user => owner
  ('22222222-2222-2222-2222-222222222222', 'stranger@x.dev'); -- must never become owner

insert into public.projects (id, owner_id, name, slug, visibility, repository_url, repository_is_public, live_demo_url) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Pub','pub','published','https://github.com/o/private-looking',false,'https://demo.example'),
  ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Draft','draft','draft',null,false,null),
  ('aaaaaaaa-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Arch','arch','archived',null,false,null),
  ('aaaaaaaa-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','PubRepo','pubrepo','published','https://github.com/o/open',true,null);

insert into public.files (id, owner_id, project_id, role, original_filename, storage_key, file_size, visibility) values
  ('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','screenshot','s.png','k/pub-shot',10,'public'),
  ('bbbbbbbb-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','attachment','secret.zip','k/pub-private-zip',10,'private'),
  ('bbbbbbbb-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','attachment','app.apk','k/pub-public-apk',10,'public'),
  ('bbbbbbbb-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000002','screenshot','d.png','k/draft-shot',10,'public'),
  ('bbbbbbbb-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111',null,'attachment','loose.zip','k/loose',10,'public');
insert into public.releases (project_id, version, visibility) values
  ('aaaaaaaa-0000-0000-0000-000000000001','1.0','public'),
  ('aaaaaaaa-0000-0000-0000-000000000001','0.9','private'),
  ('aaaaaaaa-0000-0000-0000-000000000002','0.1','public');
insert into storage.objects (bucket_id, name) values
  ('hub-files','k/pub-shot'),('hub-files','k/pub-private-zip'),('hub-files','k/pub-public-apk'),
  ('hub-files','k/draft-shot'),('hub-files','k/loose');

select pg_temp_assert('first signup became owner', (select is_owner from public.profiles where id='11111111-1111-1111-1111-111111111111'));
select pg_temp_assert('second signup is NOT owner', not (select is_owner from public.profiles where id='22222222-2222-2222-2222-222222222222'));

-- ANON -----------------------------------------------------------------
set role anon;
select set_config('request.jwt.claims','',false), set_config('request.jwt.claim.sub','',false);
select pg_temp_assert('anon sees only published projects', (select array_agg(slug order by slug) from public.projects) = array['pub','pubrepo']);
select pg_temp_assert('anon: drafts hidden by id', (select count(*) from public.projects where id='aaaaaaaa-0000-0000-0000-000000000002')=0);
select pg_temp_assert('anon: archived hidden', (select count(*) from public.projects where slug='arch')=0);
select pg_temp_assert('anon sees only public files of published projects', (select array_agg(original_filename order by original_filename) from public.files) = array['app.apk','s.png']);
select pg_temp_assert('anon: private attachment of published project hidden', (select count(*) from public.files where original_filename='secret.zip')=0);
select pg_temp_assert('anon: public file of DRAFT project hidden', (select count(*) from public.files where original_filename='d.png')=0);
select pg_temp_assert('anon: unattached "public" file hidden', (select count(*) from public.files where original_filename='loose.zip')=0);
select pg_temp_assert('anon sees only public releases of published projects', (select array_agg(version) from public.releases) = array['1.0']);
select pg_temp_assert('anon: public_repository_url hidden when repo private', (select public_repository_url from public.projects where slug='pub') is null);
select pg_temp_assert('anon: public_repository_url shown when repo public', (select public_repository_url from public.projects where slug='pubrepo') = 'https://github.com/o/open');
do $$ begin
  begin perform repository_url from public.projects; perform pg_temp_assert('anon cannot select repository_url column', false);
  exception when insufficient_privilege then perform pg_temp_assert('anon cannot select repository_url column', true); end;
  begin perform owner_id from public.files; perform pg_temp_assert('anon cannot select files.owner_id', false);
  exception when insufficient_privilege then perform pg_temp_assert('anon cannot select files.owner_id', true); end;
  begin perform * from public.activity_log; perform pg_temp_assert('anon cannot read activity_log', false);
  exception when insufficient_privilege then perform pg_temp_assert('anon cannot read activity_log', true); end;
  begin insert into public.projects (owner_id,name,slug,visibility) values ('11111111-1111-1111-1111-111111111111','x','x','published'); perform pg_temp_assert('anon cannot insert project', false);
  exception when insufficient_privilege then perform pg_temp_assert('anon cannot insert project', true); end;
  begin update public.projects set name='hacked'; perform pg_temp_assert('anon cannot update projects', false);
  exception when insufficient_privilege then perform pg_temp_assert('anon cannot update projects', true); end;
  begin delete from public.files; perform pg_temp_assert('anon cannot delete files', false);
  exception when insufficient_privilege then perform pg_temp_assert('anon cannot delete files', true); end;
end $$;
select pg_temp_assert('anon storage: only public files of published projects',
  (select array_agg(name order by name) from storage.objects where bucket_id='hub-files') = array['k/pub-public-apk','k/pub-shot']);
select pg_temp_assert('anon storage: private zip unreachable', (select count(*) from storage.objects where name='k/pub-private-zip')=0);
select pg_temp_assert('anon storage: draft screenshot unreachable', (select count(*) from storage.objects where name='k/draft-shot')=0);
select pg_temp_assert('anon cannot see profile email-bearing owner row beyond public cols', (select count(*) from public.profiles)=1);
do $$ begin
  begin perform is_owner from public.profiles; perform pg_temp_assert('anon cannot select profiles.is_owner', false);
  exception when insufficient_privilege then perform pg_temp_assert('anon cannot select profiles.is_owner', true); end;
  begin insert into storage.objects (bucket_id,name) values ('hub-files','evil'); perform pg_temp_assert('anon cannot upload to storage', false);
  exception when others then perform pg_temp_assert('anon cannot upload to storage', true); end;
end $$;
reset role;

-- STRANGER (authenticated, not owner) ------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false), set_config('request.jwt.claims','{"aal":"aal1"}',false);
select pg_temp_assert('stranger: is_owner() false', public.is_owner() = false);
select pg_temp_assert('stranger sees only published projects', (select count(*) from public.projects)=2);
select pg_temp_assert('stranger sees no drafts', (select count(*) from public.projects where visibility<>'published')=0);
select pg_temp_assert('stranger: activity_log empty', (select count(*) from public.activity_log)=0);
do $$ begin
  begin insert into public.projects (owner_id,name,slug) values ('22222222-2222-2222-2222-222222222222','mine','mine'); perform pg_temp_assert('stranger cannot insert own project', false);
  exception when others then perform pg_temp_assert('stranger cannot insert own project', true); end;
  begin insert into public.projects (owner_id,name,slug) values ('11111111-1111-1111-1111-111111111111','forged','forged'); perform pg_temp_assert('stranger cannot insert as owner_id', false);
  exception when others then perform pg_temp_assert('stranger cannot insert as owner_id', true); end;
end $$;
with u as (update public.projects set name='pwned' returning 1) select pg_temp_assert('stranger update touches 0 rows', (select count(*) from u)=0);
with d as (delete from public.files returning 1) select pg_temp_assert('stranger delete touches 0 rows', (select count(*) from d)=0);
with s as (update public.profiles set is_owner=true where id='22222222-2222-2222-2222-222222222222' returning 1) select pg_temp_assert('stranger cannot promote self to owner', (select count(*) from s)=0);
select pg_temp_assert('stranger storage: private zip unreachable', (select count(*) from storage.objects where name='k/pub-private-zip')=0);
do $$ begin
  begin insert into storage.objects (bucket_id,name) values ('hub-files','evil'); perform pg_temp_assert('stranger cannot upload to storage', false);
  exception when others then perform pg_temp_assert('stranger cannot upload to storage', true); end;
end $$;
reset role;

-- OWNER ------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false), set_config('request.jwt.claims','{"aal":"aal1"}',false);
select pg_temp_assert('owner: is_owner() true (no MFA enrolled)', public.is_owner());
select pg_temp_assert('owner sees all 4 projects', (select count(*) from public.projects)=4);
select pg_temp_assert('owner sees all 5 files', (select count(*) from public.files)=5);
select pg_temp_assert('owner reads repository_url', (select repository_url from public.projects where slug='pub') like 'https://github.com/%');
select pg_temp_assert('owner sees all storage objects', (select count(*) from storage.objects where bucket_id='hub-files')=5);
insert into public.projects (owner_id,name,slug) values ('11111111-1111-1111-1111-111111111111','New','new-one');
select pg_temp_assert('new project defaults to PRIVATE draft', (select visibility from public.projects where slug='new-one')='draft');
update public.projects set visibility='published' where slug='new-one';
select pg_temp_assert('publish sets published_at', (select published_at is not null from public.projects where slug='new-one'));
do $$ begin
  begin insert into public.projects (owner_id,name,slug) values ('11111111-1111-1111-1111-111111111111','Dup','pub'); perform pg_temp_assert('duplicate slug rejected', false);
  exception when unique_violation then perform pg_temp_assert('duplicate slug rejected', true); end;
  begin insert into public.projects (owner_id,name,slug,live_demo_url) values ('11111111-1111-1111-1111-111111111111','J','js','javascript:alert(1)'); perform pg_temp_assert('javascript: URL rejected', false);
  exception when check_violation then perform pg_temp_assert('javascript: URL rejected', true); end;
  begin insert into public.projects (owner_id,name,slug) values ('11111111-1111-1111-1111-111111111111','B','Bad Slug!'); perform pg_temp_assert('invalid slug rejected', false);
  exception when check_violation then perform pg_temp_assert('invalid slug rejected', true); end;
  begin insert into public.files (owner_id,project_id,original_filename,storage_key,file_size,checksum) values ('11111111-1111-1111-1111-111111111111',null,'c','k/c',1,'nothex'); perform pg_temp_assert('bad checksum rejected', false);
  exception when check_violation then perform pg_temp_assert('bad checksum rejected', true); end;
  begin insert into public.files (owner_id,original_filename,storage_key,file_size) values ('11111111-1111-1111-1111-111111111111','dupkey','k/pub-shot',1); perform pg_temp_assert('duplicate storage_key rejected', false);
  exception when unique_violation then perform pg_temp_assert('duplicate storage_key rejected', true); end;
end $$;
select pg_temp_assert('audit log recorded owner actions', (select count(*) from public.activity_log where resource_type='projects' and operation in ('insert','update'))>=2);
do $$ begin
  begin insert into public.activity_log (operation,resource_type) values ('forged','x'); perform pg_temp_assert('owner cannot forge audit rows', false);
  exception when others then perform pg_temp_assert('owner cannot forge audit rows', true); end;
end $$;
reset role;

-- Unpublishing immediately removes public visibility ---------------------
update public.projects set visibility='draft' where slug='pub';
set role anon; select set_config('request.jwt.claims','',false), set_config('request.jwt.claim.sub','',false);
select pg_temp_assert('after unpublish: project gone for anon', (select count(*) from public.projects where slug='pub')=0);
select pg_temp_assert('after unpublish: its public files gone for anon', (select count(*) from public.files where project_id='aaaaaaaa-0000-0000-0000-000000000001')=0);
select pg_temp_assert('after unpublish: storage objects gone for anon', (select count(*) from storage.objects where name in ('k/pub-shot','k/pub-public-apk'))=0);
reset role;

-- Owner with MFA enrolled but only aal1 session is locked out --------------
insert into auth.mfa_factors (user_id,status) values ('11111111-1111-1111-1111-111111111111','verified');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false), set_config('request.jwt.claims','{"aal":"aal1"}',false);
select pg_temp_assert('MFA enrolled + aal1 session: owner locked out', public.is_owner() = false);
select pg_temp_assert('MFA enrolled + aal1: cannot read drafts', (select count(*) from public.projects where visibility='draft')=0);
select set_config('request.jwt.claims','{"aal":"aal2"}',false);
select pg_temp_assert('MFA enrolled + aal2 session: owner allowed', public.is_owner());
select pg_temp_assert('MFA enrolled + aal2: can read drafts', (select count(*) from public.projects where visibility='draft')>=1);
reset role;

-- Cross-owner file/project swap is blocked by trigger ----------------------
insert into public.projects (id, owner_id, name, slug) values ('cccccccc-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','StrangerProj','sp');
do $$ begin
  begin insert into public.files (owner_id,project_id,original_filename,storage_key,file_size) values ('11111111-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-000000000001','x','k/x',1); perform pg_temp_assert('file cannot attach to another owner''s project', false);
  exception when others then perform pg_temp_assert('file cannot attach to another owner''s project', true); end;
end $$;

-- Report -----------------------------------------------------------------
\echo
select case when ok then 'PASS' else 'FAIL' end as result, name from _results order by ok, name;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from _results;
