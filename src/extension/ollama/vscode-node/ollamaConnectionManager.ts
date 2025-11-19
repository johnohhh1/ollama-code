/*---------------------------------------------------------------------------------------------
 *  Copyright (c) John Olenski (Johnohhh1.dev). All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter, window } from 'vscode';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { ILogService } from '../../../platform/log/common/logService';
import { exec } from 'child_process';

export enum ConnectionStatus {
	Connected = 'connected',
	Disconnected = 'disconnected',
	Reconnecting = 'reconnecting',
	Starting = 'starting'
}

export interface ConnectionState {
	status: ConnectionStatus;
	lastError?: string;
	reconnectAttempts: number;
	lastSuccessfulConnection?: Date;
	currentModel?: string;
	availableModels: string[];
	latency?: number;
}

/**
 * Manages Ollama connection with automatic reconnection and health monitoring
 * Created by John Olenski (Johnohhh1.dev)
 */
export class OllamaConnectionManager extends Disposable {
	private state: ConnectionState = {
		status: ConnectionStatus.Disconnected,
		reconnectAttempts: 0,
		availableModels: []
	};

	private readonly MAX_RECONNECT_ATTEMPTS = 10;
	private readonly INITIAL_RECONNECT_DELAY = 1000; // 1 second
	private readonly MAX_RECONNECT_DELAY = 30000; // 30 seconds

	private reconnectTimer: NodeJS.Timeout | undefined;
	private healthCheckInterval: NodeJS.Timeout | undefined;
	private ollamaEndpoint: string;

	private _onStatusChanged = new EventEmitter<ConnectionState>();
	public readonly onStatusChanged = this._onStatusChanged.event;

	private _onModelChanged = new EventEmitter<string>();
	public readonly onModelChanged = this._onModelChanged.event;

	constructor(
		@ILogService private readonly logService: ILogService,
		endpoint: string = 'http://localhost:11434'
	) {
		super();
		this.ollamaEndpoint = endpoint;

		// Register disposables
		this._register({ dispose: () => this._onStatusChanged.dispose() });
		this._register({ dispose: () => this._onModelChanged.dispose() });
		this._register({ dispose: () => this.cleanup() });

		// Start connection management
		this.initialize();
	}

	/**
	 * Initialize connection management
	 */
	private async initialize(): Promise<void> {
		this.logService.info('Ollama Connection Manager: Initializing...');

		// Try initial connection
		await this.connect();

		// Start health monitoring
		this.startHealthMonitoring();
	}

