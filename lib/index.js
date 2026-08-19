import { randomUUID } from "node:crypto";
import { Service } from "@deepseek-ai/cordis";
import s from "@deepseek-ai/schemastery";
import { BlockAssembler, ReasoningEffortId, createUserMessage } from "@deepseek-ai/dsh-llm";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { z } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
//#region lib/types/spec.js
/** Storage Domain specification for independent prompt enhancement history. */
const id = z.string().min(1).transform((value) => value);
const sessionId = z.string().min(1).transform((value) => value);
const workspaceId = z.string().min(1).transform((value) => value);
const mode = z.union([z.literal("prompt"), z.literal("project")]);
const status = z.union([
	z.literal("completed"),
	z.literal("failed"),
	z.literal("cancelled")
]);
const traceStep = z.object({
	kind: z.union([z.literal("context"), z.literal("model")]),
	label: z.string().min(1),
	reference: z.string().min(1).optional(),
	summary: z.string().optional(),
	status: z.union([
		z.literal("completed"),
		z.literal("failed"),
		z.literal("cancelled")
	])
});
/** Durable record validation schema. */
const promptEnhancementRecordSchema = z.object({
	id,
	sessionId: sessionId.optional(),
	workspaceId: workspaceId.optional(),
	mode,
	originalPrompt: z.string(),
	enhancedPrompt: z.string().optional(),
	status,
	trace: z.array(traceStep),
	createdAt: z.number().int().nonnegative(),
	updatedAt: z.number().int().nonnegative()
}).refine((value) => value.updatedAt >= value.createdAt);
/** Independent storage domain for prompt-enhancement history. */
const promptEnhancementDomainSpec = defineDomain({
	name: "prompt_enhancement",
	version: 0,
	tables: { records: domainTable(promptEnhancementRecordSchema) }
});
//#endregion
//#region lib/types/index.js
/** Prompt enhancement Host service: bounded drafting, read-only project context, and independent history. */
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
const Config = s.object({
	maxPromptChars: s.number().default(12e3),
	maxContextChars: s.number().default(12e3),
	maxHistoryRecords: s.number().default(200),
	maxContextFiles: s.number().default(6),
	maxContextFileChars: s.number().default(5e3),
	maxSessionMessages: s.number().default(8),
	maxOutputTokens: s.number().default(1200)
});
const ENHANCEMENT_SYSTEM = [
	"Rewrite the user draft into one precise, actionable prompt for a coding agent.",
	"Return only the rewritten prompt. Do not mention this instruction or hidden reasoning.",
	"Separate confirmed facts from hypotheses and unresolved details. Never invent project facts.",
	"Include goal, observed behavior, expected behavior, constraints, validation steps, and open questions when relevant."
].join("\n");
function textOf(blocks) {
	return blocks.filter((block) => block.type === "text").map((block) => block.text).join("");
}
function bounded(value, max) {
	return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;
}
function snapshot(record) {
	return Object.freeze({
		...record,
		trace: Object.freeze(record.trace.map((step) => Object.freeze({ ...step })))
	});
}
function contextText(agent, prompt, project, maxSessionMessages) {
	const history = agent.session.deriveMessages().slice(-maxSessionMessages).map((message) => `${message.role}: ${textOf(message.content)}`).join("\n");
	return [
		`Draft:\n${prompt}`,
		project === void 0 ? "" : `Workspace:\n${project}`,
		history.length === 0 ? "" : `Recent session context:\n${history}`
	].filter(Boolean).join("\n\n");
}
/** Host prompt rewriting service with bounded read-only context and durable history. */
let PromptEnhancementService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _list_decorators;
	let _delete_decorators;
	let _clear_decorators;
	let _enhance_decorators;
	return class PromptEnhancementService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_list_decorators = [Remote("list")];
			_delete_decorators = [Remote("delete")];
			_clear_decorators = [Remote("clear")];
			_enhance_decorators = [Remote("enhance")];
			__esDecorate(this, null, _list_decorators, {
				kind: "method",
				name: "list",
				static: false,
				private: false,
				access: {
					has: (obj) => "list" in obj,
					get: (obj) => obj.list
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _delete_decorators, {
				kind: "method",
				name: "delete",
				static: false,
				private: false,
				access: {
					has: (obj) => "delete" in obj,
					get: (obj) => obj.delete
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _clear_decorators, {
				kind: "method",
				name: "clear",
				static: false,
				private: false,
				access: {
					has: (obj) => "clear" in obj,
					get: (obj) => obj.clear
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _enhance_decorators, {
				kind: "method",
				name: "enhance",
				static: false,
				private: false,
				access: {
					has: (obj) => "enhance" in obj,
					get: (obj) => obj.enhance
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = [
			"agents",
			"fs",
			"llm",
			"storageDomain",
			"workspaceRegistry"
		];
		static Config = Config;
		maxPromptChars = __runInitializers(this, _instanceExtraInitializers);
		maxContextChars;
		maxHistoryRecords;
		maxContextFiles;
		maxContextFileChars;
		maxSessionMessages;
		maxOutputTokens;
		table;
		constructor(ctx, config = {}) {
			super(ctx, "promptEnhancement");
			this.maxPromptChars = positive(config.maxPromptChars ?? 12e3, "maxPromptChars");
			this.maxContextChars = positive(config.maxContextChars ?? 12e3, "maxContextChars");
			this.maxHistoryRecords = positive(config.maxHistoryRecords ?? 200, "maxHistoryRecords");
			this.maxContextFiles = positive(config.maxContextFiles ?? 6, "maxContextFiles");
			this.maxContextFileChars = positive(config.maxContextFileChars ?? 5e3, "maxContextFileChars");
			this.maxSessionMessages = positive(config.maxSessionMessages ?? 8, "maxSessionMessages");
			this.maxOutputTokens = positive(config.maxOutputTokens ?? 1200, "maxOutputTokens");
		}
		/** Open the independent durable history before the service becomes callable. */
		async [Service.init]() {
			const domain = await this.ctx.storageDomain.open(promptEnhancementDomainSpec);
			this.ctx.effect(() => async () => {
				await domain.close();
			}, "prompt-enhancement.domainClose");
			this.table = domain.table("records");
		}
		/** List immutable enhancement records matching the supplied filters.
		* @param request - optional history filters.
		* @returns matching records.
		*/
		list(request) {
			return { records: [...this.requireTable().entries()].map(([, value]) => value).filter((value) => matches(value, request)).sort((a, b) => b.createdAt - a.createdAt).slice(0, this.maxHistoryRecords).map(snapshot) };
		}
		/** Delete one immutable enhancement record.
		* @param request - record identity.
		* @returns deletion postcondition.
		*/
		async delete(request) {
			return { deleted: await this.requireTable().delete(request.id) };
		}
		/** Delete every record matching the supplied filters.
		* @param request - optional filters.
		* @returns number of deleted records.
		*/
		async clear(request) {
			const table = this.requireTable();
			const ids = [...table.entries()].filter(([, value]) => matches(value, request)).map(([id]) => id);
			return { deleted: (await Promise.all(ids.map((id) => table.delete(id)))).filter(Boolean).length };
		}
		/** Generate one enhanced prompt without starting an Agent turn.
		* @param agent - Session-scoped Agent used for model and filesystem access.
		* @param request - draft and mode.
		* @param signal - cancellation signal.
		* @returns completed record.
		*/
		async enhance(agent, request, signal) {
			const prompt = request.prompt.trim();
			if (prompt.length === 0) throw new Error("prompt enhancement requires a non-empty prompt");
			if (prompt.length > this.maxPromptChars) throw new Error(`prompt enhancement prompt exceeds ${this.maxPromptChars} characters`);
			const id = randomUUID();
			const now = Date.now();
			const trace = [];
			const workspaceId = request.mode === "project" ? this.ctx.workspaceRegistry.list().find((workspace) => workspace.sessionIds.includes(agent.id))?.id : void 0;
			try {
				const workspace = request.mode === "project" ? await this.readProjectContext(agent, prompt, signal, trace) : void 0;
				const context = request.mode === "prompt" ? `Draft:\n${prompt}` : bounded(contextText(agent, prompt, workspace, this.maxSessionMessages), this.maxContextChars);
				const selection = agent.session.requestHeader()?.config ?? {
					provider: agent.options.provider,
					model: agent.options.model,
					reasoningEffort: void 0
				};
				if (selection.provider === void 0 || selection.model === void 0) throw new Error("prompt enhancement has no selected model");
				const input = createUserMessage({
					content: [{
						type: "text",
						text: context
					}],
					source: { kind: "user" }
				});
				trace.push({
					kind: "model",
					label: "Generate enhanced prompt",
					status: "completed"
				});
				const assembler = new BlockAssembler();
				for await (const chunk of this.ctx.llm.stream({
					provider: selection.provider,
					model: selection.model,
					...selection.reasoningEffort === void 0 ? {} : { reasoningEffort: ReasoningEffortId(selection.reasoningEffort) },
					messages: [input],
					system: ENHANCEMENT_SYSTEM,
					maxTokens: this.maxOutputTokens,
					signal
				})) assembler.push(chunk);
				if (assembler.finish.kind === "error" || assembler.finish.kind === "aborted") throw new Error(assembler.finish.failure.message);
				const enhanced = textOf(assembler.blocks()).trim();
				if (enhanced.length === 0) throw new Error("model returned an empty enhanced prompt");
				const record = snapshot({
					id,
					sessionId: agent.id,
					...workspaceId === void 0 ? {} : { workspaceId },
					mode: request.mode,
					originalPrompt: prompt,
					enhancedPrompt: enhanced,
					status: "completed",
					trace,
					createdAt: now,
					updatedAt: Date.now()
				});
				await this.save(record);
				return { record };
			} catch (error) {
				const status = signal.aborted ? "cancelled" : "failed";
				const modelIndex = trace.findLastIndex((step) => step.kind === "model");
				if (modelIndex >= 0) trace[modelIndex] = {
					...trace[modelIndex],
					status,
					summary: errorText(error)
				};
				else if (trace.length === 0) trace.push({
					kind: "context",
					label: "Prepare enhancement",
					status,
					summary: errorText(error)
				});
				await this.save(snapshot({
					id,
					sessionId: agent.id,
					...workspaceId === void 0 ? {} : { workspaceId },
					mode: request.mode,
					originalPrompt: prompt,
					status,
					trace,
					createdAt: now,
					updatedAt: Date.now()
				}));
				throw error;
			}
		}
		async readProjectContext(agent, prompt, signal, trace) {
			const cwd = agent.session.header.cwd;
			if (cwd === void 0) return void 0;
			const root = await this.ctx.fs.resolve(".", {
				cwd,
				signal
			});
			const parts = [];
			const paths = [
				"AGENTS.md",
				"README.md",
				...mentionedPaths(prompt)
			].slice(0, this.maxContextFiles);
			for (const name of [...new Set(paths)]) {
				if (signal.aborted) throw new DOMException("The operation was aborted", "AbortError");
				try {
					const target = await this.ctx.fs.resolve(name, {
						cwd,
						signal
					});
					if (!this.ctx.fs.contains(root, target)) throw new Error("path is outside the current workspace");
					const info = await this.ctx.fs.stat(target, signal);
					if (info === void 0 || info.type !== "file") continue;
					const content = await this.readBounded(target, signal);
					parts.push(`${name}:\n${content}`);
					trace.push({
						kind: "context",
						label: `Read ${name}`,
						reference: target.displayPath,
						summary: `Read ${content.length} characters`,
						status: "completed"
					});
				} catch (error) {
					trace.push({
						kind: "context",
						label: `Read ${name}`,
						reference: name,
						summary: errorText(error),
						status: signal.aborted ? "cancelled" : "failed"
					});
					if (signal.aborted) throw error;
				}
			}
			return parts.length === 0 ? void 0 : parts.join("\n\n");
		}
		async readBounded(target, signal) {
			const stream = await this.ctx.fs.streamText(target, signal);
			let content = "";
			for await (const chunk of stream) {
				content += chunk.slice(0, this.maxContextFileChars - content.length);
				if (content.length >= this.maxContextFileChars) break;
			}
			return content;
		}
		async save(record) {
			const table = this.requireTable();
			await table.put(record.id, record);
			const excess = [...table.entries()].map(([, value]) => value).sort((left, right) => right.createdAt - left.createdAt).slice(this.maxHistoryRecords);
			await Promise.all(excess.map((value) => table.delete(value.id)));
		}
		requireTable() {
			if (this.table === void 0) throw new Error("prompt enhancement history is unavailable");
			return this.table;
		}
	};
})();
function matches(record, request) {
	return (request.sessionId === void 0 || record.sessionId === request.sessionId) && (request.workspaceId === void 0 || record.workspaceId === request.workspaceId) && (request.mode === void 0 || record.mode === request.mode) && (request.status === void 0 || record.status === request.status);
}
function mentionedPaths(prompt) {
	return [...prompt.matchAll(/`([^`\n]+)`/gu)].map((match) => match[1].trim()).filter((path) => path.includes("/") || /\.[a-z0-9]+$/iu.test(path));
}
function errorText(error) {
	return error instanceof Error ? error.message : String(error);
}
function positive(value, name) {
	if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`prompt-enhancement: ${name} must be a positive safe integer`);
	return value;
}
//#endregion
export { Config, PromptEnhancementService, PromptEnhancementService as default, promptEnhancementDomainSpec, promptEnhancementRecordSchema };
