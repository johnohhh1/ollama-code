/*---------------------------------------------------------------------------------------------
 *  Copyright (c) John Olenski (Johnohhh1.dev). All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { commands } from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';

/**
 * Simplified authentication contribution for Ollama Code
 * Since Ollama runs locally, no authentication is needed
 */
export class OllamaAuthenticationContrib extends Disposable {
	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ILogService private readonly _logService: ILogService
	) {
		super();
		this.initialize();
	}

	private initialize() {
		// Register a simple status command to verify Ollama connection
		this._register(commands.registerCommand('ollama.code.checkStatus', async () => {
			try {
				const response = await fetch('http://localhost:11434/api/tags');
				if (response.ok) {
					const data = await response.json();
					this._logService.info(`Ollama Code: Connected to Ollama. Available models: ${data.models?.length || 0}`);
					commands.executeCommand('workbench.action.showInformationMessage',
						`Connected to Ollama. ${data.models?.length || 0} models available.`);
				} else {
					throw new Error(`HTTP ${response.status}`);
				}
			} catch (error) {
				this._logService.error('Ollama Code: Failed to connect to Ollama', error);
				commands.executeCommand('workbench.action.showErrorMessage',
					'Failed to connect to Ollama. Please ensure Ollama is running on localhost:11434');
			}
		}));

		// Register switch model command
		this._register(commands.registerCommand('ollama.code.switchModel', async () => {
			try {
				const response = await fetch('http://localhost:11434/api/tags');
				if (response.ok) {
					const data = await response.json();
					if (data.models && data.models.length > 0) {
						const modelNames = data.models.map((m: any) => m.name);
						const selected = await commands.executeCommand('workbench.action.quickOpen');
						// Note: In a full implementation, we'd show a quick pick with model options
						this._logService.info(`Ollama Code: Model switching UI requested`);
					} else {
						commands.executeCommand('workbench.action.showWarningMessage',
							'No models found. Please pull a model using: ollama pull qwen2.5-coder');
					}
				}
			} catch (error) {
				this._logService.error('Ollama Code: Failed to get models', error);
			}
		}));

		// Register configure command
		this._register(commands.registerCommand('ollama.code.configure', async () => {
			// Open settings for Ollama configuration
			commands.executeCommand('workbench.action.openSettings', 'github.copilot.chat.byok.ollamaEndpoint');
		}));

		// Register refresh models command
		this._register(commands.registerCommand('ollama.code.refreshModels', async () => {
			try {
				const response = await fetch('http://localhost:11434/api/tags');
				if (response.ok) {
					const data = await response.json();
					this._logService.info(`Ollama Code: Refreshed models. Found ${data.models?.length || 0} models`);
					commands.executeCommand('workbench.action.showInformationMessage',
						`Refreshed models. ${data.models?.length || 0} available.`);
				}
			} catch (error) {
				this._logService.error('Ollama Code: Failed to refresh models', error);
			}
		}));

		// Log that we're ready
		this._logService.info('Ollama Code: Authentication contribution initialized (no auth required)');
	}
}