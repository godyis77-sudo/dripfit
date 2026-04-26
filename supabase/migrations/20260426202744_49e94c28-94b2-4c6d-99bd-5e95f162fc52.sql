CREATE OR REPLACE FUNCTION public.get_tryon_funnel_metrics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_since timestamptz := now() - make_interval(days => p_days);
  v_guest_sessions int;
  v_signups int;
  v_attempts int;
  v_succeeded int;
  v_failed int;
  v_rejected int;
  v_started_only int;
  v_saved_posts int;
  v_unique_attempters int;
  v_avg_latency_ms numeric;
  v_p95_latency_ms numeric;
  v_by_tier jsonb;
  v_by_day jsonb;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT count(*) INTO v_guest_sessions
  FROM public.guest_sessions
  WHERE created_at >= v_since;

  SELECT count(*) INTO v_signups
  FROM auth.users
  WHERE created_at >= v_since;

  SELECT
    count(*) FILTER (WHERE status IN ('started','succeeded','failed')),
    count(*) FILTER (WHERE status = 'succeeded'),
    count(*) FILTER (WHERE status = 'failed'),
    count(*) FILTER (WHERE status = 'rejected'),
    count(*) FILTER (WHERE status = 'started'),
    count(DISTINCT COALESCE(user_id::text, guest_uuid)),
    avg(latency_ms) FILTER (WHERE status = 'succeeded'),
    percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE status = 'succeeded')
  INTO v_attempts, v_succeeded, v_failed, v_rejected, v_started_only,
       v_unique_attempters, v_avg_latency_ms, v_p95_latency_ms
  FROM public.tryon_attempts
  WHERE created_at >= v_since;

  SELECT count(*) INTO v_saved_posts
  FROM public.tryon_posts
  WHERE created_at >= v_since;

  SELECT jsonb_agg(jsonb_build_object(
    'tier', tier,
    'attempts', attempts,
    'succeeded', succeeded,
    'failed', failed,
    'success_rate', CASE WHEN attempts > 0 THEN round(succeeded::numeric / attempts * 100, 1) ELSE 0 END
  ) ORDER BY tier)
  INTO v_by_tier
  FROM (
    SELECT
      user_tier AS tier,
      count(*) FILTER (WHERE status IN ('started','succeeded','failed')) AS attempts,
      count(*) FILTER (WHERE status = 'succeeded') AS succeeded,
      count(*) FILTER (WHERE status = 'failed') AS failed
    FROM public.tryon_attempts
    WHERE created_at >= v_since
    GROUP BY user_tier
  ) t;

  SELECT jsonb_agg(jsonb_build_object(
    'date', d,
    'attempts', attempts,
    'succeeded', succeeded,
    'failed', failed
  ) ORDER BY d)
  INTO v_by_day
  FROM (
    SELECT
      to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d,
      count(*) FILTER (WHERE status IN ('started','succeeded','failed')) AS attempts,
      count(*) FILTER (WHERE status = 'succeeded') AS succeeded,
      count(*) FILTER (WHERE status = 'failed') AS failed
    FROM public.tryon_attempts
    WHERE created_at >= v_since
    GROUP BY 1
  ) d;

  RETURN jsonb_build_object(
    'window_days', p_days,
    'guest_sessions', v_guest_sessions,
    'signups', v_signups,
    'attempts', COALESCE(v_attempts, 0),
    'succeeded', COALESCE(v_succeeded, 0),
    'failed', COALESCE(v_failed, 0),
    'rejected', COALESCE(v_rejected, 0),
    'started_only', COALESCE(v_started_only, 0),
    'saved_posts', COALESCE(v_saved_posts, 0),
    'unique_attempters', COALESCE(v_unique_attempters, 0),
    'avg_latency_ms', COALESCE(round(v_avg_latency_ms)::int, 0),
    'p95_latency_ms', COALESCE(round(v_p95_latency_ms)::int, 0),
    'by_tier', COALESCE(v_by_tier, '[]'::jsonb),
    'by_day', COALESCE(v_by_day, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_tryon_funnel_metrics(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_tryon_funnel_metrics(integer) TO authenticated;