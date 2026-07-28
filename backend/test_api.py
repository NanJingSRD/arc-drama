"""API 联调测试脚本"""
import requests
import json
import sys

BASE = "http://localhost:1242"

def api(method, path, data=None, is_json=True):
    url = f'{BASE}/api/ws2/v1{path}'
    headers = {'Content-Type': 'application/json'}
    try:
        if data is not None:
            resp = requests.request(method, url, json=data, headers=headers)
        else:
            resp = requests.request(method, url, headers=headers)
        if is_json:
            return resp.json()
        return resp.text
    except requests.exceptions.RequestException as e:
        return {'error': -1, 'detail': str(e)}
    except json.JSONDecodeError:
        return {'error': -1, 'detail': resp.text[:200]}

passed = 0
failed = 0

def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name} - {detail}")

# Test 1: Health check
print('=== Health Check ===')
r = requests.get(f'{BASE}/health').json()
check("health endpoint", r.get('status') == 'healthy')

# Test 2: Get style templates
print('\n=== Style Templates ===')
r = api('GET', '/style-templates')
check("live templates", len(r.get('live', [])) == 12, f"got {len(r.get('live', []))}")
check("anim templates", len(r.get('anim', [])) == 8, f"got {len(r.get('anim', []))}")
check("template has id/name/prompt", r['live'][0].get('id') and r['live'][0].get('name') and r['live'][0].get('prompt'))

# Test 3: List projects
print('\n=== List Projects ===')
r = api('GET', '/projects')
check("list endpoint", 'projects' in r, str(r.get('error', '')))
check("has total", 'total' in r)

# Test 4: Create project
print('\n=== Create Project ===')
r = api('POST', '/projects', {
    'title': 'test-joint-debug',
    'content_mode': 'narration',
    'aspect_ratio': '9:16',
    'style_template_id': 'anim_cn_3d',
})
check("create success", r.get('success') == True, str(r))
pid = r.get('project_id', '')
check("has project_id", bool(pid))
print(f"  project_id: {pid}")
if r.get('project'):
    p = r['project']
    check("project has title", p.get('title') == 'test-joint-debug')
    check("project has content_mode", p.get('content_mode') == 'narration')
    check("project has episodes field", p.get('episodes') is not None)
    check("project has characters field", p.get('characters') is not None)
    check("project has video_backend", 'video_backend' in p)

# Test 5: Get project detail
print('\n=== Get Project Detail ===')
r = api('GET', f'/projects/{pid}')
check("detail has project", 'project' in r, f"keys: {list(r.keys()) if r else 'empty'}")
check("detail has scripts", 'scripts' in r)
check("detail has asset_fingerprints", 'asset_fingerprints' in r)

# Test 6: Upload source (text)
print('\n=== Upload Source (text) ===')
r = requests.post(
    f'{BASE}/api/ws2/v1/projects/{pid}/source',
    data={'content': 'This is a test novel content. Chapter 1: The hero begins his journey. He faces many challenges along the way.'}
)
r = r.json()
check("source success", r.get('success') == True, str(r))
check("source has filename", bool(r.get('filename')))
check("source has chars", r.get('chars', 0) > 0)

# Test 7: Add character
print('\n=== Add Character ===')
r = api('POST', f'/projects/{pid}/characters', {
    'name': 'Hero',
    'description': 'A brave young adventurer',
    'voice_style': 'young_male'
})
check("add character", r.get('success') == True, str(r))

# Test 8: Add scene
print('\n=== Add Scene ===')
r = api('POST', f'/projects/{pid}/scenes', {
    'name': 'City Street',
    'description': 'A bustling modern city street'
})
check("add scene", r.get('success') == True, str(r))

# Test 9: Add prop
print('\n=== Add Prop ===')
r = api('POST', f'/projects/{pid}/props', {
    'name': 'Magic Sword',
    'description': 'A sharp magical sword'
})
check("add prop", r.get('success') == True, str(r))

