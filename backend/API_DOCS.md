# ArcReel API 文档

## 基础信息

- **API 前缀**: `/api/v1`
- **认证方式**: Bearer Token，在请求头中添加 `Authorization: Bearer <token>`
- **基础 URL**: `http://localhost:1243/api/v1`

---

## 一、项目管理

### 1.1 创建项目

**POST** `/projects`

创建新项目，可配置模型、风格等设置。

**请求体**:
```json
{
  "title": "我的动画项目",
  "name": "my-animation-project",
  "content_mode": "drama",
  "source_kind": "novel",
  "style": "国风神话动画，电影质感",
  "aspect_ratio": "9:16",
  "default_duration": 15,
  "generation_mode": "storyboard",
  "video_backend": "openai",
  "image_provider_t2i": "openai",
  "text_backend_script": "openai",
  "text_backend_overview": "openai"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 项目标题 |
| name | string | 否 | 项目ID（自动生成或手动指定） |
| content_mode | string | 否 | 内容模式：`drama`（剧集）/ `narration`（说书）/ `ad`（广告），默认 `narration` |
| source_kind | string | 否 | 源文件性质：`novel`（小说）/ `screenplay`（剧本），默认 `novel` |
| style | string | 否 | 风格描述 |
| aspect_ratio | string | 否 | 画面比例，默认 `9:16` |
| default_duration | int | 否 | 默认时长（秒） |
| generation_mode | string | 否 | 生成模式：`storyboard`/`grid`/`reference_video` |
| video_backend | string | 否 | 视频生成后端 |
| image_provider_t2i | string | 否 | 图生图提供者 |
| text_backend_script | string | 否 | 剧本生成文本后端 |
| text_backend_overview | string | 否 | 概述生成文本后端 |

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的动画项目",
    "content_mode": "drama",
    "style": "国风神话动画，电影质感",
    "aspect_ratio": "9:16",
    "default_duration": 15
  }'
```

---

### 1.2 获取项目列表

**GET** `/projects`

获取当前用户的所有项目列表。

**CURL 命令**:
```bash
curl -X GET http://localhost:1243/api/v1/projects \
  -H "Authorization: Bearer test"
```

---

### 1.3 获取项目详情

**GET** `/projects/{project_id}`

获取指定项目的详细信息。

**CURL 命令**:
```bash
curl -X GET http://localhost:1243/api/v1/projects/my-animation-project \
  -H "Authorization: Bearer test"
```

---

### 1.4 更新项目配置

**PATCH** `/projects/{project_id}`

更新项目的模型、风格等配置。

**请求体**:
```json
{
  "title": "更新后的项目标题",
  "style": "科幻动画风格",
  "aspect_ratio": "16:9",
  "default_duration": 20,
  "video_backend": "dashscope",
  "image_provider_t2i": "dashscope"
}
```

**CURL 命令**:
```bash
curl -X PATCH http://localhost:1243/api/v1/projects/my-animation-project \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的项目标题",
    "style": "科幻动画风格",
    "aspect_ratio": "16:9"
  }'
```

---

### 1.5 删除项目

**DELETE** `/projects/{project_id}`

删除指定项目。

**CURL 命令**:
```bash
curl -X DELETE http://localhost:1243/api/v1/projects/my-animation-project \
  -H "Authorization: Bearer test"
```

---

## 二、源文件管理

### 2.1 上传源文件（小说/剧本）

**POST** `/projects/{project_id}/source`

上传小说或剧本源文件，仅做文件存储，不触发 AI 处理。

**请求参数**（multipart/form-data）:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 二选一 | 文本内容 |
| file | file | 二选一 | 上传文件（.txt/.md） |

**CURL 命令**（上传文本）:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/source \
  -H "Authorization: Bearer test" \
  -F "content=这是小说的第一章内容..."
```

**CURL 命令**（上传文件）:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/source \
  -H "Authorization: Bearer test" \
  -F "file=@novel.txt"
```

---

## 三、小说转剧本（AI处理）

### 3.1 小说转剧本

**POST** `/projects/{project_id}/script/process`

小说转剧本：将小说文本转换为结构化剧本格式（仅分集，不分镜）。

当项目的 `source_kind` 为 `novel` 时，可调用此接口将小说改编为剧本。本接口调用后会自动保存剧本到项目中，无需额外调用保存接口。

