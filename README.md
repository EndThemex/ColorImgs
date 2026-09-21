# ColorImgs

一个轻量的图床管理与浏览工具,所有图片元数据保存在浏览器本地,支持标签筛选、搜索、批量上传、秒传、JSON 导入导出。

## 功能

- **本地存储**:基于 `sql.js` + IndexedDB,图片元数据(URL / 名称 / 标签 / 备注 / 上传时间)持久化在浏览器,不上传到任何服务器。
- **批量上传**:支持点击或拖拽多张图片,自动通过 `XHR` 上传到 [img.scdn.io](https://img.scdn.io) 图床接口,可指定 CDN 域名。
- **秒传识别**:根据接口返回值自动判断秒传结果并提示。
- **标签管理**:以标签芯片的形式浏览、添加、移除;支持多标签组合筛选。
- **搜索**:对名称、标签、备注进行实时搜索(防抖 250ms)。
- **分页加载**:默认每页 60 条,滚动到底部可加载更多。
- **图片操作**:卡片上直接下载图片、复制 URL;详情面板可编辑名称 / 标签 / 备注,或删除记录。
- **JSON 导入 / 导出**:跨设备迁移数据;导入时按 URL 去重,统计新增 / 合并 / 跳过。
- **主题切换**:支持跟随系统 / 浅色 / 深色三档,选择保存在 `localStorage`。

## 开发

```bash
# 安装依赖
bun install

# 本地开发服务器(端口 5533)
bun run dev

# 构建生产包到 dist/
bun run build

# 预览构建产物
bun run preview
```

## 项目结构

```
.
├── index.html              # 入口 HTML
├── public/                 # 静态资源(sql-wasm、favicon 等)
├── src/
│   ├── main.js             # UI 与交互逻辑
│   ├── db.js               # sql.js 封装、IndexedDB 持久化、CRUD
│   ├── imagebed.js         # 图床上传接口封装
│   └── style.css           # 样式
└── vite.config.js          # Vite 配置
```

## 数据存储

- 数据库文件存放在 IndexedDB 的 `colorimgs-db / sqlite` 中,以二进制 blob 形式保存。
- 单条记录包含字段:`id`、`url`、`name`、`tags`(逗号分隔字符串)、`note`、`created_at`。
- 删除操作只移除本地记录,不会删除图床上的原图。

## License

[Apache-2.0](./LICENSE)
