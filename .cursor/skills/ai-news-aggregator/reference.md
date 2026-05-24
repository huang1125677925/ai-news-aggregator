# AI News Aggregator 参考

## 输出文件

| 文件 | 说明 |
|------|------|
| `latest-24h.json` | 最近 24 小时 AI 资讯 |
| `latest-7d.json` | 最近 7 天 AI 资讯 |
| `archive.json` | 45 天历史归档 |
| `source-status.json` | 抓取状态 |

本地路径优先级：`--data-dir` > `AI_NEWS_DATA_DIR` > 项目 `data/` > skill `cache/data/`

## ArchiveItem 字段

| 字段 | 说明 |
|------|------|
| `site_id` / `site_name` | 平台 |
| `source` | 具体来源 |
| `title` / `title_zh` / `title_en` | 标题 |
| `url` | 原文链接 |
| `published_at` | 发布时间 ISO |

## query-news.mjs 参数

| 参数 | 说明 |
|------|------|
| `--window` | `24h`（默认）或 `7d` |
| `--keyword` | 关键词筛选 |
| `--site` | site_id 筛选 |
| `--source` | 来源子串筛选 |
| `--limit` | 返回条数（默认 20） |
| `--format` | `json` / `markdown` / `summary` |
| `--remote` | 强制在线 API |
| `--local` | 仅本地，不 fallback |
| `--data-dir` | 自定义数据目录 |

## site_id 对照

`aihot` · `techurls` · `newsnow` · `tophub` · `buzzing` · `iris` · `zeli` · `aihubtoday` · `aibase` · `bestblogs` · `opmlrss`

## 项目仓库

https://github.com/SuYxh/ai-news-aggregator
