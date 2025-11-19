# Ollama Code - Local AI Chat for VS Code

Ollama Code is a fork of the GitHub Copilot Chat extension that uses **local Ollama models** instead of GitHub's API. Get all the powerful AI chat features of Copilot Chat, but running entirely on your machine with your choice of open-source models.

## Features

- **100% Local**: All AI processing happens on your machine using Ollama
- **No Authentication Required**: No GitHub account or subscription needed
- **Full UI Preservation**: Exact same chat panel, inline editing, and agent mode as GitHub Copilot Chat
- **Any Ollama Model**: Works with any model you've pulled in Ollama (Qwen, Llama, Mistral, etc.)
- **Privacy First**: Your code never leaves your machine

## Prerequisites

1. **Install Ollama**: Download and install from [ollama.ai](https://ollama.ai)
2. **Pull a Model**: Run `ollama pull qwen2.5-coder` (or any model you prefer)
3. **Start Ollama**: Ensure Ollama is running on `http://localhost:11434`

## Installation

### From Source (Current Method)

1. Clone this repository:
   ```bash
   git clone https://github.com/ollama-code/vscode-ollama-code.git
   cd vscode-ollama-code
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run compile
   ```

4. Package the extension:
   ```bash
   npm run package
   ```

5. Install in VS Code:
   - Open VS Code
   - Go to Extensions view (Ctrl+Shift+X)
   - Click "..." → "Install from VSIX..."
   - Select the generated `ollama-code-*.vsix` file

## Configuration

Ollama Code works out of the box with default settings. You can customize:

```json
{
  "github.copilot.chat.byok.ollamaEndpoint": "http://localhost:11434",
  // The endpoint is configured automatically when Ollama is running locally
}
```

### Selecting Models

The extension automatically discovers all models available in your Ollama installation. To switch models:

1. Open the Command Palette (Ctrl+Shift+P)
2. Type "Ollama Code: Configure"
3. Select your preferred model from the list

## Usage

### Chat Panel
- Open with `Ctrl+Alt+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
- Ask questions about your code, request refactoring, or get explanations
- All conversations happen locally with your Ollama model

### Inline Chat
- Select code and press `Ctrl+I` (Windows/Linux) or `Cmd+I` (Mac)
- Get quick refactoring suggestions right in your editor

### Edit Mode
- Use `/edit` in chat to modify multiple files
- Preview changes before applying
- All processing happens locally

### Agent Mode (Experimental)
- Autonomous coding assistant that can:
  - Make multiple file changes
  - Run terminal commands (with your permission)
  - Fix errors iteratively
- Fully local execution with Ollama

## Supported Models

Ollama Code works with any Ollama model, but these are recommended for coding tasks:

- **qwen2.5-coder** (Recommended): Excellent for code generation
- **deepseek-coder-v2**: Strong code understanding
- **codellama**: Meta's code-focused model
- **mistral**: Good general-purpose model
- **llama3**: Versatile and capable

To use a model, first pull it with Ollama:
```bash
ollama pull qwen2.5-coder:7b
```

## Key Differences from GitHub Copilot Chat

| Feature | GitHub Copilot Chat | Ollama Code |
|---------|---------------------|-------------|
| Authentication | GitHub account required | No authentication |
| API Calls | Cloud-based | 100% local |
| Subscription | Paid ($10-19/month) | Free |
| Privacy | Code sent to GitHub | Code stays local |
| Model Selection | GitHub's models | Any Ollama model |
| Internet Required | Yes | No (after model download) |

## Architecture

Ollama Code leverages the existing BYOK (Bring Your Own Key) infrastructure in the original Copilot Chat codebase. Key changes:

1. **Authentication Stub**: Replaced GitHub OAuth with a no-op authentication service
2. **Ollama Provider**: Uses the existing `OllamaLMProvider` without BYOK gating
3. **Direct Registration**: Ollama is registered as the primary provider, not as a secondary BYOK option
4. **Simplified Configuration**: Removed subscription checks and GitHub-specific features

## Troubleshooting

### Ollama Not Detected
- Ensure Ollama is running: `ollama serve`
- Check it's accessible: `curl http://localhost:11434/api/tags`
- Verify firewall settings allow localhost connections

### Model Not Available
- List available models: `ollama list`
- Pull a model if needed: `ollama pull qwen2.5-coder`
- Restart VS Code after pulling new models

### Performance Issues
- Use smaller models for faster responses (7B parameters recommended)
- Ensure adequate RAM (8GB minimum, 16GB recommended)
- Check CPU/GPU utilization during inference

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/ollama-code/vscode-ollama-code.git
cd vscode-ollama-code

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run in VS Code development instance
npm run watch
# Then press F5 in VS Code to launch
```

### Key Files Modified

- `package.json` - Rebranded metadata
- `src/extension/byok/vscode-node/byokContribution.ts` - Removed BYOK gating
- `src/extension/extension/vscode-node/contributions.ts` - Registered Ollama as primary
- `src/platform/authentication/vscode-node/ollamaStubTokenManager.ts` - Stub auth
- `src/platform/authentication/vscode-node/ollamaAuthenticationService.ts` - No-op auth service

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Focus areas for contribution:
- Ollama-specific optimizations
- Model-specific prompt templates
- Local model management UI
- Performance improvements

## Author

Created by **John Olenski** ([Johnohhh1.dev](https://johnohhh1.dev))

## License

This project maintains the MIT license from the original Microsoft/GitHub codebase. See LICENSE.txt for details.

## Acknowledgments

- Original codebase by Microsoft/GitHub
- Ollama team for the excellent local LLM runtime
- Open-source model creators (Meta, Alibaba, DeepSeek, etc.)

## Disclaimer

This is an unofficial fork and is not affiliated with GitHub, Microsoft, or Anthropic. "Ollama Code" is an independent project that adapts the open-source Copilot Chat extension for use with local Ollama models.

## Support

- **Issues**: [GitHub Issues](https://github.com/ollama-code/vscode-ollama-code/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ollama-code/vscode-ollama-code/discussions)
- **Ollama Help**: [Ollama Documentation](https://github.com/ollama/ollama)

---

**Privacy Note**: Unlike cloud-based AI coding assistants, Ollama Code ensures your code never leaves your machine. All processing happens locally using your Ollama installation.