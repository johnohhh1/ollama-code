# Ollama Code - Your Local AI Coding Assistant

**[Ollama Code](https://github.com/ollama-code/vscode-ollama-code)** is a free, open-source AI coding assistant that runs entirely on your machine using Ollama models.

Ollama Code provides the same powerful AI features as GitHub Copilot Chat, but with complete privacy - your code never leaves your machine. Choose from any Ollama model, customize your experience, and enjoy unlimited usage with no subscription required.

**100% Free • 100% Private • 100% Local**

![Ollama Code - Local AI chat and coding assistance](assets/Ohhhllama.png)

## Features

When you install Ollama Code, you get:
* **AI Chat Panel** - Conversational AI assistance with full context awareness
* **Inline Suggestions** - Code completions and refactoring right in your editor
* **Edit Mode** - Multi-file editing with preview
* **Agent Mode** - Autonomous coding assistant for complex tasks

## Getting Started with Ollama Code

### Prerequisites

1. **Install Ollama** from [ollama.ai](https://ollama.ai)
2. **Pull a model**: `ollama pull qwen2.5-coder:7b` (or any model you prefer)
3. **Start Ollama**: `ollama serve`

That's it! No signup, no API keys, no subscription needed.

## AI-Powered Local Coding

**Experience the power of AI coding without compromising privacy**. Ollama Code brings you:

- **Chat View** (`Ctrl+Alt+I`) - Ask questions, get explanations, and receive code suggestions
- **Inline Chat** (`Ctrl+I`) - Refactor and improve code without leaving the editor
- **Edit Mode** - Make changes across multiple files with full preview
- **Agent Mode** - Let AI handle complex, multi-step coding tasks

![Ollama Code Chat Interface](assets/Ohhhllama.png)

## Supported Models

Ollama Code works with ANY Ollama model, including:

- **qwen2.5-coder** - Optimized for coding (recommended)
- **deepseek-coder-v2** - Excellent code understanding
- **codellama** - Meta's specialized coding model
- **llama3** - General purpose with good coding abilities
- **mistral** - Fast and efficient

## Key Benefits Over Cloud Solutions

| Feature | Ollama Code | GitHub Copilot |
|---------|------------|----------------|
| **Cost** | Free Forever | $10-19/month |
| **Privacy** | 100% Local | Code sent to cloud |
| **Internet** | Not Required | Always Required |
| **Models** | Any Ollama Model | Fixed Models |
| **Usage Limits** | Unlimited | Rate Limited |

## Quick Commands

- **Open Chat**: `Ctrl+Alt+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
- **Inline Chat**: Select code and press `Ctrl+I`
- **Switch Model**: Command Palette → "Ollama Code: Switch Model"
- **Check Status**: Command Palette → "Ollama Code: Check Status"

## Configuration

Ollama Code works out of the box. To customize:

```json
{
  "github.copilot.chat.byok.ollamaEndpoint": "http://localhost:11434"
}
```

## Privacy First

Your code is yours. Ollama Code:
- Never sends code to external servers
- Runs entirely on your machine
- Requires no authentication or tracking
- Respects your privacy completely

## Resources & Support

* **[Documentation](https://github.com/ollama-code/vscode-ollama-code)**
* **[Report Issues](https://github.com/ollama-code/vscode-ollama-code/issues)**
* **[Ollama Models](https://ollama.ai/library)**
* **[Contributing](https://github.com/ollama-code/vscode-ollama-code/contributing)**

## Author

Created by **John Olenski** ([Johnohhh1.dev](https://johnohhh1.dev))

## License

Copyright (c) John Olenski (Johnohhh1.dev). All rights reserved.

Licensed under the [MIT](LICENSE.txt) license.

---

*Ollama Code is an independent fork of the GitHub Copilot Chat extension, modified to work with local Ollama models. Not affiliated with GitHub, Microsoft, or Anthropic.*