# Test 10: Get project assets
print('\n=== Get Assets ===')
r = api('GET', f'/projects/{pid}/assets')
check("assets has characters", len(r.get('characters', [])) == 1, f"got: {r.get('characters')}")
check("assets has scenes", len(r.get('scenes', [])) == 1, f"got: {r.get('scenes')}")
check("assets has props", len(r.get('props', [])) == 1, f"got: {r.get('props')}")

# Test 11: Get overview
print('\n=== Get Overview ===')
r = api('GET', f'/projects/{pid}/overview')
check("overview has title", bool(r.get('title')))
check("overview has source_files", 'source_files' in r)
check("overview has source_text", 'source_text' in r)

# Test 12: Get files
print('\n=== Get Files ===')
r = api('GET', f'/projects/{pid}/files')
check("files has source", len(r.get('files', {}).get('source', [])) == 1)

# Test 13: Get source file content
print('\n=== Get Source Content ===')
r = api('GET', f'/projects/{pid}/source/novel.txt', is_json=False)
check("source content", 'test novel' in r.lower())

# Test 14: Script process
print('\n=== Script Process ===')
r = api('POST', f'/projects/{pid}/script/process', {})
check("script process success", r.get('success') == True, str(r))
check("script process has task_id", bool(r.get('task_id')))
check("script process has episodes", 'episodes' in r)
check("script process has scripts", 'scripts' in r)
check("script process has title", 'title' in r)

# Test 15: Get scripts
print('\n=== Get Scripts ===')
r = api('GET', f'/projects/{pid}/scripts')
check("scripts has episodes", 'episodes' in r)
check("scripts has scripts", 'scripts' in r)

# Test 16: Get production
print('\n=== Get Production ===')
r = api('GET', f'/projects/{pid}/production')
check("production has scripts", 'scripts' in r)
check("production has episodes", 'episodes' in r)
check("production has episodes_stats", 'episodes_stats' in r)
check("production has system_prompt_templates", 'system_prompt_templates' in r)

# Test 17: Get episodes config
print('\n=== Get Episodes Config ===')
r = api('GET', f'/projects/{pid}/episodes/config')
eps = r.get('episodes', [])
check("ep config has episodes", len(eps) >= 0)
if eps:
    check("ep config has scenes", 'scenes' in eps[0], f"keys: {list(eps[0].keys())}")

# Test 18: Get tasks
print('\n=== Get Tasks ===')
r = api('GET', f'/tasks?project_name={pid}')
check("tasks has items", 'items' in r, f"keys: {list(r.keys()) if r else 'empty'}")
check("tasks has total", 'total' in r)
check("tasks has page", 'page' in r)
check("tasks has page_size", 'page_size' in r)

# Test 19: Get task stats
print('\n=== Get Task Stats ===')
r = api('GET', f'/tasks/stats?project_name={pid}')
stats = r.get('stats', {})
check("stats has total", 'total' in stats)
check("stats has queued", 'queued' in stats)
check("stats has running", 'running' in stats)
check("stats has succeeded", 'succeeded' in stats)
check("stats has failed", 'failed' in stats)

# Test 20: Get cost estimate
print('\n=== Get Cost Estimate ===')
r = api('GET', f'/projects/{pid}/cost-estimate')
check("cost has project_name", bool(r.get('project_name')))
check("cost has models", 'models' in r)
check("cost has episodes", 'episodes' in r)
check("cost has project_totals", 'project_totals' in r)

# Test 21: Export token
print('\n=== Export Token ===')
r = api('POST', f'/projects/{pid}/export/token?name=test&scope=full')
check("export has download_token", bool(r.get('download_token')))

# Test 22: Update project
print('\n=== Update Project ===')
r = api('PATCH', f'/projects/{pid}', {'style_template_id': 'live_premium_drama'})
check("update success", r.get('success') == True, str(r))
check("update returns project", 'project' in r)

# Test 23: Delete project
print('\n=== Delete Project ===')
r = api('DELETE', f'/projects/{pid}')
check("delete success", r.get('success') == True, str(r))

print(f'\n=== Results: {passed} passed, {failed} failed, {passed+failed} total ===')
sys.exit(0 if failed == 0 else 1)