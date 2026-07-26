create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
    'sync-fuel-prices-daily-7am',
    '0 0 * * *',
    $$
        select net.http_post(
            url := 'https://pfrlorovrlyebjkcnafp.functions.supabase.co/sync-fuel-prices',
            headers := jsonb_build_object('Content-Type', 'application/json'),
            body := '{}'::jsonb
        );
    $$
);