	/**
	 * Attempt to connect to Ollama
	 */
	public async connect(): Promise<boolean> {
		this.updateStatus(ConnectionStatus.Starting);

		try {
			// First, check if Ollama is running
			const isRunning = await this.checkOllamaRunning();

			if (!isRunning) {
				// Try to start Ollama
				const started = await this.startOllama();

				if (!started) {
					this.updateStatus(ConnectionStatus.Disconnected, 'Ollama is not installed or cannot be started');
					this.scheduleReconnect();
					return false;
				}
			}

			// Test connection
			const startTime = Date.now();
			const response = await fetch(`${this.ollamaEndpoint}/api/tags`, {
				signal: AbortSignal.timeout(5000) // 5 second timeout
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const data = await response.json();
			const latency = Date.now() - startTime;

			// Update state with connection info
			this.state = {
				...this.state,
				status: ConnectionStatus.Connected,
				reconnectAttempts: 0,
				lastSuccessfulConnection: new Date(),
				availableModels: data.models?.map((m: any) => m.name) || [],
				latency,
				lastError: undefined
			};

			this._onStatusChanged.fire(this.state);

			// Success notification only if recovering from disconnect
			if (this.state.reconnectAttempts > 0) {
				window.showInformationMessage('Ollama reconnected successfully!');
			}

			this.logService.info(`Ollama connected: ${data.models?.length || 0} models available (${latency}ms)`);
			return true;

		} catch (error: any) {
			const errorMessage = error.message || 'Unknown error';
			this.updateStatus(ConnectionStatus.Disconnected, errorMessage);

			this.logService.error('Ollama connection failed:', error);

			// Schedule reconnection
			this.scheduleReconnect();
			return false;
		}
	}

	/**
	 * Check if Ollama process is running
	 */
	private async checkOllamaRunning(): Promise<boolean> {
		try {
			const response = await fetch(`${this.ollamaEndpoint}/api/version`, {
				signal: AbortSignal.timeout(2000)
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	/**
	 * Attempt to start Ollama service
	 */
	private async startOllama(): Promise<boolean> {
		return new Promise((resolve) => {
			this.logService.info('Attempting to start Ollama service...');

			// Check if Ollama is installed
			exec('ollama --version', async (error) => {
				if (error) {
					// Ollama not installed
					this.logService.error('Ollama is not installed');
					resolve(false);
					return;
				}

				// Start Ollama in background
				const ollamaProcess = exec('ollama serve', (error) => {
					if (error && !error.message.includes('address already in use')) {
						this.logService.error('Failed to start Ollama:', error);
					}
				});

				// Detach the process so it continues running
				if (ollamaProcess.pid) {
					ollamaProcess.unref();
				}

				// Wait for Ollama to start (with timeout)
				let attempts = 0;
				const maxAttempts = 10;

				const checkStarted = setInterval(async () => {
					attempts++;

					const isRunning = await this.checkOllamaRunning();

					if (isRunning) {
						clearInterval(checkStarted);
						this.logService.info('Ollama service started successfully');
						window.showInformationMessage('Started Ollama service');
						resolve(true);
					} else if (attempts >= maxAttempts) {
						clearInterval(checkStarted);
						this.logService.error('Timeout waiting for Ollama to start');
						resolve(false);
					}
				}, 500);
			});
		});
	}

	/**
	 * Schedule reconnection attempt
	 */
	private scheduleReconnect(): void {
		if (this.state.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
			this.logService.error('Max reconnection attempts reached');
			window.showErrorMessage(
				'Unable to connect to Ollama after multiple attempts. Please ensure Ollama is running.',
				'Retry',
				'Open Settings'
			).then(action => {
				if (action === 'Retry') {
					this.state.reconnectAttempts = 0;
					this.connect();
				} else if (action === 'Open Settings') {
					window.showTextDocument(window.activeTextEditor?.document ||
						window.visibleTextEditors[0]?.document);
				}
			});
			return;
		}

		// Calculate backoff delay
		const delay = Math.min(
			this.INITIAL_RECONNECT_DELAY * Math.pow(2, this.state.reconnectAttempts),
			this.MAX_RECONNECT_DELAY
		);

		this.state.reconnectAttempts++;
		this.updateStatus(ConnectionStatus.Reconnecting, `Reconnecting in ${delay / 1000}s...`);

		this.logService.info(`Scheduling reconnect attempt ${this.state.reconnectAttempts} in ${delay}ms`);

		// Clear existing timer
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		this.reconnectTimer = setTimeout(() => {
			this.connect();
		}, delay);
	}

	/**
	 * Start health monitoring
	 */
	private startHealthMonitoring(): void {
		// Check health every 10 seconds
		this.healthCheckInterval = setInterval(async () => {
			if (this.state.status === ConnectionStatus.Connected) {
				try {
					const startTime = Date.now();
					const response = await fetch(`${this.ollamaEndpoint}/api/version`, {
						signal: AbortSignal.timeout(3000)
					});

					if (!response.ok) {
						throw new Error(`Health check failed: HTTP ${response.status}`);
					}

					// Update latency
					this.state.latency = Date.now() - startTime;

					// Check if latency is too high
					if (this.state.latency > 1000) {
						this.logService.warn(`High latency detected: ${this.state.latency}ms`);
					}

				} catch (error: any) {
					this.logService.error('Health check failed:', error);

					// Connection lost
					this.updateStatus(ConnectionStatus.Disconnected, 'Connection lost');
					this.scheduleReconnect();
				}
			}
		}, 10000);
	}

	/**
	 * Update connection status
	 */
	private updateStatus(status: ConnectionStatus, error?: string): void {
		this.state = {
			...this.state,
			status,
			lastError: error
		};

		this._onStatusChanged.fire(this.state);
	}

	/**
	 * Switch to a different model
	 */
	public async switchModel(modelName: string): Promise<boolean> {
		if (this.state.status !== ConnectionStatus.Connected) {
			window.showErrorMessage('Cannot switch model: Not connected to Ollama');
			return false;
		}

		if (!this.state.availableModels.includes(modelName)) {
			window.showErrorMessage(`Model ${modelName} is not available`);
			return false;
		}

		try {
			// Test model by generating a simple response
			const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: modelName,
					prompt: 'test',
					stream: false,
					options: {
						num_predict: 1 // Generate only 1 token to test
					}
				}),
				signal: AbortSignal.timeout(10000)
			});

			if (!response.ok) {
				throw new Error(`Failed to switch model: HTTP ${response.status}`);
			}

			this.state.currentModel = modelName;
			this._onModelChanged.fire(modelName);

			window.showInformationMessage(`Switched to model: ${modelName}`);
			return true;

		} catch (error: any) {
			window.showErrorMessage(`Failed to switch model: ${error.message}`);
			return false;
		}
	}

	/**
	 * Get current connection state
	 */
	public getState(): ConnectionState {
		return { ...this.state };
	}

	/**
	 * Force reconnection
	 */
	public async reconnect(): Promise<boolean> {
		this.state.reconnectAttempts = 0;

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		return this.connect();
	}

	/**
	 * Cleanup resources
	 */
	private cleanup(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}
	}

	/**
	 * Update endpoint
	 */
	public updateEndpoint(endpoint: string): void {
		this.ollamaEndpoint = endpoint;
		this.reconnect();
	}
}