#!/usr/bin/env python3
"""Overnight check of students' self-marking.

    HW_CHECKER_KEY=... python3 tools/check.py export OUTDIR   # write each class/homework needing a check to OUTDIR/job-N.json
    python3 tools/check.py render OUTDIR                      # draw students' sketches to OUTDIR/img/*.png so they can be read
    HW_CHECKER_KEY=... python3 tools/check.py import OUTDIR   # load OUTDIR/job-N.result.json back into the database

Between export and import, whoever does the checking (Claude, in the scheduled task) reads each job-N.json, follows the
"instructions" inside it, and writes job-N.result.json in the JSON form those instructions give.
It runs the real site (index.html) in headless Chrome, so the export is exactly what the teacher's
"Copy class work for Claude" button produces. HW_API_URL / HW_API_KEY override the database (for testing).
"""
import functools, glob, http.server, json, os, re, shutil, sys, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def config():
    cfg = open(os.path.join(ROOT, 'config.js')).read()
    url = os.environ.get('HW_API_URL') or re.search(r"url: '(https://[^']+)'", cfg).group(1)
    key = os.environ.get('HW_API_KEY') or re.search(r"key: '(sb_publishable_[^']+)'", cfg).group(1)
    return url, key


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def page_session(fn):
    from playwright.sync_api import sync_playwright
    url, key = config()
    srv = serve()
    with sync_playwright() as p:
        chrome = next((c for c in ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'] if os.path.exists(c)), None)
        b = p.chromium.launch(executable_path=chrome, args=['--no-sandbox']) if chrome else p.chromium.launch()
        pg = b.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.add_init_script(f'window.HW_CONFIG_OVERRIDE = {json.dumps({"url": url, "key": key})};')
        pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/index.html', wait_until='domcontentloaded')
        pg.wait_for_function('typeof rpc === "function" && typeof exportJSON === "function"')
        pg.add_script_tag(path=os.path.join(ROOT, 'tools', 'checker.js'))
        key_env = os.environ.get('HW_CHECKER_KEY')
        if not key_env:
            sys.exit('Set HW_CHECKER_KEY')
        pg.evaluate('k => hwChecker.login(k)', key_env)
        try:
            return fn(pg)
        finally:
            if errors:
                print('page errors:', errors[:5], file=sys.stderr)
            b.close()
            srv.shutdown()


def export(out):
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)

    def run(pg):
        jobs = pg.evaluate('hwChecker.pending()')
        for i, job in enumerate(jobs, 1):
            x = pg.evaluate('j => hwChecker.exportJob(j)', job)
            json.dump(x['data'], open(f'{out}/job-{i}.json', 'w'), indent=1)
            json.dump({'job': job, 'sigs': x['sigs']}, open(f'{out}/job-{i}.meta.json', 'w'))
            parts = sum(len(v) for v in job['need'].values())
            print(f'job-{i}: {job["className"]} · {job["title"]} · {len(job["need"])} students, {parts} parts')
        if not jobs:
            print('Nothing new to check.')
        return jobs
    page_session(run)


def render(out):
    from PIL import Image, ImageDraw
    os.makedirs(f'{out}/img', exist_ok=True)
    n = 0
    for f in sorted(glob.glob(f'{out}/job-*.json')):
        if f.endswith('.meta.json') or f.endswith('.result.json'):
            continue
        d = json.load(open(f))
        W, H = d['homework']['drawing_space']
        job = os.path.basename(f)[:-5]
        for s in d['students']:
            for pid, part in s['parts'].items():
                strokes = part.get('strokes') or []
                if not strokes:
                    continue
                im = Image.new('RGB', (int(W), int(H)), 'white')
                dr = ImageDraw.Draw(im)
                for x in range(0, int(W), 20):
                    dr.line([(x, 0), (x, H)], fill=(225, 232, 240))
                for y in range(0, int(H), 20):
                    dr.line([(0, y), (W, y)], fill=(225, 232, 240))
                for k in strokes:
                    col = (0, 140, 60) if k.get('colour') == 'green' else (20, 20, 30)
                    if 'points' in k:
                        pts = list(zip(k['points'][0::2], k['points'][1::2]))
                        if len(pts) > 1:
                            dr.line(pts, fill=col, width=3, joint='curve')
                        elif pts:
                            dr.ellipse([pts[0][0] - 2, pts[0][1] - 2, pts[0][0] + 2, pts[0][1] + 2], fill=col)
                    else:
                        dr.text((k['x'], k['y']), str(k.get('stamp', '')), fill=col)
                path = f'{out}/img/{job}__{s["login"]}__{pid}.png'
                im.save(path)
                n += 1
    print(f'{n} drawings rendered to {out}/img')


def do_import(out):
    items = []
    for m in sorted(glob.glob(f'{out}/job-*.meta.json')):
        base = m[:-len('.meta.json')]
        meta = json.load(open(m))
        res_path = base + '.result.json'
        result = None
        if os.path.exists(res_path):
            txt = open(res_path).read().strip()
            txt = re.sub(r'^```(?:json)?|```$', '', txt).strip()
            result = json.loads(txt)
        items.append({'job': meta['job'], 'sigs': meta['sigs'], 'result': result})
    if not items:
        print('Nothing to import.')
        return
    r = page_session(lambda pg: pg.evaluate('l => hwChecker.importResults(l)', items))
    print(f'Saved {r["saved"]} checked parts.')
    for p in r['problems']:
        print('Problem:', p)


if __name__ == '__main__':
    if len(sys.argv) != 3 or sys.argv[1] not in ('export', 'render', 'import'):
        sys.exit(__doc__)
    {'export': export, 'render': render, 'import': do_import}[sys.argv[1]](sys.argv[2])
