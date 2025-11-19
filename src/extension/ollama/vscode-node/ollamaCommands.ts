/*---------------------------------------------------------------------------------------------
 *  Copyright (c) John Olenski (Johnohhh1.dev). All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands, window, QuickPickItem, ProgressLocation, CancellationToken } from 'vscode';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { ILogService } from '../../../platform/log/common/logService';
import { IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface OllamaModel {
	name: string;
	size: string;
	modified: string;
	digest?: string;
}

interface ModelQuickPickItem extends QuickPickItem {
	model: OllamaModel;
}

/**
 * Ollama-specific commands for model management and configuration
 */
export class OllamaCommands extends Disposable {
	private currentModel: string = '';
	private ollamaEndpoint: string;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IConfigurationService private readonly configService: IConfigurationService
	) {
		super();
		this.ollamaEndpoint = this.configService.getConfig({ key: 'github.copilot.chat.byok.ollamaEndpoint' } as any) || 'http://localhost:11434';

		this.registerCommands();
	}

	private registerCommands(): void {
		// Quick model switcher
		this._register(commands.registerCommand('ollama.code.switchModel', async () => {
			await this.showModelSwitcher();
		}));

		// Pull new model
		this._register(commands.registerCommand('ollama.code.pullModel', async () => {
			await this.pullNewModel();
		}));

		// Delete model
		this._register(commands.registerCommand('ollama.code.deleteModel', async () => {
			await this.deleteModel();
		}));

		// Show model info
		this._register(commands.registerCommand('ollama.code.modelInfo', async () => {
			await this.showModelInfo();
		}));

		// Restart Ollama service
		this._register(commands.registerCommand('ollama.code.restartOllama', async () => {
			await this.restartOllama();
		}));

		// Performance benchmark
		this._register(commands.registerCommand('ollama.code.benchmark', async () => {
			await this.runBenchmark();
		}));

		// Setup wizard for first-time users
		this._register(commands.registerCommand('ollama.code.setupWizard', async () => {
			await this.runSetupWizard();
		}));
	}

	/**
	 * Show model switcher quick pick
	 */
	private async showModelSwitcher(): Promise<void> {
		try {
			const models = await this.getAvailableModels();

			if (models.length === 0) {
				const action = await window.showWarningMessage(
					'No Ollama models found. Would you like to pull a model?',
					'Pull Model',
					'Cancel'
				);

				if (action === 'Pull Model') {
					await this.pullNewModel();
				}
				return;
			}

			const items: ModelQuickPickItem[] = models.map(model => ({
				label: `$(database) ${model.name}`,
				description: this.formatSize(model.size),
				detail: `Modified: ${new Date(model.modified).toLocaleDateString()} • ${model.digest?.substring(0, 12) || 'Unknown digest'}`,
				model
			}));

			// Add current model indicator
			const currentItem = items.find(item => item.model.name === this.currentModel);
			if (currentItem) {
				currentItem.label = `$(check) ${currentItem.label}`;
			}

			const selected = await window.showQuickPick(items, {
				placeHolder: 'Select an Ollama model',
				matchOnDescription: true
			});

			if (selected) {
				this.currentModel = selected.model.name;
				await this.setActiveModel(selected.model.name);
				window.showInformationMessage(`Switched to model: ${selected.model.name}`);
			}

		} catch (error) {
			window.showErrorMessage(`Failed to switch model: ${error}`);
		}
	}

	/**
	 * Pull a new model from Ollama library
	 */
	private async pullNewModel(): Promise<void> {
		const popularModels = [
			{ label: '$(star) qwen2.5-coder:7b', description: 'Best for coding (7B)', model: 'qwen2.5-coder:7b' },
			{ label: '$(star) qwen2.5-coder:32b', description: 'Advanced coding (32B)', model: 'qwen2.5-coder:32b' },
			{ label: '$(code) deepseek-coder-v2', description: 'DeepSeek Coder V2', model: 'deepseek-coder-v2' },
			{ label: '$(code) codellama:13b', description: 'Meta Code Llama (13B)', model: 'codellama:13b' },
			{ label: '$(globe) llama3.2:latest', description: 'Latest Llama 3.2', model: 'llama3.2:latest' },
			{ label: '$(comment) mistral:latest', description: 'Mistral (7B)', model: 'mistral:latest' },
			{ label: '$(pencil) Custom...', description: 'Enter custom model name', model: 'custom' }
		];

		const selected = await window.showQuickPick(popularModels, {
			placeHolder: 'Select a model to pull'
		});

		if (!selected) return;

		let modelName = selected.model;

		if (modelName === 'custom') {
			const customName = await window.showInputBox({
				prompt: 'Enter model name (e.g., llama3:70b)',
				placeHolder: 'model:tag'
			});

			if (!customName) return;
			modelName = customName;
		}

		// Pull model with progress
		await window.withProgress({
			location: ProgressLocation.Notification,
			title: `Pulling model ${modelName}...`,
			cancellable: true
		}, async (progress, token) => {
			return this.pullModelWithProgress(modelName, progress, token);
		});
	}

	/**
	 * Pull model with progress tracking
	 */
	private async pullModelWithProgress(
		modelName: string,
		progress: any,
		token: CancellationToken
	): Promise<void> {
		try {
			// Start pull request
			const response = await fetch(`${this.ollamaEndpoint}/api/pull`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: modelName, stream: true })
			});

			if (!response.body) {
				throw new Error('No response body');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let lastPercent = 0;

			while (true) {
				if (token.isCancellationRequested) {
					reader.cancel();
					throw new Error('Cancelled');
				}

				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split('\n').filter(line => line.trim());

				for (const line of lines) {
					try {
						const data = JSON.parse(line);

						if (data.status) {
							// Update progress
							if (data.completed && data.total) {
								const percent = Math.round((data.completed / data.total) * 100);
								if (percent > lastPercent) {
									progress.report({
										increment: percent - lastPercent,
										message: `${data.status} (${percent}%)`
									});
									lastPercent = percent;
								}
							} else {
								progress.report({ message: data.status });
							}
						}
					} catch (e) {
						// Skip invalid JSON
					}
				}
			}

			window.showInformationMessage(`Successfully pulled ${modelName}`);

		} catch (error: any) {
			if (error.message !== 'Cancelled') {
				window.showErrorMessage(`Failed to pull model: ${error.message}`);
			}
		}
	}

	/**
	 * Delete a model
	 */
	private async deleteModel(): Promise<void> {
		const models = await this.getAvailableModels();

		if (models.length === 0) {
			window.showInformationMessage('No models to delete');
			return;
		}

		const items: ModelQuickPickItem[] = models.map(model => ({
			label: `$(trash) ${model.name}`,
			description: this.formatSize(model.size),
			detail: `Modified: ${new Date(model.modified).toLocaleDateString()}`,
			model
		}));

		const selected = await window.showQuickPick(items, {
			placeHolder: 'Select a model to delete',
			canPickMany: false
		});

		if (!selected) return;

		const confirm = await window.showWarningMessage(
			`Are you sure you want to delete ${selected.model.name}?`,
			{ modal: true },
			'Delete',
			'Cancel'
		);

		if (confirm === 'Delete') {
			try {
				const response = await fetch(`${this.ollamaEndpoint}/api/delete`, {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: selected.model.name })
				});

				if (response.ok) {
					window.showInformationMessage(`Deleted ${selected.model.name}`);
				} else {
					throw new Error(`HTTP ${response.status}`);
				}
			} catch (error) {
				window.showErrorMessage(`Failed to delete model: ${error}`);
			}
		}
	}

	/**
	 * Show detailed model information
	 */
	private async showModelInfo(): Promise<void> {
		const models = await this.getAvailableModels();

		if (models.length === 0) {
			window.showInformationMessage('No models available');
			return;
		}

		const items: ModelQuickPickItem[] = models.map(model => ({
			label: model.name,
			description: this.formatSize(model.size),
			model
		}));

		const selected = await window.showQuickPick(items, {
			placeHolder: 'Select a model to view info'
		});

		if (!selected) return;

		try {
			const response = await fetch(`${this.ollamaEndpoint}/api/show`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: selected.model.name })
			});

			const data = await response.json();

			// Create info display
			const info = `
**Model:** ${selected.model.name}
**Size:** ${this.formatSize(selected.model.size)}
**Modified:** ${new Date(selected.model.modified).toLocaleString()}
**Digest:** ${selected.model.digest || 'Unknown'}

**Model Info:**
- **Format:** ${data.details?.format || 'Unknown'}
- **Family:** ${data.details?.family || 'Unknown'}
- **Parameters:** ${data.details?.parameter_size || 'Unknown'}
- **Quantization:** ${data.details?.quantization_level || 'Unknown'}

**Template:**
\`\`\`
${data.template || 'No template available'}
\`\`\`
			`;

			// Show in new document
			const doc = await window.showTextDocument(
				await window.workspace.openTextDocument({
					content: info,
					language: 'markdown'
				})
			);
		} catch (error) {
			window.showErrorMessage(`Failed to get model info: ${error}`);
		}
	}

	/**
	 * Run performance benchmark
	 */
	private async runBenchmark(): Promise<void> {
		const models = await this.getAvailableModels();

		if (models.length === 0) {
			window.showWarningMessage('No models available for benchmarking');
			return;
		}

		const items: ModelQuickPickItem[] = models.map(model => ({
			label: model.name,
			description: this.formatSize(model.size),
			model
		}));

		const selected = await window.showQuickPick(items, {
			placeHolder: 'Select a model to benchmark'
		});

		if (!selected) return;

		await window.withProgress({
			location: ProgressLocation.Notification,
			title: `Benchmarking ${selected.model.name}...`,
			cancellable: false
		}, async (progress) => {
			const results = await this.performBenchmark(selected.model.name, progress);

			// Show results
			const resultText = `
# Ollama Model Benchmark Results

**Model:** ${selected.model.name}

## Performance Metrics:
- **First Token Latency:** ${results.firstTokenMs}ms
- **Average Token Speed:** ${results.tokensPerSecond.toFixed(2)} tokens/sec
- **Total Generation Time:** ${results.totalMs}ms
- **Total Tokens Generated:** ${results.tokenCount}

## Response Quality:
- **Response Length:** ${results.responseLength} characters
- **Memory Usage:** ${results.memoryUsage}MB

## Test Prompt:
"${results.prompt}"

## Generated Response:
${results.response}

---
*Benchmark completed at ${new Date().toLocaleString()}*
			`;

			const doc = await window.showTextDocument(
				await window.workspace.openTextDocument({
					content: resultText,
					language: 'markdown'
				})
			);
		});
	}

	/**
	 * Perform actual benchmark
	 */
	private async performBenchmark(modelName: string, progress: any): Promise<any> {
		const prompt = "Write a Python function that implements binary search on a sorted list. Include proper documentation and error handling.";

		progress.report({ message: 'Starting benchmark...' });

		const startTime = Date.now();
		let firstTokenTime = 0;
		let tokenCount = 0;

		try {
			const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: modelName,
					prompt: prompt,
					stream: true
				})
			});

			if (!response.body) {
				throw new Error('No response body');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let fullResponse = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split('\n').filter(line => line.trim());

				for (const line of lines) {
					try {
						const data = JSON.parse(line);

						if (data.response) {
							if (firstTokenTime === 0) {
								firstTokenTime = Date.now() - startTime;
							}
							fullResponse += data.response;
							tokenCount++;

							progress.report({
								message: `Generating... (${tokenCount} tokens)`
							});
						}
					} catch (e) {
						// Skip invalid JSON
					}
				}
			}

			const totalTime = Date.now() - startTime;

			return {
				model: modelName,
				prompt: prompt,
				response: fullResponse,
				firstTokenMs: firstTokenTime,
				totalMs: totalTime,
				tokenCount: tokenCount,
				tokensPerSecond: (tokenCount / totalTime) * 1000,
				responseLength: fullResponse.length,
				memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
			};

		} catch (error) {
			throw new Error(`Benchmark failed: ${error}`);
		}
	}

	/**
	 * Run setup wizard for first-time users
	 */
	private async runSetupWizard(): Promise<void> {
		const steps = [
			'Check Ollama Installation',
			'Pull Recommended Model',
			'Configure Endpoint',
			'Test Connection',
			'Complete Setup'
		];

		let currentStep = 0;

		// Step 1: Check Ollama
		const ollamaInstalled = await this.checkOllamaInstalled();

		if (!ollamaInstalled) {
			const action = await window.showErrorMessage(
				'Ollama is not installed or not running. Please install Ollama first.',
				'Download Ollama',
				'I have Ollama'
			);

			if (action === 'Download Ollama') {
				commands.executeCommand('vscode.open', 'https://ollama.ai/download');
			}
			return;
		}

		window.showInformationMessage('✅ Step 1: Ollama is installed and running!');

		// Step 2: Check/Pull Model
		const models = await this.getAvailableModels();

		if (models.length === 0) {
			const pullModel = await window.showInformationMessage(
				'No models found. Would you like to pull the recommended model (qwen2.5-coder:7b)?',
				'Yes, Pull Model',
				'Skip'
			);

			if (pullModel === 'Yes, Pull Model') {
				await window.withProgress({
					location: ProgressLocation.Notification,
					title: 'Pulling qwen2.5-coder:7b...'
				}, async (progress) => {
					await this.pullModelWithProgress('qwen2.5-coder:7b', progress, { isCancellationRequested: false } as any);
				});
			}
		} else {
			window.showInformationMessage(`✅ Step 2: Found ${models.length} models!`);
		}

		// Step 3: Configure endpoint
		const currentEndpoint = this.ollamaEndpoint;
		const changeEndpoint = await window.showInformationMessage(
			`Current endpoint: ${currentEndpoint}. Change it?`,
			'Keep Current',
			'Change'
		);

		if (changeEndpoint === 'Change') {
			const newEndpoint = await window.showInputBox({
				prompt: 'Enter Ollama endpoint',
				value: currentEndpoint,
				placeHolder: 'http://localhost:11434'
			});

			if (newEndpoint) {
				await this.configService.setConfig({ key: 'github.copilot.chat.byok.ollamaEndpoint' } as any, newEndpoint);
				this.ollamaEndpoint = newEndpoint;
			}
		}

		// Step 4: Test connection
		const testResult = await this.testConnection();

		if (testResult.success) {
			window.showInformationMessage(`✅ Step 4: Connection test successful! (${testResult.latency}ms)`);
		} else {
			window.showErrorMessage(`❌ Step 4: Connection test failed: ${testResult.error}`);
			return;
		}

		// Step 5: Complete
		window.showInformationMessage(
			'🎉 Setup Complete! Ollama Code is ready to use. Press Ctrl+Alt+I to open the chat panel.'
		);
	}

	/**
	 * Check if Ollama is installed
	 */
	private async checkOllamaInstalled(): Promise<boolean> {
		try {
			const response = await fetch(`${this.ollamaEndpoint}/api/version`);
			return response.ok;
		} catch {
			// Try to start Ollama
			try {
				await execAsync('ollama --version');
				// Ollama is installed, try to start it
				exec('ollama serve', (error) => {
					if (!error) {
						this.logService.info('Started Ollama service');
					}
				});
				// Wait a bit for it to start
				await new Promise(resolve => setTimeout(resolve, 2000));

				// Check again
				const response = await fetch(`${this.ollamaEndpoint}/api/version`);
				return response.ok;
			} catch {
				return false;
			}
		}
	}

	/**
	 * Test connection to Ollama
	 */
	private async testConnection(): Promise<{ success: boolean; latency?: number; error?: string }> {
		const startTime = Date.now();

		try {
			const response = await fetch(`${this.ollamaEndpoint}/api/tags`);

			if (!response.ok) {
				return { success: false, error: `HTTP ${response.status}` };
			}

			const latency = Date.now() - startTime;
			return { success: true, latency };

		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Restart Ollama service
	 */
	private async restartOllama(): Promise<void> {
		try {
			// Try to restart Ollama
			await execAsync('ollama stop');
			await new Promise(resolve => setTimeout(resolve, 1000));
			exec('ollama serve', (error) => {
				if (!error) {
					window.showInformationMessage('Ollama service restarted successfully');
				} else {
					window.showErrorMessage(`Failed to restart Ollama: ${error.message}`);
				}
			});
		} catch (error: any) {
			window.showErrorMessage(`Failed to restart Ollama: ${error.message}`);
		}
	}

	/**
	 * Get available models from Ollama
	 */
	private async getAvailableModels(): Promise<OllamaModel[]> {
		try {
			const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
			const data = await response.json();
			return data.models || [];
		} catch (error) {
			this.logService.error('Failed to get Ollama models', error);
			return [];
		}
	}

	/**
	 * Set active model
	 */
	private async setActiveModel(modelName: string): Promise<void> {
		// Store in configuration or memory
		this.currentModel = modelName;
		// Trigger model change event if needed
		commands.executeCommand('ollama.code.modelChanged', modelName);
	}

	/**
	 * Format file size
	 */
	private formatSize(sizeStr: string): string {
		const size = parseInt(sizeStr);
		if (isNaN(size)) return sizeStr;

		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		let unitIndex = 0;
		let formattedSize = size;

		while (formattedSize >= 1024 && unitIndex < units.length - 1) {
			formattedSize /= 1024;
			unitIndex++;
		}

		return `${formattedSize.toFixed(1)} ${units[unitIndex]}`;
	}
}