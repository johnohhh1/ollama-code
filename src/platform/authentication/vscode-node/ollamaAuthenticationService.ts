/*---------------------------------------------------------------------------------------------
 *  Copyright (c) John Olenski (Johnohhh1.dev). All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthenticationGetSessionOptions, AuthenticationSession } from 'vscode';
import { IConfigurationService } from '../../configuration/common/configurationService';
import { ILogService } from '../../log/common/logService';
import { BaseAuthenticationService } from '../common/authentication';
import { ICopilotTokenManager } from '../common/copilotTokenManager';
import { ICopilotTokenStore } from '../common/copilotTokenStore';
import { OllamaStubTokenManager } from './ollamaStubTokenManager';

/**
 * Simplified authentication service for Ollama Code
 * This service bypasses GitHub authentication and provides stub sessions
 */
export class OllamaAuthenticationService extends BaseAuthenticationService {

	constructor(
		@IConfigurationService configurationService: IConfigurationService,
		@ILogService logService: ILogService,
		@ICopilotTokenStore tokenStore: ICopilotTokenStore,
		@ICopilotTokenManager tokenManager: ICopilotTokenManager
	) {
		// Use our stub token manager instead of the real one
		const stubTokenManager = new OllamaStubTokenManager(logService, null as any);
		super(logService, tokenStore, stubTokenManager as any, configurationService);

		// Initialize immediately since no auth is needed
		void this._handleAuthChangeEvent();
		this._logService.info('Ollama Code: Authentication service initialized (no GitHub auth required)');
	}

	/**
	 * Returns a stub GitHub session for compatibility
	 * Ollama doesn't need GitHub auth, so we return a dummy session
	 */
	async getAnyGitHubSession(_options?: AuthenticationGetSessionOptions): Promise<AuthenticationSession | undefined> {
		const stubSession: AuthenticationSession = {
			id: 'ollama-stub-session',
			accessToken: 'ollama-local-token',
			account: {
				id: 'ollama-user',
				label: 'Ollama Local User'
			},
			scopes: ['user:email']
		};
		this._anyGitHubSession = stubSession;
		return stubSession;
	}

	/**
	 * Returns the same stub session for permissive requests
	 */
	async getPermissiveGitHubSession(_options: AuthenticationGetSessionOptions): Promise<AuthenticationSession | undefined> {
		const stubSession = await this.getAnyGitHubSession();
		this._permissiveGitHubSession = stubSession;
		return stubSession;
	}

	/**
	 * No ADO session needed for Ollama
	 */
	protected async getAnyAdoSession(_options?: AuthenticationGetSessionOptions): Promise<AuthenticationSession | undefined> {
		return undefined;
	}

	/**
	 * No ADO access token needed for Ollama
	 */
	async getAdoAccessTokenBase64(_options?: AuthenticationGetSessionOptions): Promise<string | undefined> {
		return undefined;
	}

	/**
	 * Override to always indicate we're authenticated
	 */
	get isAuthenticated(): boolean {
		return true;
	}

	/**
	 * Override to always indicate chat is enabled
	 */
	get isChatEnabled(): boolean {
		return true;
	}
}