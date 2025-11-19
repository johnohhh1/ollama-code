/*---------------------------------------------------------------------------------------------
 *  Copyright (c) John Olenski (Johnohhh1.dev). All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ILogService } from '../../log/common/logService';
import { ITelemetryService } from '../../telemetry/common/telemetry';
import { CopilotToken, ExtendedTokenInfo } from '../common/copilotToken';
import { nowSeconds } from '../common/copilotTokenManager';

/**
 * Stub token manager for Ollama Code that doesn't require authentication
 * This replaces the GitHub authentication with a simple always-succeeding stub
 */
export class OllamaStubTokenManager {
	private _stubToken: ExtendedTokenInfo | undefined;

	constructor(
		@ILogService private readonly _logService: ILogService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService
	) { }

	/**
	 * Returns a stub token that never expires and always succeeds
	 * Ollama doesn't require authentication, so we just return a dummy token
	 */
	async getCopilotToken(_force?: boolean): Promise<CopilotToken> {
		if (!this._stubToken) {
			this._stubToken = this._createStubToken();
			this._logService.info('Ollama Code: Created stub token for local Ollama access');
		}
		return new CopilotToken(this._stubToken);
	}

	/**
	 * Creates a stub token with all necessary fields
	 * This token is compatible with the existing infrastructure but doesn't
	 * actually authenticate against any service
	 */
	private _createStubToken(): ExtendedTokenInfo {
		return {
			kind: 'success',
			token: 'ollama-local-token',
			organization_list: ['local'],
			expires_at: nowSeconds() + 365 * 24 * 60 * 60, // Expires in 1 year
			refresh_in: 365 * 24 * 60 * 60, // Refresh in 1 year
			// All features enabled for local Ollama
			chat_enabled: true,
			code_quote_enabled: true,
			copilotide_access: true,
			individual: true,
			vsc_panel_v2: true,
			copilot_ide_agent_chat_gpt4_small_prompt: true,
			public_code_suggestions: 'block',
			limited_access_mode: false,
			code_completion_enabled: true,
			smp_tier: 'free', // Marking as free tier since it's local
			can_make_pr: true,
			// Scopes - minimal scopes since we don't need GitHub access
			scopes: ['user:email'],
			// Tracking IDs - using local identifiers
			tracking_id: 'ollama-local',
			github_com_user: 'ollama-user',
			// Account info
			enterprise: false,
			enterprise_manager: false,
			business: false,
			byok_enabled: true, // Important: We're using BYOK infrastructure
			// Model selection
			default_model: 'ollama', // Will use Ollama's selected model
			// Feature flags
			chat_jetbrains_enabled: false,
			copilot_slash_commands_enabled: true,
			vsc_panel_v2_actions_dropdown: true,
			chat_enabled_for_organization_member: true,
			extended_chat_models: ['ollama'], // List Ollama as available model
		};
	}

	/**
	 * No-op method for compatibility
	 */
	async checkAndUpdateStatus(): Promise<void> {
		// No status to check for local Ollama
		this._logService.debug('Ollama Code: Status check skipped (local models)');
	}

	/**
	 * Returns stub user info for compatibility
	 */
	async getUserInfo(): Promise<{ id: string; login: string }> {
		return {
			id: 'ollama-local-user',
			login: 'ollama-user'
		};
	}

	/**
	 * Always returns true since Ollama is always available locally
	 */
	async isAuthenticated(): Promise<boolean> {
		return true;
	}
}