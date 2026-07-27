param(
  [string]$PostgresBin = $env:POSEIDON_POSTGRES_BIN
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($PostgresBin)) {
  $PostgresBin = "C:\Program Files\PostgreSQL\18\bin"
}

$required = @("initdb.exe", "pg_ctl.exe", "psql.exe")
foreach ($binary in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $PostgresBin $binary))) {
    throw "PostgreSQL no esta disponible en $PostgresBin."
  }
}

$listener = [System.Net.Sockets.TcpListener]::new(
  [System.Net.IPAddress]::Loopback,
  0
)
$listener.Start()
$port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$listener.Stop()

$cluster = Join-Path $env:TEMP (
  "poseidon-postgres-check-" + [guid]::NewGuid().ToString("N")
)
$database = "poseidon_check"
$log = Join-Path $cluster "postgresql.log"
$testOutput = Join-Path $cluster "tests.log"
$started = $false
$assertionCount = 0

function Invoke-Native {
  param(
    [scriptblock]$Command,
    [string]$Failure
  )

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Failure (codigo $LASTEXITCODE)."
  }
}

try {
  New-Item -ItemType Directory -Path $cluster | Out-Null

  Invoke-Native {
    & (Join-Path $PostgresBin "initdb.exe") `
      -D $cluster `
      -U postgres `
      --auth=trust `
      --encoding=UTF8 `
      --no-locale | Out-Null
  } "No se pudo inicializar PostgreSQL"

  Invoke-Native {
    & (Join-Path $PostgresBin "pg_ctl.exe") `
      -D $cluster `
      -l $log `
      -o "-p $port -h 127.0.0.1" `
      -w start
  } "No se pudo iniciar PostgreSQL"
  $started = $true

  Invoke-Native {
    & (Join-Path $PostgresBin "createdb.exe") `
      -h 127.0.0.1 `
      -p $port `
      -U postgres `
      $database
  } "No se pudo crear la base descartable"

  $bootstrap = @'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create table auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
'@

  Invoke-Native {
    & (Join-Path $PostgresBin "psql.exe") `
      -X -q -v ON_ERROR_STOP=1 `
      -h 127.0.0.1 -p $port -U postgres -d $database `
      -c $bootstrap
  } "No se pudo preparar el entorno compatible"

  Get-ChildItem -LiteralPath "supabase\migrations" -Filter "*.sql" |
    Sort-Object Name |
    ForEach-Object {
      Invoke-Native {
        & (Join-Path $PostgresBin "psql.exe") `
          -X -q -v ON_ERROR_STOP=1 `
          -h 127.0.0.1 -p $port -U postgres -d $database `
          -f $_.FullName
      } "Fallo la migracion $($_.Name)"
    }

  $compatibility = @'
create or replace function extensions.plan(expected integer) returns text
language plpgsql as $$
begin
  return '1..' || expected::text;
end
$$;

create or replace function extensions.ok(actual boolean, description text)
returns text language plpgsql as $$
begin
  if actual is distinct from true then
    raise exception 'ASSERTION FAILED: %', description;
  end if;
  return 'ok - ' || description;
end
$$;

create or replace function extensions.is(
  actual anyelement,
  expected anyelement,
  description text
) returns text language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception
      'ASSERTION FAILED: % (actual=%, expected=%)',
      description,
      actual,
      expected;
  end if;
  return 'ok - ' || description;
end
$$;

create or replace function extensions.pass(description text)
returns text language plpgsql as $$
begin
  return 'ok - ' || description;
end
$$;

create or replace function extensions.throws_ok(
  statement text,
  description text
) returns text language plpgsql as $$
declare
  caught_message text;
begin
  begin
    execute statement;
  exception when others then
    caught_message := sqlerrm;
  end;
  if caught_message is null then
    raise exception
      'ASSERTION FAILED: expected error but statement succeeded: %',
      description;
  end if;
  return 'ok - ' || description;
end
$$;

create or replace function extensions.has_trigger(
  schema_name text,
  table_name text,
  trigger_name text,
  description text
) returns text language plpgsql as $$
declare
  trigger_exists boolean;
begin
  select exists (
    select 1
    from pg_catalog.pg_trigger trigger_row
    join pg_catalog.pg_class table_row
      on table_row.oid = trigger_row.tgrelid
    join pg_catalog.pg_namespace schema_row
      on schema_row.oid = table_row.relnamespace
    where schema_row.nspname = schema_name
      and table_row.relname = table_name
      and trigger_row.tgname = trigger_name
      and not trigger_row.tgisinternal
  )
  into trigger_exists;
  if not trigger_exists then
    raise exception 'ASSERTION FAILED: %', description;
  end if;
  return 'ok - ' || description;
end
$$;

create or replace function extensions.finish() returns setof text
language plpgsql as $$
begin
  return;
end
$$;

grant usage on schema extensions to public;
grant execute on all functions in schema extensions to public;
'@

  Invoke-Native {
    & (Join-Path $PostgresBin "psql.exe") `
      -X -q -v ON_ERROR_STOP=1 `
      -h 127.0.0.1 -p $port -U postgres -d $database `
      -c $compatibility
  } "No se pudo instalar el arnes compatible"

  Get-ChildItem -LiteralPath "supabase\tests\database" -Filter "*.sql" |
    Sort-Object Name |
    ForEach-Object {
      $content = Get-Content -Raw -LiteralPath $_.FullName
      $content = $content -replace (
        "(?im)^create extension if not exists pgtap with schema extensions;\r?\n",
        ""
      )
      $plan = [regex]::Match($content, "select plan\((\d+)\)")
      if (-not $plan.Success) {
        throw "La suite $($_.Name) no declara un plan."
      }
      $assertionCount += [int]$plan.Groups[1].Value
      $testPath = Join-Path $cluster $_.Name
      [System.IO.File]::WriteAllText(
        $testPath,
        $content,
        [System.Text.UTF8Encoding]::new($false)
      )
      Invoke-Native {
        & (Join-Path $PostgresBin "psql.exe") `
          -X -q -v ON_ERROR_STOP=1 `
          -h 127.0.0.1 -p $port -U postgres -d $database `
          -o $testOutput `
          -f $testPath
      } "Fallo la suite $($_.Name)"
    }

  $migrationCount = (
    Get-ChildItem -LiteralPath "supabase\migrations" -Filter "*.sql"
  ).Count
  $suiteCount = (
    Get-ChildItem -LiteralPath "supabase\tests\database" -Filter "*.sql"
  ).Count
  Write-Output (
    "PostgreSQL compatible OK: {0} migraciones, {1} suites, {2} aserciones." -f
      $migrationCount,
      $suiteCount,
      $assertionCount
  )
}
finally {
  if ($started) {
    & (Join-Path $PostgresBin "pg_ctl.exe") `
      -D $cluster `
      -m fast `
      -w stop | Out-Null
  }

  $tempRoot = [System.IO.Path]::GetFullPath($env:TEMP)
  $resolvedCluster = [System.IO.Path]::GetFullPath($cluster)
  if (
    $resolvedCluster.StartsWith(
      $tempRoot,
      [System.StringComparison]::OrdinalIgnoreCase
    ) -and
    (Split-Path -Leaf $resolvedCluster).StartsWith(
      "poseidon-postgres-check-",
      [System.StringComparison]::Ordinal
    )
  ) {
    Remove-Item -LiteralPath $resolvedCluster -Recurse -Force -ErrorAction SilentlyContinue
  }
}
