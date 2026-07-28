"""检查更多API端点和字段兼容性"""
import requests
import json

BASE = 'http://localhost:1242/api/ws2/v1'

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

# Create project
r = requests.post(f'{BASE}/projects', json={
    'title': 'deep-check',
    'content_mode': 'narration',
    'aspect_ratio': '9:16',
    'style_template_id': 'anim_cn_3d'
}).json()
pid = r['project_id']
print(f'Project ID: {pid}\n')

# Upload source
requests.post(f'{BASE}/projects/{pid}/source', data={
    'content': 'Test novel content. Chapter 1: Hero journey.'
})

# Add character/scene/prop
requests.post(f'{BASE}/projects/{pid}/characters', json={
    'name': 'Hero', 'description': 'A brave hero', 'voice_style': 'young_male'
})
requests.post(f'{BASE}/projects/{pid}/scenes', json={
    'name': 'Castle', 'description': 'An ancient castle'
})
requests.post(f'{BASE}/projects/{pid}/props', json={
    'name': 'Sword', 'description': 'A magic sword'
})

# Test: Script process (creates a task)
print('=== Script Process ===')
r = requests.post(f'{BASE}/projects/{pid}/script/process', json={}).json()
check("script process success", r.get('success') == True, str(r))
check("has task_id", bool(r.get('task_id')))
task_id = r.get('task_id', '')
print(f'  task_id: {task_id}')

# Test: Task item response format
print('\n=== Task Item Response ===')
r = requests.get(f'{BASE}/tasks?project_name={pid}').json()
items = r.get('items', [])
if items:
    t = items[0]
    print(f'  Task keys: {json.dumps(sorted(t.keys()))}')
    check("has task_id", bool(t.get('task_id')))
    check("has project_name", bool(t.get('project_name')))
    check("has task_type", bool(t.get('task_type')))
    check("has media_type", bool(t.get('media_type')))
    check("has resource_id", bool(t.get('resource_id')))
    check("has payload", isinstance(t.get('payload'), dict))
    check("has status (frontend format)", t.get('status') in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'cancelling'))
    check("has source", t.get('source') == 'webui')
    check("has queued_at", bool(t.get('queued_at')))
    check("has updated_at", bool(t.get('updated_at')))
    check("has script_file", 'script_file' in t)
    check("has error_message", 'error_message' in t)
    check("has cancelled_by", 'cancelled_by' in t)
    check("has provider_id", 'provider_id' in t)
    check("has provider_job_id", 'provider_job_id' in t)
    check("has started_at", 'started_at' in t)
    check("has finished_at", 'finished_at' in t)
    print(f'  status: {t.get("status")}')
    print(f'  updated_at: {t.get("updated_at")}')
else:
    check("has tasks", False, "No tasks found")

# Test: Generate storyboard
print('\n=== Generate Storyboard ===')
r = requests.post(f'{BASE}/projects/{pid}/generate/storyboard/test-seg', json={
    'script_file': 'test.json',
    'scene_id': 'test-seg',
    'prompt': 'test prompt'
}).json()
check("storyboard success", r.get('success') == True, str(r))
check("storyboard has task_id", bool(r.get('task_id')))

# Test: Generate video
print('\n=== Generate Video ===')
r = requests.post(f'{BASE}/projects/{pid}/generate/video/test-seg', json={
    'script_file': 'test.json',
    'scene_id': 'test-seg',
    'prompt': 'test prompt'
}).json()
check("video success", r.get('success') == True, str(r))
check("video has task_id", bool(r.get('task_id')))

# Test: Generate single character
print('\n=== Generate Character ===')
r = requests.post(f'{BASE}/projects/{pid}/generate/character/Hero', json={
    'prompt': 'test prompt'
}).json()
check("char gen success", r.get('success') == True, str(r))
check("char gen has task_id", bool(r.get('task_id')))

# Test: Generate single scene
print('\n=== Generate Scene ===')
r = requests.post(f'{BASE}/projects/{pid}/generate/scene/Castle', json={
    'prompt': 'test prompt'
}).json()
check("scene gen success", r.get('success') == True, str(r))
check("scene gen has task_id", bool(r.get('task_id')))

# Test: Generate single prop
print('\n=== Generate Prop ===')
r = requests.post(f'{BASE}/projects/{pid}/generate/prop/Sword', json={
    'prompt': 'test prompt'
}).json()
check("prop gen success", r.get('success') == True, str(r))
check("prop gen has task_id", bool(r.get('task_id')))

# Test: Batch generate character
print('\n=== Batch Generate Character ===')
r = requests.post(f'{BASE}/projects/{pid}/generate/character-batch', json={
    'names': ['Hero']
}).json()
check("batch char success", r.get('success') == True, str(r))
check("batch char has task_ids", bool(r.get('task_ids')))

