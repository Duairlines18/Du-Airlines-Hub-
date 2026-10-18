/* Shared by Control Room publication checks and offline delivery QA. No writes. */
function workoutDeliveryIssues(blocks, library) {
  const issues = [];
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const exercises = Array.isArray(library) ? library : [];
  const byCode = new Map(exercises.map(exercise => [exercise.code, exercise]));
  const hasDemo = exercise => exercise && exercise.active !== false &&
    (/^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(exercise.video_url || exercise.videoUrl || '')
      || /^[A-Za-z0-9_-]{6,100}$/.test(exercise.video_id || exercise.videoId || ''));
  for (const block of blocks) {
    const content = block?.content || {}, label = block.title || 'Workout';
    const prescriptions = Array.isArray(content.prescriptions) ? content.prescriptions : [];
    const items = Array.isArray(content.items) ? content.items : [];
    const links = Array.isArray(content.video_links) ? content.video_links : [];
    for (const [index, prescription] of prescriptions.entries()) {
      if (!prescription?.exerciseCode || !String(prescription.dosage || '').trim()) issues.push(label + ': dosage/exercise missing at row ' + (index + 1));
      for (const code of [prescription?.exerciseCode, prescription?.alternativeExerciseCode].filter(Boolean)) {
        if (!hasDemo(byCode.get(code))) issues.push(label + ': approved active demo missing for ' + code);
      }
    }
    for (const code of (Array.isArray(content.exerciseCodes) ? content.exerciseCodes : [])) {
      if (!hasDemo(byCode.get(code))) issues.push(label + ': approved active demo missing for ' + code);
    }
    for (const link of links) {
      if (!Number.isInteger(link?.item_index) || link.item_index < 0 || typeof items[link.item_index] !== 'string') {
        issues.push(label + ': demo points to a missing instruction row'); continue;
      }
      if (!hasDemo(exercises.find(exercise => (exercise.name || exercise.title) === link.exercise))) issues.push(label + ': approved active demo missing for ' + link.exercise);
    }
    for (const [index, item] of items.entries()) {
      if (typeof item !== 'string' || !item.trim()) {issues.push(label + ': empty instruction row ' + (index + 1)); continue;}
      // Only require mappings for recognized prescribed movements. Runs/rest/notes
      // do not acquire unrelated demos through substring matching.
      const text = ' ' + normalize(item) + ' ';
      const movement = [...exercises].sort((a,b) => normalize(b.name || b.title).length - normalize(a.name || a.title).length).find(exercise => {
        const name = normalize(exercise.name || exercise.title);
        return name && (text.startsWith(' ' + name + ' ') || new RegExp('^\\s*\\d+(?:\\s+[x×]\\s*\\d+)?\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(item));
      });
      if (movement && !prescriptions.length && !links.some(link => link.item_index === index && link.exercise === (movement.name || movement.title))) issues.push(label + ': reviewed demo selection missing at row ' + (index + 1));
      if (content.requiresDemo === true && !links.some(link => link.item_index === index)) issues.push(label + ': required demo missing at row ' + (index + 1));
    }
  }
  return [...new Set(issues)];
}
