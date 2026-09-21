---
alwaysApply: true
scene: git_message
---

## Git Commit 信息规范 (中文)

使用中文编写 commit 信息, 简短明了, 包含变更类型、模块、变更内容。

### type 枚举

| type       | 含义                                  | 示例                                     |
| ---------- | ------------------------------------- | ---------------------------------------- |
| `feat`     | 新功能                                | `feat(首页): 新增色卡收藏入口`           |
| `fix`      | Bug 修复                              | `fix(导出): 修复大尺寸图片内存溢出`      |
| `docs`     | 仅文档变更                            | `docs: 补充本地启动步骤`                 |
| `style`    | 格式调整 (空格、分号等),不改逻辑      | `style: 统一缩进为 2 空格`               |
| `refactor` | 既不是新增功能也不是修 Bug 的代码重构 | `refactor(api): 抽取图片解码工具函数`    |
| `perf`     | 性能优化                              | `perf(渲染): 缓存调色板结果避免重复计算` |
| `test`     | 添加或修改测试                        | `test(色卡): 覆盖 RGB→HEX 转换边界值`    |
| `build`    | 构建系统、依赖项                      | `build: 升级 vite 到 5.x`                |
| `ci`       | CI 配置与脚本                         | `ci: 增加 PR 构建缓存`                   |
| `chore`    | 其他杂项 (不修改 src/test)            | `chore: 更新 .gitignore`                 |
| `revert`   | 回退提交                              | `revert: 回退 feat(首页) 引入的白屏问题` |