# Test: Batch generate storyboard
print('\n=== Batch Generate Storyboard ===')
r = requests.post(f'{BASE}/projects/{pid}/generate/storyboard-batch', json={
    'script_file': 'test.json',
    'segment_ids': ['seg1', 'seg2']
}).json()
check("batch storyboard success", r.get('success') == True, str(r))
check("batch storyboard has task_ids", bool(r.get('task_ids')))

# Test: Batch generate video
print('\n=== Batch Generate Video ===')
r = requests.post(f'{BASE}/projects/{pid}/generate/video-batch', json={
    'script_file': 'test.json',
    'segment_ids': ['seg1', 'seg2']
}).json()
check("batch video success", r.get('success') == True, str(r))
check("batch video has task_ids", bool(r.get('task_ids')))

# Test: Storyboard upload
print('\n=== Storyboard Upload ===')
r = requests.post(f'{BASE}/projects/{pid}/storyboards/seg1/upload').json()
check("upload success", r.get('success') == True, str(r))

# Test: Batch storyboard upload
print('\n=== Batch Storyboard Upload ===')
r = requests.post(f'{BASE}/projects/{pid}/storyboards/upload', json={
    'segment_ids': ['seg1', 'seg2']
}).json()
check("batch upload success", r.get('success') == True, str(r))
check("batch upload has data", 'data' in r)

# Test: Generate episode config
print('\n=== Generate Episode Config ===')
r = requests.post(f'{BASE}/projects/{pid}/episodes/generate-config', json={
    'episode': 1
}).json()
check("gen config success", r.get('success') == True, str(r))
check("gen config has task_id", bool(r.get('task_id')))

# Test: Update episode config
print('\n=== Update Episode Config ===')
r = requests.put(f'{BASE}/projects/{pid}/episodes/config', json={
    'episode': 1,
    'script_file': 'episode_1.json',
    'scenes': [{'scene_id': 'E1S1', 'duration_seconds': 8}]
}).json()
check("update config success", r.get('success') == True, str(r))

# Test: Insert episode
print('\n=== Insert Episode ===')
r = requests.post(f'{BASE}/projects/{pid}/episodes', json={
    'title': 'Episode 1',
    'text': 'Episode content here'
}).json()
check("insert episode success", r.get('success') == True, str(r))
check("insert episode returns episode", 'episode' in r)

# Test: Add storyboard
print('\n=== Add Storyboard ===')
r = requests.post(f'{BASE}/projects/{pid}/episodes/1/storyboards', json={
    'text': 'A new storyboard scene',
    'duration_seconds': 8
}).json()
check("add storyboard success", r.get('success') == True, str(r))
check("add storyboard has scene_id", bool(r.get('scene_id')))

# Test: Update script scene
print('\n=== Update Script Scene ===')
r = requests.patch(f'{BASE}/projects/{pid}/script-scenes/E1S1', json={
    'characters_in_scene': ['Hero'],
    'scenes': ['Castle'],
    'props': ['Sword']
}).json()
check("update scene success", r.get('success') == True, str(r))

# Test: Delete storyboard
print('\n=== Delete Storyboard ===')
r = requests.delete(f'{BASE}/projects/{pid}/episodes/1/storyboards/E1S1').json()
check("delete storyboard success", r.get('success') == True, str(r))

# Test: Delete episode
print('\n=== Delete Episode ===')
r = requests.delete(f'{BASE}/projects/{pid}/episodes/1').json()
check("delete episode success", r.get('success') == True, str(r))

# Test: Generate overview
print('\n=== Generate Overview ===')
r = requests.post(f'{BASE}/projects/{pid}/generate-overview').json()
check("gen overview success", r.get('success') == True, str(r))
check("gen overview has overview", 'overview' in r)

# Test: Update overview
print('\n=== Update Overview ===')
r = requests.patch(f'{BASE}/projects/{pid}/overview', json={
    'synopsis': 'A test synopsis',
    'genre': 'Fantasy'
}).json()
check("update overview success", r.get('success') == True, str(r))

# Test: Upload file
print('\n=== Upload File ===')
r = requests.post(f'{BASE}/projects/{pid}/upload/source?name=test.txt',
    files={'file': ('test.txt', b'test content', 'text/plain')}
).json()
check("upload file success", r.get('success') == True, str(r))
check("upload file has url", 'url' in r)

# Test: Auto assets generate
print('\n=== Auto Assets Generate ===')
r = requests.post(f'{BASE}/projects/{pid}/auto-assets/generate', json={
    'asset_type': 'all'
}).json()
check("auto assets success", r.get('success') == True, str(r))
check("auto assets has characters", 'characters' in r)
check("auto assets has scenes", 'scenes' in r)
check("auto assets has props", 'props' in r)

# Cleanup
requests.delete(f'{BASE}/projects/{pid}')
print(f'\n=== Results: {passed} passed, {failed} failed, {passed+failed} total ===')