create or replace function visit_stats(days int default 30)
returns json
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select (date_trunc('day', now() at time zone 'Asia/Karachi') at time zone 'Asia/Karachi') as today_start
  ),
  win as (select today_start - make_interval(days => days - 1) as since from bounds)
  select json_build_object(
    'today', (select json_build_object('visitors', count(distinct visitor_id), 'views', count(*))
              from page_views, bounds where created_at >= bounds.today_start),
    'week',  (select json_build_object('visitors', count(distinct visitor_id), 'views', count(*))
              from page_views, bounds where created_at >= bounds.today_start - interval '6 days'),
    'month', (select json_build_object('visitors', count(distinct visitor_id), 'views', count(*))
              from page_views, win where created_at >= win.since),
    'daily', (select coalesce(json_agg(d order by d.day), '[]'::json) from (
                select to_char(g.day at time zone 'Asia/Karachi', 'YYYY-MM-DD') as day,
                       (select count(distinct visitor_id) from page_views p where p.created_at >= g.day and p.created_at < g.day + interval '1 day') as visitors,
                       (select count(*) from page_views p where p.created_at >= g.day and p.created_at < g.day + interval '1 day') as views
                from bounds, win, generate_series(win.since, bounds.today_start, interval '1 day') as g(day)
              ) d),
    'top_pages', (select coalesce(json_agg(t), '[]'::json) from (
                    select path, count(*) as views, count(distinct visitor_id) as visitors
                    from page_views, win where created_at >= win.since
                    group by path order by views desc limit 10
                  ) t),
    'devices', (select coalesce(json_agg(t), '[]'::json) from (
                  select coalesce(device, 'unknown') as device, count(distinct visitor_id) as visitors
                  from page_views, win where created_at >= win.since
                  group by 1 order by visitors desc
                ) t),
    'browsers', (select coalesce(json_agg(t), '[]'::json) from (
                  select coalesce(browser, 'Unknown') as name, count(distinct visitor_id) as visitors
                  from page_views, win where created_at >= win.since
                  group by 1 order by visitors desc limit 8
                ) t),
    'systems', (select coalesce(json_agg(t), '[]'::json) from (
                  select coalesce(os, 'Unknown') as name, count(distinct visitor_id) as visitors
                  from page_views, win where created_at >= win.since
                  group by 1 order by visitors desc limit 8
                ) t),
    'places', (select coalesce(json_agg(t), '[]'::json) from (
                  select coalesce(country, '—') as country, coalesce(city, '') as city, count(distinct visitor_id) as visitors
                  from page_views, win where created_at >= win.since
                  group by 1, 2 order by visitors desc limit 12
                ) t),
    'sources', (select coalesce(json_agg(t), '[]'::json) from (
                  select coalesce(nullif(utm_source, ''), nullif(referrer, ''), 'Direct') as source, count(distinct visitor_id) as visitors
                  from page_views, win where created_at >= win.since
                  group by 1 order by visitors desc limit 10
                ) t),
    'funnel', (select json_build_object(
                  'visitors', (select count(distinct visitor_id) from page_views, win where created_at >= win.since),
                  'viewed_item', (select count(distinct visitor_id) from visit_events, win where kind = 'view_item' and created_at >= win.since),
                  'added', (select count(distinct visitor_id) from visit_events, win where kind = 'add_to_cart' and created_at >= win.since),
                  'checkout', (select count(distinct visitor_id) from visit_events, win where kind = 'checkout_start' and created_at >= win.since),
                  'ordered', (select count(distinct visitor_id) from visit_events, win where kind = 'order_placed' and created_at >= win.since))),
    'items_viewed', (select coalesce(json_agg(t), '[]'::json) from (
                  select label as name, count(*) as times, count(distinct visitor_id) as visitors
                  from visit_events, win where kind = 'view_item' and label is not null and created_at >= win.since
                  group by label order by times desc limit 10
                ) t),
    'items_added', (select coalesce(json_agg(t), '[]'::json) from (
                  select label as name, count(*) as times, count(distinct visitor_id) as visitors
                  from visit_events, win where kind = 'add_to_cart' and label is not null and created_at >= win.since
                  group by label order by times desc limit 10
                ) t),
    'searches', (select coalesce(json_agg(t), '[]'::json) from (
                  select lower(label) as term, count(*) as times, count(distinct visitor_id) as visitors
                  from visit_events, win where kind = 'search' and label is not null and created_at >= win.since
                  group by lower(label) order by times desc, max(created_at) desc limit 15
                ) t),
    'visitors', (select coalesce(json_agg(t), '[]'::json) from (
                   select visitor_id,
                          min(created_at) as first_seen,
                          max(created_at) as last_seen,
                          count(*) as views,
                          (array_agg(device order by created_at desc))[1] as device,
                          (array_agg(user_id) filter (where user_id is not null))[1] as user_id,
                          (array_agg(path order by created_at desc))[1] as last_path,
                          (array_agg(ip order by created_at desc) filter (where ip is not null))[1] as ip,
                          (array_agg(country order by created_at desc) filter (where country is not null))[1] as country,
                          (array_agg(city order by created_at desc) filter (where city is not null))[1] as city,
                          (array_agg(browser order by created_at desc) filter (where browser is not null))[1] as browser,
                          (array_agg(os order by created_at desc) filter (where os is not null))[1] as os
                   from page_views, win
                   where created_at >= win.since
                   group by visitor_id order by last_seen desc limit 100
                 ) t)
  );
$$;

-- the browser (anon / signed-in customers) must never call this; only the server's service_role key can
revoke all on function visit_stats(int) from public, anon, authenticated;
grant execute on function visit_stats(int) to service_role;
