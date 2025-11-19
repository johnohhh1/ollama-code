/*---------------------------------------------------------------------------------------------
 *  Copyright (c) John Olenski (Johnohhh1.dev). All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { StatusBarAlignment, StatusBarItem, ThemeColor, window } from 'vscode';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { ILogService } from '../../../platform/log/common/logService';

export interface IOllamaModel {
	name: string;
	size: string;
	modified: string;
}

/**
 * Status bar indicator for Ollama connection and model selection
 * Shows connection status, current model, and provides quick switching
 */
export class OllamaStatusBar extends Disposable {
	private statusBarItem: StatusBarItem;
	private currentModel: string = '';
	private isConnected: boolean = false;
	private responseTime: number = 0;
	private ollamaEndpoint: string;
	private checkInterval: NodeJS.Timer | undefined;

	constructor(
		@ILogService private readonly logService: ILogService,
		endpoint: string = 'http://localhost:11434'
	) {
		super();
		this.ollamaEndpoint = endpoint;

		// Create status bar item
		this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
		this.statusBarItem.command = 'ollama.code.switchModel';
		this._register({ dispose: () => this.statusBarItem.dispose() });

		// Start monitoring
		this.startMonitoring();
		this.statusBarItem.show();
	}

	/**
	 * Start monitoring Ollama connection and status
	 */
	private startMonitoring(): void {
		// Initial check
		this.checkConnection();

		// Check every 5 seconds
		this.checkInterval = setInterval(() => {
			this.checkConnection();
		}, 5000);

		this._register({
			dispose: () => {
				if (this.checkInterval) {
					clearInterval(this.checkInterval);
				}
			}
		});
	}

	/**
	 * Check Ollama connection and get current model info
	 */
	private async checkConnection(): Promise<void> {
		const startTime = Date.now();

		try {
			// Check if Ollama is running
			const response = await fetch(`${this.ollamaEndpoint}/api/tags`);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const data = await response.json();
			this.responseTime = Date.now() - startTime;
			this.isConnected = true;

			// Get list of models
			const models = data.models as IOllamaModel[];

			if (models && models.length > 0) {
				// Use first model as current if not set
				if (!this.currentModel && models.length > 0) {
					this.currentModel = models[0].name;
				}

				this.updateStatusBar(true, models.length);
			} else {
				this.updateStatusBar(true, 0);
			}

		} catch (error) {
			this.isConnected = false;
			this.updateStatusBar(false, 0);
			this.logService.debug(`Ollama connection check failed: ${error}`);
		}
	}

	/**
	 * Update status bar display
	 */
	private updateStatusBar(connected: boolean, modelCount: number): void {
		if (connected) {
			// Show connected status with model info
			const modelDisplay = this.currentModel ? this.currentModel.split(':')[0] : 'No Model';
			const latency = this.responseTime < 100 ? '🟢' : this.responseTime < 500 ? '🟡' : '🔴';

			this.statusBarItem.text = `$(hubot) Ollama: ${modelDisplay} ${latency}`;
			this.statusBarItem.tooltip = `Ollama Connected (${this.responseTime}ms)\n${modelCount} models available\nClick to switch models`;
			this.statusBarItem.backgroundColor = undefined;
			this.statusBarItem.color = undefined;
		} else {
			// Show disconnected status
			this.statusBarItem.text = '$(hubot) Ollama: Disconnected';
			this.statusBarItem.tooltip = 'Ollama is not running\nPlease start Ollama: ollama serve';
			this.statusBarItem.backgroundColor = new ThemeColor('statusBarItem.errorBackground');
			this.statusBarItem.color = new ThemeColor('statusBarItem.errorForeground');
		}
	}

	/**
	 * Set the current model
	 */
	public setCurrentModel(model: string): void {
		this.currentModel = model;
		this.checkConnection();
	}

	/**
	 * Get connection status
	 */
	public getConnectionStatus(): { connected: boolean; latency: number; model: string } {
		return {
			connected: this.isConnected,
			latency: this.responseTime,
			model: this.currentModel
		};
	}
}