**请求体**:
```json
{
  "episodes_count": 3
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| episodes_count | int | 否 | 期望分集数，0表示自动根据内容长度判断 |

> **说明**：接口自动读取项目 source 目录下已上传的源文件内容进行处理。

**返回示例**:
```json
{
    "success": true,
    "message": "任务已入队，正在生成剧本",
    "task_id": "task-abc123"
}
```

**返回字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| success | bool | 是否成功 |
| message | string | 提示信息 |
| task_id | string | 任务ID，用于查询任务进度和状态 |

> **说明**：剧本生成任务已改为异步执行，任务入队后可通过 `GET /tasks/{task_id}` 接口查询任务进度和状态。任务完成后，剧本会自动保存到项目中。

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/script/process \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "episodes_count": 3
  }'
```

---

## 四、剧本管理

### 4.1 获取所有剧本

**GET** `/projects/{project_id}/scripts`

获取项目的所有剧本完整内容。

**CURL 命令**:
```bash
curl -X GET http://localhost:1243/api/v1/projects/my-animation-project/scripts \
  -H "Authorization: Bearer test"
```

---

### 4.2 删除剧本

**DELETE** `/projects/{project_id}/scripts/{episode_number}`

删除指定集数的剧本。

**参数**:
- `episode_number`: 集数（整数），如 `1`、`2`、`3`

**CURL 命令**:
```bash
curl -X DELETE http://localhost:1243/api/v1/projects/my-animation-project/scripts/1 \
  -H "Authorization: Bearer test"
```

---

## 五、项目概述管理

### 5.1 生成项目概述

**POST** `/projects/{project_id}/generate-overview`

使用 AI 生成项目概述（故事梗概、世界观设定等）。

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/generate-overview \
  -H "Authorization: Bearer test"
```

---

### 5.2 更新项目概述

**PATCH** `/projects/{project_id}/overview`

手动编辑更新项目概述。

**请求体**:
```json
{
  "synopsis": "故事梗概内容...",
  "genre": "科幻/冒险",
  "theme": "勇气与成长",
  "world_setting": "世界观设定内容..."
}
```

**CURL 命令**:
```bash
curl -X PATCH http://localhost:1243/api/v1/projects/my-animation-project/overview \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "synopsis": "这是一个关于勇气与成长的故事...",
    "genre": "科幻/冒险",
    "world_setting": "在遥远的未来，人类已经殖民了银河系..."
  }'
```

---

## 六、剧集管理

### 6.1 获取剧集列表

**GET** `/projects/{project_id}/episodes`

获取项目的所有剧集列表。

**CURL 命令**:
```bash
curl -X GET http://localhost:1243/api/v1/projects/my-animation-project/episodes \
  -H "Authorization: Bearer test"
```

---

### 6.2 AI 自动规划多集

**POST** `/projects/{project_id}/episodes/plan`

根据源文件内容，AI 自动规划分集。

**请求体**:
```json
{
  "episodes_count": 10,
  "episode_target_units": 1000,
  "strategy": "balanced"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| episodes_count | int | 否 | 目标集数，0表示自动规划 |
| episode_target_units | int | 否 | 每集目标体量（字符数），默认1000 |
| strategy | string | 否 | 分集策略：`balanced`（均衡）/ `climax`（高潮优先）/ `intro`（慢热） |

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/episodes/plan \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "episodes_count": 10,
    "episode_target_units": 1000,
    "strategy": "balanced"
  }'
```

---

### 6.3 直接生成剧集剧本

**POST** `/projects/{project_id}/episodes/direct-generate`

根据源文件内容，AI 直接生成多集剧本（规划+生成一步完成）。

**请求体**:
```json
{
  "episode": 1,
  "episodes_count": 5,
  "episode_target_units": 1000,
  "strategy": "balanced"
}
```

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/episodes/direct-generate \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "episode": 1,
    "episodes_count": 5,
    "episode_target_units": 1000,
    "strategy": "balanced"
  }'
```

---

### 6.4 生成单集剧本

**POST** `/projects/{project_id}/episodes/{episode}/generate-script`

根据分集规划生成单集剧本。

**请求体**:
```json
{
  "start_pos": 0,
  "end_pos": 5000,
  "plan": {
    "title": "第1集：开端",
    "story_beats": ["开场", "冲突", "悬念"],
    "suggested_scenes_count": 12,
    "next_episode_teaser": "下一集预告..."
  }
}
```

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/episodes/1/generate-script \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "start_pos": 0,
    "end_pos": 5000,
    "plan": {
      "title": "第1集：开端",
      "story_beats": ["神秘来客", "小镇风波", "留下悬念"],
      "suggested_scenes_count": 12
    }
  }'
