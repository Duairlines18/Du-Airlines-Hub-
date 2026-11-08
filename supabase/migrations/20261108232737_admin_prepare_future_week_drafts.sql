-- Guarded, non-destructive admin preparation of the next 1, 2 or 4 programme weeks.
-- No programme publishing, status changes to existing weeks, or athlete advancement.
CREATE OR REPLACE FUNCTION public.admin_prepare_future_week_drafts(
  p_programme_id uuid,p_after_week integer,p_count integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path=public,pg_temp
AS $f$
DECLARE
  v_num integer;
  v_exists integer;
  v_new integer[]:='{}';
  v_existing integer[]:='{}';
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.admin_profiles WHERE user_id=(SELECT auth.uid())
  ) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_count NOT IN (1,2,4) OR p_after_week IS NULL OR p_after_week<1
    OR p_after_week+p_count>52 THEN
    RAISE EXCEPTION 'Choose 1, 2 or 4 future weeks within the 52-week planning limit';
  END IF;
  PERFORM 1 FROM public.programmes WHERE id=p_programme_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Programme not found';END IF;
  IF EXISTS(SELECT 1 FROM public.programme_tiers WHERE programme_id=p_programme_id)
    OR EXISTS(SELECT 1 FROM public.programme_weeks WHERE programme_id=p_programme_id AND tier_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Tiered programmes require separate tier-aware planning';
  END IF;
  FOR v_num IN (p_after_week+1)..(p_after_week+p_count) LOOP
    SELECT count(*) INTO v_exists FROM public.programme_weeks
      WHERE programme_id=p_programme_id AND week_number=v_num;
    IF v_exists>1 THEN RAISE EXCEPTION 'Ambiguous duplicate week %, reconcile before planning',v_num;END IF;
    IF v_exists=1 THEN
      v_existing:=array_append(v_existing,v_num);
    ELSE
      INSERT INTO public.programme_weeks(programme_id,week_number,phase,weekly_objective,
        status,verification_status,published_at,scheduled_for)
      VALUES(p_programme_id,v_num,'Future training week','',
        'draft','needs_verification',NULL,NULL);
      v_new:=array_append(v_new,v_num);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'created',v_new,'existing',v_existing,
    'status','draft','published',false);
END;$f$;
REVOKE ALL ON FUNCTION public.admin_prepare_future_week_drafts(uuid,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_prepare_future_week_drafts(uuid,integer,integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_prepare_future_week_drafts(uuid,integer,integer) TO authenticated;