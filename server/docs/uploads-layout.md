# uploads 目录约定

本地运行产生的图片资源，**不提交 Git**（见仓库根 `.gitignore` 的 `server/uploads/`）。

## 分类标准

| 路径模式 | 用途 |
|---------|------|
| `courts/{courtId}/live-*.jpg` | 场点详情「实况」轮播主图 |
| `courts/{courtId}/gallery-*.jpg` | 相册图 |
| `courts/{courtId}/facility-*.jpg` | 设施图 |
| 根目录 `{timestamp}-{rand}.ext` | `POST /api/upload` 通用上传（评价图、用户投稿、勋章 icon 等） |
| `library/{md5}.jpg`（可选） | 去重内容池；当前脚本优先用硬链接，可不物理迁移 |

对外 URL 仍为 `/uploads/...`（相对路径入库；小程序用 API origin 拼接）。

## 去重

跨场馆 enrichment 常产生**内容相同**的多份文件。运行（在 `server/` 下）：

```bash
node scripts/dedupe-uploads.mjs --dry-run
node scripts/dedupe-uploads.mjs
```

按 MD5 分组后，保留第一份文件，其余改为指向同一内容的**硬链接**，路径不变，小程序/详情 URL 无需修改。
