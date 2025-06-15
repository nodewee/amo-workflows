# Amo 工作流

分享个人的 Amo 工作流，用于演示和使用 Amo 工作流引擎的功能。

## Amo

- Amo 工作流引擎 [https://github.com/amo-run/amo-cli](https://github.com/amo-run/amo-cli)

- [工作流中可用的接口/类型定义文件](https://github.com/amo-run/amo-cli/blob/main/amo-workflow.d.ts)
- [工作流开发指南](https://github.com/amo-run/amo-cli/blob/main/WORKFLOW-DEVELOPMENT.md)

## 使用方法

1. 安装 [Amo CLI](https://github.com/amo-run/amo-cli) 工具。
2. 从本仓库下载工作流，例如：
   `amo workflow get https://raw.githubusercontent.com/nodewee/amo-workflows/main/workflows/<workflow.js> --filename workflow.js`
3. 运行工作流：
   `amo run workflow.js --var key=value`

每个工作流均包含其参数设置和使用说明。

请确保将所需的外部命令行工具添加至 Amo 的白名单。 