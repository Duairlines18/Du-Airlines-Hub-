-- Safe, admin-only cross-programme training-week draft copying.
-- Prepared for review. Apply only after signed-off security and regression checks.
-- No existing athlete, programme, week, day, or session content is deleted.
CREATE OR REPLACE FUNCTION public.admin_copy_training_week_to_target(
  p_source_week_id uuid,
  p_target_kind text,
  p_target_id uuid,
  p_target_week_number integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_source public.programme_weeks%ROWTYPE;
  v_target_programme uuid;
  v_target_duration integer;
  v_target_week uuid;
  v_target_status text;
  v_target_published timestamptz;
  v_target_verification text;
  v_target_existing integer := 0;
  v_source_days integer;
  v_source_blocks integer;
  v_day public.training_days%ROWTYPE;
  v_new_day uuid;
  v_written_days integer := 0;
  v_written_blocks integer := 0;
  v_count integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.admin_profiles ad WHERE ad.user_id=(SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_target_kind NOT IN ('athlete','school') OR p_target_week_number IS NULL OR p_target_week_number<1 THEN
    RAISE EXCEPTION 'Select a valid athlete or school and target week';
  END IF;

  SELECT * INTO v_source
  FROM public.programme_weeks
  WHERE id=p_source_week_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source week not found'; END IF;

  IF p_target_kind='athlete' THEN
    SELECT programme_id INTO v_target_programme
    FROM public.athletes WHERE id=p_target_id AND access_status='active' AND programme_id IS NOT NULL;
    IF v_target_programme IS NULL THEN RAISE EXCEPTION 'Destination athlete must have an individual active programme'; END IF;
  ELSE
    SELECT programme_id INTO v_target_programme
    FROM public.cohorts WHERE id=p_target_id AND status='live' AND organization_id IS NOT NULL AND programme_id IS NOT NULL;
    IF v_target_programme IS NULL THEN RAISE EXCEPTION 'Destination school must have an active programme'; END IF;
  END IF;

  IF v_target_programme=v_source.programme_id THEN
    RAISE EXCEPTION 'Use Duplicate to another week for the same programme';
  END IF;

  -- Serializes copies into the same destination programme, including an empty draft week.
  SELECT duration_weeks INTO v_target_duration FROM public.programmes WHERE id=v_target_programme FOR UPDATE;
  IF v_target_duration IS NULL OR p_target_week_number>v_target_duration THEN
    RAISE EXCEPTION 'Target week is outside the destination programme duration';
  END IF;

  -- A source athlete's programme can be shared, but a destination must be unambiguous.
  -- For schools, the cohort-wide programme is the explicit destination.
  IF p_target_kind='athlete' THEN
    IF (SELECT count(*) FROM public.athletes a
        WHERE a.programme_id=v_target_programme AND a.access_status='active')<>1 OR
       EXISTS(SELECT 1 FROM public.cohorts c WHERE c.programme_id=v_target_programme AND c.status='live')
    THEN RAISE EXCEPTION 'Destination programme is shared; choose a unique individual programme'; END IF;
  ELSE
    IF (SELECT count(*) FROM public.cohorts c
        WHERE c.programme_id=v_target_programme AND c.status='live')<>1 OR
       EXISTS(SELECT 1 FROM public.athletes a WHERE a.programme_id=v_target_programme AND a.access_status='active')
    THEN RAISE EXCEPTION 'Destination school programme is shared with other recipients'; END IF;
  END IF;

  SELECT count(*) INTO v_source_days
  FROM public.training_days WHERE programme_week_id=v_source.id;
  SELECT count(*) INTO v_source_blocks
  FROM public.session_blocks b JOIN public.training_days d ON d.id=b.training_day_id
  WHERE d.programme_week_id=v_source.id;
  IF v_source_days=0 OR v_source_blocks=0 OR EXISTS(
    SELECT 1 FROM public.session_blocks b
    JOIN public.training_days d ON d.id=b.training_day_id
    WHERE d.programme_week_id=v_source.id AND
      (jsonb_typeof(b.content)<>'object' OR (
        COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(b.content->'prescriptions')='array' THEN b.content->'prescriptions' ELSE '[]'::jsonb END),0)=0
        AND COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(b.content->'items')='array' THEN b.content->'items' ELSE '[]'::jsonb END),0)=0
      ))
  ) THEN RAISE EXCEPTION 'Source week must have completed training days and populated blocks'; END IF;

  -- Explicitly reject unresolved exercise codes. Preserve exactly the existing content JSON and video links.
  IF EXISTS(
    SELECT 1 FROM public.session_blocks b
    JOIN public.training_days d ON d.id=b.training_day_id
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(b.content->'prescriptions')='array' THEN b.content->'prescriptions' ELSE '[]'::jsonb END
    ) ex
    WHERE d.programme_week_id=v_source.id AND
      (NULLIF(ex->>'exerciseCode','') IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM public.exercises e
        WHERE e.code=ex->>'exerciseCode' AND e.active=true
      ))
  ) THEN RAISE EXCEPTION 'Source contains an unmatched exercise code; resolve it before copying'; END IF;

  SELECT pw.id,pw.status,pw.published_at,pw.verification_status
    INTO v_target_week,v_target_status,v_target_published,v_target_verification
  FROM public.programme_weeks pw
  WHERE pw.programme_id=v_target_programme AND pw.week_number=p_target_week_number
    AND pw.tier_id IS NOT DISTINCT FROM v_source.tier_id
  ORDER BY pw.created_at
  LIMIT 1 FOR UPDATE;

  IF v_target_week IS NOT NULL THEN
    SELECT count(*) INTO v_target_existing
    FROM public.training_days WHERE programme_week_id=v_target_week;
    IF v_target_existing>0 OR v_target_status<>'draft'
        OR v_target_published IS NOT NULL OR v_target_verification='verified' THEN
      RAISE EXCEPTION 'Destination week is not an empty unpublished draft. Existing work is protected';
    END IF;
    UPDATE public.programme_weeks SET
      phase=v_source.phase,weekly_objective=v_source.weekly_objective,
      running_focus=v_source.running_focus,strength_focus=v_source.strength_focus,
      event_focus=v_source.event_focus,
      athlete_education=NULL,
      status='draft',verification_status='needs_verification',
      scheduled_for=NULL,published_at=NULL,updated_at=now()
    WHERE id=v_target_week;
  ELSE
    INSERT INTO public.programme_weeks(
      programme_id,tier_id,week_number,phase,weekly_objective,
      running_focus,strength_focus,event_focus,athlete_education,
      status,verification_status,scheduled_for,published_at
    ) VALUES (
      v_target_programme,v_source.tier_id,p_target_week_number,
      v_source.phase,v_source.weekly_objective,
      v_source.running_focus,v_source.strength_focus,v_source.event_focus,
      NULL,'draft','needs_verification',NULL,NULL
    ) RETURNING id INTO v_target_week;
  END IF;

  FOR v_day IN SELECT * FROM public.training_days
    WHERE programme_week_id=v_source.id ORDER BY sort_order,id LOOP
    INSERT INTO public.training_days(
      programme_week_id,day_key,title,intensity,objective,duration,sort_order,playlist_id,playlist_url
    ) VALUES (
      v_target_week,v_day.day_key,v_day.title,v_day.intensity,
      v_day.objective,v_day.duration,v_day.sort_order,NULL,NULL
    ) RETURNING id INTO v_new_day;
    v_written_days:=v_written_days+1;

    INSERT INTO public.session_blocks(
      training_day_id,block_type,title,sort_order,saved_block_id,content,athlete_note,staff_note,admin_note
    )
    SELECT v_new_day,block_type,title,sort_order,NULL,content,NULL,NULL,NULL
    FROM public.session_blocks
    WHERE training_day_id=v_day.id ORDER BY sort_order,id;
    GET DIAGNOSTICS v_count=ROW_COUNT;
    v_written_blocks:=v_written_blocks+v_count;
  END LOOP;

  IF v_written_days<>v_source_days OR v_written_blocks<>v_source_blocks THEN
    RAISE EXCEPTION 'Copy counts did not match source. All changes rolled back';
  END IF;
  RETURN jsonb_build_object(
    'ok',true,'target_week_id',v_target_week,'target_week_number',p_target_week_number,
    'status','draft','published',false,
    'days_written',v_written_days,'blocks_written',v_written_blocks
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_copy_training_week_to_target(uuid,text,uuid,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_copy_training_week_to_target(uuid,text,uuid,integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_copy_training_week_to_target(uuid,text,uuid,integer) TO authenticated;
