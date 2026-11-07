/* Shared by Control Room publication checks and offline delivery QA. No writes. */
function workoutDeliveryIssues(blocks, library) {
  const issues = [];
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const exercises = Array.isArray(library) ? library : [];
  const byCode = new Map(exercises.map(exercise => [exercise.code, exercise]));
  const hasDemo = exercise => exercise && exercise.active !== false &&
    (/^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(exercise.video_url || exercise.videoUrl || '')
      || /^[A-Za-z0-9_-]{6,100}$/.test(exercise.video_id || exercise.videoId || ''));
  const watchVideoId = path => {
    if (!path.startsWith('watch?')) return null;
    // Match URLSearchParams first-value semantics without requiring browser globals
    // in the offline VM runner. Decode both keys and values before comparison.
    for (const part of path.slice(6).split('#')[0].split('&')) {
      const separator = part.indexOf('=');
      const key = separator < 0 ? part : part.slice(0, separator);
      const value = separator < 0 ? '' : part.slice(separator + 1);
      try {
        if (decodeURIComponent(key.replace(/\+/g, ' ')) === 'v')
          return decodeURIComponent(value.replace(/\+/g, ' '));
      } catch { return null; }
    }
    return null;
  };
  const videoIdentity = value => {
    const raw=String(value||'').trim();
    const host=raw.match(/^https:\/\/(?:www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\/(.*)$/i);
    if(!host)return null;
    const id=host[1].toLowerCase()==='youtu.be'?host[2].match(/^([A-Za-z0-9_-]+)(?:[?&#/]|$)/)?.[1]
      :host[2].match(/^(?:shorts|embed|v)\/([A-Za-z0-9_-]+)(?:[?&#/]|$)/)?.[1]||watchVideoId(host[2]);
    return id&&/^[A-Za-z0-9_-]{6,100}$/.test(id)?id:null;
  };
  for (const block of blocks) {
    const content = block?.content || {}, label = block.title || 'Workout';
    const prescriptions = Array.isArray(content.prescriptions) ? content.prescriptions : [];
    const items = Array.isArray(content.items) ? content.items : [];
    const links = Array.isArray(content.video_links) ? content.video_links : [];
    for (const [index, prescription] of prescriptions.entries()) {
      if (!prescription?.exerciseCode && typeof prescription?.instruction === 'string' && prescription.instruction.trim()) continue;
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
      if (Object.prototype.hasOwnProperty.call(link,'reviewed_item') && link.reviewed_item !== items[link.item_index])
        issues.push(label + ': reviewed demo is bound to a different instruction row');
      if (link.no_demo === true) {
        const expected = content.videoLinksAlignWithPrescriptions === true ? prescriptions[link.item_index]?.exerciseCode : null;
        if (link.reviewed_item !== items[link.item_index] || link.exerciseCode || expected
          || links.some(other=>other!==link && other.item_index===link.item_index && other.no_demo!==true))
          issues.push(label + ': reviewed demo exclusion conflicts with its instruction or selection');
        continue;
      }
      const matches = exercises.filter(exercise => exercise.active !== false && (link.exerciseCode ? exercise.code === link.exerciseCode : (exercise.name || exercise.title) === link.exercise));
      if (matches.length !== 1) issues.push(label + ': ambiguous or unknown demo identity for ' + link.exercise);
      else {
        const selected = matches[0];
        if (!hasDemo(selected)) issues.push(label + ': approved active demo missing for ' + link.exercise);
        const storedUrl = String(link.video_url || '').trim();
        const canonicalUrl = String(selected.video_url || selected.videoUrl || '').trim();
        const storedId=videoIdentity(storedUrl),canonicalId=videoIdentity(canonicalUrl)||(selected.video_id||selected.videoId||'');
        if (storedUrl && (canonicalId ? storedId !== canonicalId : (canonicalUrl && storedUrl !== canonicalUrl)))
          issues.push(label + ': stale or incorrect demo URL for ' + link.exercise);
        // Text rows and structured prescriptions can have different ordering.
        // Compare by index only when the block explicitly declares aligned rows.
        const aligned = content.videoLinksAlignWithPrescriptions === true && items.length === prescriptions.length;
        const expected = aligned ? prescriptions[link.item_index]?.exerciseCode : null;
        if (expected && selected.code !== expected)
          issues.push(label + ': demo does not match prescribed exercise code at row ' + (link.item_index + 1));
      }
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
      if (movement && !prescriptions.length && !links.some(link => link.item_index === index && (link.exerciseCode ? exercises.some(exercise => exercise.active !== false && exercise.code === link.exerciseCode && normalize(exercise.name || exercise.title) === normalize(movement.name || movement.title)) : link.exercise === (movement.name || movement.title)))) issues.push(label + ': reviewed demo selection missing at row ' + (index + 1));
      if (content.requiresDemo === true && !links.some(link => link.item_index === index && link.no_demo !== true)) issues.push(label + ': required demo missing at row ' + (index + 1));
    }
  }
  return [...new Set(issues)];
}
