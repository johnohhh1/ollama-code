/*---------------------------------------------------------------------------------------------
 *  Copyright (c) John Olenski (Johnohhh1.dev). All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createServiceIdentifier } from '../../../util/common/services';
import { IDisposable } from '../../../util/vs/base/common/lifecycle';
import { IConversationOptions } from './conversationOptions';

export const IChatAgentService = createServiceIdentifier<IChatAgentService>('IChatAgentService');
export interface IChatAgentService {
	readonly _serviceBrand: undefined;
	register(options: IConversationOptions): IDisposable;
}

export const defaultAgentName = 'default';

/** @deprecated  this is now `editingSessionAgentEditorName` */
export const editorAgentName = 'editor';
export const workspaceAgentName = 'workspace';
export const vscodeAgentName = 'vscode';
export const terminalAgentName = 'terminal';
export const editingSessionAgentName = 'editingSession';
export const editingSessionAgent2Name = 'editingSession2';
export const editingSessionAgentEditorName = 'editingSessionEditor';
export const notebookEditorAgentName = 'notebookEditorAgent';
export const editsAgentName = 'editsAgent';

// OLLAMA CODE: Changed participant ID prefix from 'github.copilot.' to 'ollama.code.'
export const CHAT_PARTICIPANT_ID_PREFIX = 'ollama.code.';
export function getChatParticipantIdFromName(name: string): string {
	return `${CHAT_PARTICIPANT_ID_PREFIX}${name}`;
}

export function getChatParticipantNameFromId(id: string): string {
	return id.replace(/^ollama\.code\./, '');
}
