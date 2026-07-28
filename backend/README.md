# AIAniDrama

AI 动漫剧集生成平台，将小说或剧本自动转换为精彩的动漫视频内容。

## 核心特性

- **分层架构设计**：采用领域驱动设计（DDD）理念，清晰划分 API 层、应用层、领域层和基础设施层
- **异步任务队列**：所有生成任务（资产、剧本、分镜、视频）均加入任务队列，支持实时进度跟踪
- **多供应商支持**：支持 SRD、Ark、Dashscope、OpenAI、Grok、Kling 等多种 AI 供应商
- **依赖注入**：通过依赖注入降低模块耦合，提高可测试性和可扩展性
- **完整的资产生态**：角色、场景、道具统一管理，支持自动提取和手动设计

## 技术栈

- **框架**: FastAPI 0.115+
- **语言**: Python 3.11+
- **ORM**: SQLAlchemy 2.0（异步模式）
- **数据库**: SQLite（开发）/ PostgreSQL（生产）
- **安全**: python-jose + passlib（预留）
- **文件上传**: python-multipart
- **视频处理**: ffmpeg-python
- **HTTP 客户端**: httpx
- **配置管理**: pydantic-settings
- **日志**: structlog
- **重试机制**: tenacity
- **图片处理**: Pillow

## 项目结构

```
ai_anidrama/
├── api/                        # API 层
│   ├── v1/                     # 版本化路由
│   │   ├── projects.py         # 项目管理
│   │   ├── scripts.py          # 剧本管理
│   │   ├── assets.py           # 资产管理
│   │   ├── generation.py       # 内容生成
│   │   ├── tasks.py            # 任务队列
│   │   ├── providers.py        # 供应商管理
│   │   ├── custom_providers.py # 自定义供应商
│   │   ├── storyboard_uploads.py # 分镜上传授权
│   │   ├── exports.py          # 视频导出
│   │   ├── project_progress.py # 项目进度
│   │   ├── api_keys.py         # API密钥管理
│   │   └── files.py            # 文件管理
│   └── dependencies.py         # 依赖注入
├── application/                # 应用层
│   ├── dtos/                  # 数据传输对象
│   │   ├── project.py
│   │   ├── script.py
│   │   ├── asset.py
│   │   ├── generation.py
│   │   ├── export.py
│   │   ├── provider.py
│   │   ├── storyboard.py
│   │   └── api_key.py
│   └── services/               # 应用服务
│       ├── project.py
│       ├── script.py
│       ├── asset.py
│       ├── generation.py
│       ├── task.py
│       ├── provider.py
│       ├── storyboard.py
│       ├── export.py
│       ├── progress.py
│       └── api_key.py
├── domain/                     # 领域层
│   ├── entities/               # 领域实体
│   │   ├── project.py
│   │   ├── script.py
│   │   ├── character.py
│   │   ├── scene.py
│   │   ├── prop.py
│   │   └── task.py
│   ├── repositories/           # 仓储接口
│   │   ├── project_repo.py
│   │   ├── script_repo.py
│   │   ├── asset_repo.py
│   │   └── task_repo.py
│   ├── services/               # 领域服务
│   │   ├── script_processor.py
│   │   ├── asset_extractor.py
│   │   └── storyboard_generator.py
│   └── events/                 # 领域事件
│       ├── project_events.py
│       └── generation_events.py
├── infrastructure/             # 基础设施层
│   ├── config/                 # 配置管理
│   │   └── settings.py
│   ├── persistence/            # 持久化
│   │   ├── sqlalchemy/         # SQLAlchemy 配置
│   │   │   ├── engine.py
│   │   │   └── models.py
│   │   ├── file_storage/       # 文件存储
│   │   │   └── project_storage.py
│   │   └── repositories/       # 仓储实现
│   │       ├── project_impl.py
│   │       ├── script_impl.py
│   │       ├── task_impl.py
│   │       └── api_key_impl.py
│   └── external/               # 外部服务集成
│       ├── providers/          # AI 供应商
│       │   ├── base.py
│       │   ├── srd_provider.py
│       │   ├── ark_provider.py
│       │   ├── dashscope_provider.py
│       │   ├── openai_provider.py
│       │   ├── grok_provider.py
│       │   ├── kling_provider.py
│       │   └── __init__.py
│       └── queue/              # 任务队列
│           ├── task_queue.py
│           └── task_worker.py
├── core/                       # 核心模块
│   ├── exceptions.py           # 异常定义
│   ├── validators.py           # 验证器
│   ├── logging.py              # 日志配置
│   └── utils.py                # 工具函数
├── main.py                     # 应用入口
├── run.py                      # 运行脚本
├── pyproject.toml              # 依赖配置
├── pyrightconfig.json          # 类型检查配置
└── postman_collection.json     # Postman 接口文档
```

