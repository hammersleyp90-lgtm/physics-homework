// Injected into index.html by tools/check.py for the overnight check. Uses the page's own functions
// (getHW, exportJSON, sync…) so the export is exactly what the "Copy class work for Claude" button produces.
window.hwChecker = {
  async login(key){
    const r = await rpc('hw_checker_login', { p_key: key });
    if (!r || r.error) throw new Error('checker login failed: ' + (r && r.error));
    setSession({ kind: 'staff', token: r.token });
    const d = await rpc('hw_staff_load', { p_token: r.token });
    dbFromRows(d.rows, d.staff);
    return Object.keys(DB.classes).length;
  },
  // a fingerprint of one part's answer, so a part is checked again only if the student changes it
  sig(s){
    const t = JSON.stringify([s.text || '', s.green || '', (s.strokes || []).length, (s.strokes || []).reduce((a, k) => a + (k.p ? k.p.length : 1), 0), s.mark, !!s.markLocked]);
    let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    return t.length + '.' + (h >>> 0).toString(36);
  },
  // submitted work with locked parts that have no check yet, or that changed since the overnight check last saw them
  pending(){
    const jobs = [];
    for (const cls of Object.values(DB.classes)) for (const id of Object.keys(cls.assigned)){
      const hw = getHW(id); if (!hw) continue; setHW(hw);
      const need = {};
      hwStudents(cls, id).forEach(st => {
        const w = st.work && st.work[id]; if (!w || !w.submitted) return;
        const c = (DB.checks[id] || {})[st.key] || {};
        const parts = ALL_PARTS.filter(P => { const s = w.parts[P.id]; if (!s || !s.locked || s.redo) return false;
          const k = c[P.id]; return !k || (k.sig && k.sig !== this.sig(s)) || (!k.sig && s.redone && k.at && s.redone > k.at); }).map(P => P.id);
        if (parts.length) need[st.key] = parts;
      });
      if (Object.keys(need).length) jobs.push({ cls: cls.id, className: cls.name, hw: id, title: hw.title, need });
    }
    return jobs;
  },
  exportJob(job){
    const cls = DB.classes[job.cls]; setHW(getHW(job.hw));
    const full = JSON.parse(exportJSON(cls));
    full.students = full.students.filter(s => job.need[s.login]).map(s => {
      const keep = {}; job.need[s.login].forEach(pid => { if (s.parts[pid]) keep[pid] = s.parts[pid]; });
      return Object.assign(s, { parts: keep }); });
    full.note = 'Only parts that are new or changed since the last check are included. Return exactly one entry for every part listed under each student.';
    const sigs = {};
    for (const login in job.need){ sigs[login] = {}; job.need[login].forEach(pid => { sigs[login][pid] = this.sig(DB.students[login].work[job.hw].parts[pid]); }); }
    return { data: full, sigs };
  },
  async importResults(list){
    let n = 0; const problems = [];
    for (const { job, sigs, result } of list){
      const cls = DB.classes[job.cls], hw = getHW(job.hw);
      if (!cls || !hw){ problems.push(job.hw + ': homework no longer set'); continue; }
      setHW(hw);
      if (!result || result.homework !== job.hw || !Array.isArray(result.checks)){ problems.push(job.hw + ': results missing or for another homework'); continue; }
      const store = DB.checks[job.hw] = DB.checks[job.hw] || {}; let got = 0;
      result.checks.forEach(c => {
        const k = String(c.student || '').trim().toLowerCase(), P0 = ALL_PARTS.find(P => P.id === c.part);
        if (!P0 || !job.need[k] || !job.need[k].includes(c.part)) return;
        (store[k] = store[k] || {})[c.part] = { suggested: Math.max(0, Math.min(P0.marks, Math.round(Number(c.suggested)) || 0)),
          correction: c.correction === 'weak' ? 'weak' : 'ok', note: String(c.note || '').slice(0, 300), at: new Date().toISOString(), by: 'nightly', sig: sigs[k][c.part] };
        got++; });
      const want = Object.values(job.need).reduce((a, x) => a + x.length, 0);
      if (got < want) problems.push(`${job.className} · ${job.title}: ${want - got} of ${want} parts had no result`);
      n += got;
    }
    await sync();
    if (toastEl) throw new Error('saving the results to the database failed');
    return { saved: n, problems };
  }
};
