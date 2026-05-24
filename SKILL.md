---
name: ai-news-aggregator
description: 聚合全球 AI/科技资讯，支持抓取、检索、筛选与简报生成。用于「最近 AI 有什么新闻」「GPT/Claude/大模型 最新动态」「AI 热点汇总」「科技资讯简报」等请求。覆盖 11 个聚合平台与 70+ RSS 订阅源，含中英双语标题。任意项目均可使用，默认走在线 API。
requirements:
  node: ">=18.0.0"
  network_access: true
---

# AI 资讯聚合

全局 skill，可在任意项目中使用。把「最近 AI 有什么新闻」转成可执行的查询与简报流程。

**Skill 路径**：`~/.agents/skills/ai-news-aggregator/`

## 适用场景

- 汇总最近 24 小时 / 7 天的 AI 热点
- 按关键词搜索（GPT、Claude、DeepSeek、机器人、芯片等）
- 按平台或订阅源筛选
- 生成每日/每周 AI 简报

## 决策流程

```
用户请求
    │
    ├─ 需要本地最新抓取？ ──是──► fetch-news.sh
    │
    └─ 否 ──► query-news.mjs（默认自动选数据源）
              │
              ├─ 当前目录有 ai-news-aggregator 项目 → 读本地 data/
              ├─ skill 缓存有数据 → 读 cache/data/
              └─ 否则 / 数据过期 → 自动拉取 GitHub Pages API
```

**默认策略**：直接运行 `query-news.mjs`，无需本地项目；过期数据自动切在线 API。

## 快速命令

```bash
SKILL=~/.agents/skills/ai-news-aggregator

# 最近 24h 热点 Top 20（任意目录均可）
node $SKILL/scripts/query-news.mjs --limit 20

# 关键词搜索
node $SKILL/scripts/query-news.mjs --keyword "GPT" --limit 15

# 指定平台
node $SKILL/scripts/query-news.mjs --site aihot --limit 10

# 7 天窗口
node $SKILL/scripts/query-news.mjs --window 7d --keyword "Claude" --limit 20

# 强制在线 API
node $SKILL/scripts/query-news.mjs --remote --limit 20

# 抓取最新数据（自动 clone 项目到 skill 缓存）
$SKILL/scripts/fetch-news.sh
```

## Agent 工作流

1. **理解意图**：汇总 / 搜索 / 某平台 / 某话题 / 时间范围
2. **获取数据**：运行 `query-news.mjs`（默认即可，无需 cd 到特定项目）
3. **筛选**：`--keyword`、`--site`、`--source`、`--limit`、`--window`
4. **交付**：按输出模板组织结果，附原文链接

### 输出模板

```markdown
# AI 资讯简报 · [日期]

> 数据来源：[API/本地]，共 N 条 AI 相关资讯

## 今日要点
1. **[标题](URL)** — 来源 · 时间

## 分主题
### 大模型 / 工具与应用 / 硬件芯片
- ...
```

## 数据源

| site_id | 名称 |
|---------|------|
| `aihot` | AI今日热榜 |
| `techurls` | TechURLs |
| `newsnow` | NewsNow |
| `tophub` | TopHub |
| `buzzing` | Buzzing |
| `iris` | Info Flow |
| `zeli` | Zeli |
| `aihubtoday` | AI HubToday |
| `aibase` | AIbase |
| `bestblogs` | BestBlogs |
| `opmlrss` | OPML RSS（70+ 订阅） |

详情见 [reference.md](reference.md)。

## 环境变量（可选）

| 变量 | 说明 |
|------|------|
| `AI_NEWS_AGGREGATOR_ROOT` | 指定本地项目路径 |
| `AI_NEWS_DATA_DIR` | 指定 data 目录 |

## 在线 API

```
https://huang1125677925.github.io/ai-news-aggregator/data/latest-24h.json
https://huang1125677925.github.io/ai-news-aggregator/data/latest-7d.json
```

## 故障排查

| 问题 | 处理 |
|------|------|
| 网络错误 | 检查网络，或用 `--local` 读缓存 |
| 需要最新数据 | 运行 `fetch-news.sh` |
| 自定义 RSS | clone 项目，编辑 `feeds/follow.opml`，再 fetch |
