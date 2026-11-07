# Slashy

**在任意网页选中文字，输入 `/`，运行 AI 妙招。** 免费开源的 Chrome 侧边栏插件：把常用提示词变成斜杠命令，并自动带上你正在阅读的网页作为上下文。模型自带：DeepSeek、OpenAI、Anthropic、Gemini、Ollama，或任何 OpenAI 兼容接口。

[English](README.md) · 简体中文

## 功能

- **斜杠调用**：在侧边栏输入 `/`，弹出可搜索的技能列表，选择后回车即可运行。
- **自动带入网页上下文**：优先发送当前选中的文字；没有选中时发送整页文本（可关闭「Use page」）。
- **自定义技能**：技能 = 名称 + 提示词，可新建、编辑、停用、恢复默认。内置：Summarize、Explain、Translate、Polish、Sentence study。
- **多模型厂商**：预设 DeepSeek / OpenAI / Anthropic / Gemini / OpenRouter / Kimi / 智谱 / 通义 / SiliconFlow / Ollama，也可自定义地址；输入框下方一键切换模型。支持流式输出和思考过程展示。
- **默认私密**：密钥与技能保存在本机 `chrome.storage.local`，页面内容只会在你发送时发往你配置的厂商。

## 安装

1. 从 [最新 Release](https://github.com/cyclone-mind/Slashy/releases/latest) 下载 `slashy-vX.Y.Z.zip` 并解压。
2. 打开 `chrome://extensions`，开启「开发者模式」，点击「加载已解压的扩展程序」，选择解压后的文件夹。
3. 点击 Slashy 图标（或按 `Alt+S`）打开侧边栏，点右上角设置按钮添加模型厂商。

使用 Ollama 时需以 `OLLAMA_ORIGINS=chrome-extension://*` 启动，允许扩展访问。

## 开发

需要 Node 22+ 与 pnpm：`pnpm install`、`pnpm dev`、`pnpm test`、`pnpm zip`。详见 [README](README.md#develop)。

## 许可证

[MIT](LICENSE)，基于 [chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite) 模板。