```

---

### 6.5 新建剧集（仅创建剧集元数据）

**POST** `/projects/{project_id}/episodes`

创建新剧集条目（仅创建元数据）。导入剧本和AI生成剧本通过其他专用接口完成。

**请求体**:
```json
{
  "episode": 6,
  "title": "第6集：新的冒险",
  "script_file": "episode_6.json",
  "generation_mode": "storyboard"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| episode | int | 是 | 集数编号 |
| title | string | 否 | 剧集标题，默认"第N集" |
| script_file | string | 否 | 剧本文件路径（引用已存在的剧本） |
| generation_mode | string | 否 | 生成模式，默认 storyboard |

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/episodes \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "episode": 6
  }'
```

---

### 6.6 更新剧集

**PUT** `/projects/{project_id}/episodes/{episode}`

更新剧集信息。

**请求体**:
```json
{
  "title": "第2集：更新后的标题",
  "script_file": "episode_2.json"
}
```

**CURL 命令**:
```bash
curl -X PUT http://localhost:1243/api/v1/projects/my-animation-project/episodes/2 \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "第2集：更新后的标题"
  }'
```

---

### 6.7 删除剧集

**DELETE** `/projects/{project_id}/episodes/{episode}`

删除指定剧集。

**CURL 命令**:
```bash
curl -X DELETE http://localhost:1243/api/v1/projects/my-animation-project/episodes/2 \
  -H "Authorization: Bearer test"
```

---

## 七、分镜生成

### 7.1 生成分镜

**POST** `/projects/{project_id}/generate/storyboard/{segment_id}`

为指定片段生成分镜图。

**请求体**:
```json
{
  "script_file": "episode_1.json",
  "scene_id": "S01",
  "count": 1,
  "prompt_override": "更详细的分镜描述"
}
```

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/generate/storyboard/S01 \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "script_file": "episode_1.json",
    "scene_id": "S01",
    "count": 1
  }'
```

---

## 八、视频生成

### 8.1 生成视频

**POST** `/projects/{project_id}/generate/video/{segment_id}`

为指定片段生成视频。

**请求体**:
```json
{
  "script_file": "episode_1.json",
  "scene_id": "S01",
  "duration_seconds": 15,
  "image_prompt": "视频画面描述",
  "video_prompt": "视频动作描述"
}
```

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/generate/video/S01 \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "script_file": "episode_1.json",
    "scene_id": "S01",
    "duration_seconds": 15
  }'
```

---

## 九、角色/场景/道具管理

### 9.0 自动生成资产

**POST** `/projects/{project_id}/auto-assets/generate`

根据剧集内容自动提取并生成角色/场景/道具资产。

**请求体**:
```json
{
  "asset_type": "all"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| asset_type | string | 是 | 要生成的资产类型: character \| scene \| prop \| all |

**返回示例**:
```json
{
    "success": true,
    "message": "任务已入队，正在生成资产",
    "task_id": "task-abc123"
}
```

**返回字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| success | bool | 是否成功 |
| message | string | 提示信息 |
| task_id | string | 任务ID，用于查询任务进度和状态 |

> **说明**：资产生成任务已改为异步执行，任务入队后可通过 `GET /tasks/{task_id}` 接口查询任务进度和状态。任务完成后，资产会自动保存到项目中。

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/auto-assets/generate \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "asset_type": "all"
  }'
```

---

### 9.1 生成角色

**POST** `/projects/{project_id}/generate/character/{char_name}`

生成角色形象。

**请求体**:
```json
{
  "description": "角色描述",
  "voice_style": "温柔"
}
```

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/generate/character/主角 \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "年轻的冒险者，勇敢正直",
    "voice_style": "年轻男性"
  }'
```

---

### 9.2 生成场景

**POST** `/projects/{project_id}/generate/scene/{scene_name}`

生成场景背景图。

**请求体**:
```json
{
  "description": "场景描述"
}
```

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/generate/scene/神秘森林 \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "迷雾笼罩的古老森林，阳光透过树叶洒落"
  }'
```

---

### 9.3 生成道具

**POST** `/projects/{project_id}/generate/prop/{prop_name}`

生成道具图片。

**请求体**:
```json
{
  "description": "道具描述"
}
```

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/generate/prop/魔法剑 \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "闪烁着蓝色光芒的古老魔法剑"
  }'
```