## 快速启动

### 环境要求

- Python 3.11+
- uv（Python 包管理器）
- ffmpeg（视频处理）

### 安装依赖

```bash
cd ai_anidrama
uv sync
```

### 启动开发服务器

```bash
uv run uvicorn ai_anidrama.main:app --reload --port 1241
```

### 访问服务

- API 文档：http://localhost:1241/docs
- 健康检查：http://localhost:1241/health

## API 接口概览

所有接口均位于 `/api/v1` 前缀下。

| 分组 | 接口数量 | 描述 |
|------|---------|------|
| **项目管理** | 7个 | 创建、列表、详情、更新、删除、上传源文件、处理剧本 |
| **剧本管理** | 4个 | 列表、详情、保存、删除 |
| **资产管理** | 19个 | 自动生成资产、角色/场景/道具 CRUD、设计图生成 |
| **内容生成** | 6个 | 生成分镜图/视频、批量生成、重新生成 |
| **任务队列** | 3个 | 任务详情、列表、SSE 流式状态 |
| **供应商管理** | 3个 | 供应商列表、连接测试、配置获取 |
| **自定义供应商** | 9个 | CRUD、模型管理、模型发现 |
| **分镜上传授权** | 3个 | 上传、批量上传、授权 |
| **视频导出** | 3个 | 视频导出、项目导出、剪映草稿导出 |
| **项目进度** | 2个 | 获取进度、获取当前步骤 |
| **API密钥管理** | 6个 | 创建、列表、详情、更新、删除、强制删除 |
| **文件管理** | 7个 | 源文件 CRUD、剧本/分镜/视频文件列表 |

### 导入 Postman 接口文档

```bash
# 将 postman_collection.json 导入 Postman 即可测试所有接口
```

## 业务流程

```
1. 创建项目 → 上传小说源文件 → 自动处理剧本（生成多集剧本）
                                          │
                                          ▼
2. 自动生成资产（角色/场景/道具） → 手动调整设计图
                                          │
                                          ▼
3. 选择集数 → 生成分镜图 → 生成视频 → 预览与导出
```

## 配置说明

### 环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
# 数据库配置
DATABASE_URL=sqlite+aiosqlite:///./projects/.anidrama.db

# 供应商配置（根据需要启用）
SRD_API_KEY=your-srd-key
ARK_API_KEY=your-ark-key
DASHSCOPE_API_KEY=your-dashscope-key
OPENAI_API_KEY=your-openai-key
```

### 供应商配置

通过 API 动态配置供应商：

```bash
# 查看所有可用供应商
GET /api/v1/providers

# 测试供应商连接
GET /api/v1/providers/{provider_name}/test

# 获取供应商配置
GET /api/v1/providers/{provider_name}/config
```

## 开发指南

### 类型检查

```bash
uv run basedpyright
```

### 代码风格检查

```bash
uv run ruff check .
uv run ruff format .
```

### 运行测试

```bash
uv run pytest -v
uv run pytest --cov=ai_anidrama  # 覆盖率测试
```

## 任务队列

所有生成任务均通过任务队列异步处理，支持以下状态：

- `pending` - 等待执行
- `in_progress` - 执行中
- `completed` - 已完成
- `failed` - 失败

### 实时跟踪任务状态

```bash
# SSE 流式获取任务状态
GET /api/v1/tasks/{task_id}/stream
```

## 许可证

MIT License
