# Slashy

**Select text on any page, type `/`, run an AI skill.** A free, open-source Chrome side panel that turns your best prompts into slash commands, with the page you're reading as context. Bring your own model: DeepSeek, OpenAI, Anthropic, Gemini, Ollama, or any OpenAI-compatible endpoint.

English · [简体中文](README.zh-CN.md)

## What it does

- **Slash skills.** Type `/` in the panel to get a searchable list of skills. Pick one, add details if you like, press Enter.
- **Page context, automatically.** Your current text selection is sent with the skill. With no selection, the whole page text is used (toggle "Use page" off to ask a plain question).
- **Your own skills.** A skill is a name plus a prompt. Create, edit, disable, or reset them from the lightning-bolt button. Five are built in: Summarize, Explain, Translate, Polish, Sentence study.
- **Any model provider.** Add providers from presets (or a custom URL), switch the active model from the picker under the input. Streams answers and shows reasoning for models that expose it.
- **Private by default.** Keys and skills live in `chrome.storage.local`. Page content goes only to the provider you configured, and only when you send.

## Install

1. Download `slashy-vX.Y.Z.zip` from the [latest release](https://github.com/cyclone-mind/Slashy/releases/latest) and unzip it.
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and choose the unzipped folder.
3. Click the Slashy icon (or press `Alt+S`) to open the side panel, then add a provider via the sliders button.

## Providers

| Preset | API format | Base URL |
| --- | --- | --- |
| DeepSeek, OpenAI, Gemini, OpenRouter, Moonshot, Zhipu, Qwen, SiliconFlow | OpenAI-compatible | see presets |
| Anthropic | Anthropic Messages | `https://api.anthropic.com` |
| Ollama | OpenAI-compatible | `http://localhost:11434/v1` |
| Custom | either | your own |

For Ollama, start it with `OLLAMA_ORIGINS=chrome-extension://*` so the extension may call it.

## Develop

Requires Node 22+ and pnpm.

```bash
pnpm install
pnpm dev        # rebuild to dist/ on change; load dist/ as an unpacked extension
pnpm test       # unit tests for the slash/context/streaming logic
pnpm type-check
pnpm zip        # build and write dist-zip/slashy-vX.Y.Z.zip
```

`node scripts/mock-llm.mjs` starts an OpenAI-compatible streaming mock on `http://localhost:8787/v1` and a sample article at `/page`, handy for trying the UI without an API key.

```
src/core.ts        slash filter, context building, SSE parsing (pure, tested)
src/llm.ts         streaming client for OpenAI-compatible and Anthropic APIs
src/page.ts        reads selection and text from the active tab
src/sidepanel/     React UI: chat, skills, providers
```

## Releasing

Push a tag like `v0.1.0`. GitHub Actions builds the extension and attaches `slashy-v0.1.0.zip` to a GitHub Release. Keep `package.json` `version` in step with the tag.

## Roadmap

Screenshot input, saved chat history, multi-tab context, skill import/export. Community sharing and page-rewriting scripts are out of scope for now.

## License

[MIT](LICENSE). Started from the [chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite) template.