---

## 十、任务管理

### 10.1 获取任务列表

**GET** `/projects/{project_id}/tasks`

获取项目的所有任务列表和状态。

**CURL 命令**:
```bash
curl -X GET http://localhost:1243/api/v1/projects/my-animation-project/tasks \
  -H "Authorization: Bearer test"
```

---

### 10.2 取消所有任务

**POST** `/projects/{project_id}/tasks/cancel-all`

取消项目的所有任务。

**CURL 命令**:
```bash
curl -X POST http://localhost:1243/api/v1/projects/my-animation-project/tasks/cancel-all \
  -H "Authorization: Bearer test"
```

---

## 十一、费用估算

### 11.1 获取费用估算

**GET** `/projects/{project_id}/cost-estimate`

获取项目的费用估算（预估 + 实际）。

**CURL 命令**:
```bash
curl -X GET http://localhost:1243/api/v1/projects/my-animation-project/cost-estimate \
  -H "Authorization: Bearer test"
```

---

## 接口流程总结

```
1. 创建项目（选择小说或剧本类型）
   POST /projects → 创建成功返回 project_id 和 source_kind
   - source_kind: "novel"（小说）或 "screenplay"（剧本）

2. 上传源文件（小说或剧本）
   POST /projects/{project_id}/source → 仅保存文件

3. 生成项目概述（可选）
   POST /projects/{project_id}/generate-overview → 生成世界观

4. 小说转剧本（仅 source_kind 为 novel 时调用）
   POST /projects/{project_id}/script/process → AI处理并自动保存多集剧本（仅分集，不分镜）
   - 返回 episodes 列表，每集包含 scenes（场景）信息
   - 自动保存到 scripts/episode_N.json

5. 创建剧集并关联剧本
   POST /projects/{project_id}/episodes → 创建剧集元数据，引用剧本文件

6. 管理剧集
   GET /projects/{project_id}/episodes → 获取剧集列表（仅元数据）
   PUT /projects/{project_id}/episodes/{episode} → 更新剧集信息
   DELETE /projects/{project_id}/episodes/{episode} → 删除剧集

7. 生成分镜
   POST /projects/{project_id}/generate/storyboard/{segment_id}

8. 生成视频
   POST /projects/{project_id}/generate/video/{segment_id}

9. 全局资产管理
    POST /projects/{project_id}/generate/character/{name}
    POST /projects/{project_id}/generate/scene/{name}
    POST /projects/{project_id}/generate/prop/{name}
```

> **说明**：
> - `/script/process` 调用后会自动保存剧本到项目中，无需额外调用保存接口
> - `/script/process` 仅生成场景（Scene），分镜（Shot）在后续调用 `/generate/storyboards` 时生成
> - 传统流程（先规划分集再生成剧本）仍可用：`/episodes/plan` + `/episodes/{episode}/generate-script`

---

## 接口功能拆分说明

| 接口 | 方法 | 功能 | 用途场景 |
|------|------|------|---------|
| /projects | POST | 创建项目 | 指定 source_kind（novel/screenplay） |
| /source | POST | 上传源文件（小说/剧本） | 仅保存文件，不做 AI 处理 |
| /script/process | POST | 小说转剧本 | 将小说转换为多集剧本（仅分集，不分镜），自动保存 |
| /scripts | GET | 获取所有剧本 | 返回所有剧本的完整内容 |
| /scripts/{episode_number} | DELETE | 删除剧本 | 删除指定集数的剧本文件 |
| /episodes | GET | 获取剧集列表 | 返回剧集元数据列表，**不包含完整剧本内容** |
| /episodes | POST | 新建剧集 | 创建剧集元数据，支持引用已存在的剧本 |
| /episodes/{episode} | PUT | 更新剧集 | 修改剧集信息（标题、剧本文件等） |
| /episodes/{episode} | DELETE | 删除剧集 | 删除指定剧集（含剧本文件） |
| /episodes/{episode}/generate-script | POST | AI生成单集剧本 | 根据源文本生成单集剧本，自动关联剧集 |

---

## 错误响应格式

所有错误响应统一格式：

```json
{
  "detail": "错误描述信息"
}
```

**常见状态码**:
| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 422 | 请求体验证失败 |
| 500 | 服务器内部错误 |