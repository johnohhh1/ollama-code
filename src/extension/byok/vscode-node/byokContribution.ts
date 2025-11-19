/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { commands, LanguageModelChatInformation, lm } from 'vscode';
import { IAuthenticationService } from '../../../platform/authentication/common/authentication';
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { ICAPIClientService } from '../../../platform/endpoint/common/capiClient';
import { IVSCodeExtensionContext } from '../../../platform/extContext/common/extensionContext';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { BYOKModelProvider } from '../../byok/common/byokProvider';
import { IExtensionContribution } from '../../common/contributions';
import { BYOKStorageService, IBYOKStorageService } from './byokStorageService';
import { OllamaLMProvider } from './ollamaProvider';

export class BYOKContrib extends Disposable implements IExtensionContribution {
	public readonly id: string = 'byok-contribution';
	private readonly _byokStorageService: IBYOKStorageService;
	private readonly _providers: Map<string, BYOKModelProvider<LanguageModelChatInformation>> = new Map();
	private _byokProvidersRegistered = false;

	constructor(
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@ICAPIClientService private readonly _capiClientService: ICAPIClientService,
		@IVSCodeExtensionContext extensionContext: IVSCodeExtensionContext,
		@IAuthenticationService authService: IAuthenticationService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) {
		super();
		// OLLAMA CODE: Simplified command for Ollama configuration
		this._register(commands.registerCommand('ollama.code.configure', async () => {
			// For Ollama, we just need to configure the endpoint URL
			const provider = this._providers.get(OllamaLMProvider.providerName.toLowerCase());
			if (provider) {
				await commands.executeCommand('workbench.action.openSettings', '@ext:ollama-code ollama.apiUrl');
			}
		}));

		// OLLAMA CODE: Removed API key management - Ollama doesn't require authentication

		this._byokStorageService = new BYOKStorageService(extensionContext);
		this._authChange(authService, this._instantiationService);

		this._register(authService.onDidAuthenticationChange(() => {
			this._authChange(authService, this._instantiationService);
		}));
	}

	private async _authChange(authService: IAuthenticationService, instantiationService: IInstantiationService) {
		// OLLAMA CODE: Removed BYOK gating - Ollama is always available
		if (!this._byokProvidersRegistered) {
			this._byokProvidersRegistered = true;
			// Only register Ollama provider for Ollama Code
			// Configure endpoint from settings (default to localhost:11434)
			const ollamaEndpoint = this._configurationService.getConfig(ConfigKey.OllamaEndpoint) || 'http://localhost:11434';
			this._providers.set(OllamaLMProvider.providerName.toLowerCase(), instantiationService.createInstance(OllamaLMProvider, ollamaEndpoint, this._byokStorageService));

			// Register Ollama as the only provider
			for (const [providerName, provider] of this._providers) {
				this._store.add(lm.registerLanguageModelChatProvider(providerName, provider));
			}

			this._logService.info('Ollama Code: Registered Ollama provider at ' + ollamaEndpoint);
		}
	}
	private async fetchKnownModelList(fetcherService: IFetcherService): Promise<Record<string, BYOKKnownModels>> {
		const data = await (await fetcherService.fetch('https://main.vscode-cdn.net/extensions/copilotChat.json', { method: "GET" })).json();
		// Use this for testing with changes from a local file. Don't check in
		// const data = JSON.parse((await this._fileSystemService.readFile(URI.file('/Users/roblou/code/vscode-engineering/chat/copilotChat.json'))).toString());
		let knownModels: Record<string, BYOKKnownModels>;
		if (data.version !== 1) {
			this._logService.warn('BYOK: Copilot Chat known models list is not in the expected format. Defaulting to empty list.');
			knownModels = {};
		} else {
			knownModels = data.modelInfo;
		}
		this._logService.info('BYOK: Copilot Chat known models list fetched successfully.');
		return knownModels;
	}
}