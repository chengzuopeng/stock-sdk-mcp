/**
 * MCP Server 核心逻辑
 */

import { createRequire } from 'node:module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';
import { StockSDK } from 'stock-sdk';
import { getAllTools, createAllHandlers } from './tools/index.js';
import { getAllResources, getResourceTemplates, createResourceHandlers } from './resources/index.js';
import { getAllPrompts, createPromptHandlers } from './prompts/index.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

/**
 * 创建 MCP Server 实例
 */
export function createServer(): Server {
  const sdk = new StockSDK();

  const server = new Server(
    {
      name: 'stock-sdk-mcp',
      version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  const tools = getAllTools();
  const toolHandlers = createAllHandlers(sdk);

  const resources = getAllResources();
  const resourceTemplates = getResourceTemplates();
  const resourceHandlers = createResourceHandlers(sdk);

  const prompts = getAllPrompts();
  const promptHandlers = createPromptHandlers();

  // ==================== Tools ====================
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const handler = toolHandlers[name];
    if (!handler) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Unknown tool "${name}"`,
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await handler(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // ==================== Resources ====================
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: resources.map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      })),
    };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return { resourceTemplates };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    const handler = resourceHandlers[uri];
    if (handler) {
      try {
        const content = await handler();
        return {
          contents: [{ uri, mimeType: 'application/json', text: content }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read resource "${uri}": ${message}`);
      }
    }

    // Try matching resource templates (dynamic URIs)
    for (const template of resourceTemplates) {
      const templateHandler = resourceHandlers[template.uriTemplate];
      if (templateHandler && matchUriTemplate(template.uriTemplate, uri)) {
        try {
          const content = await templateHandler(uri);
          return {
            contents: [{ uri, mimeType: 'application/json', text: content }],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to read resource "${uri}": ${message}`);
        }
      }
    }

    throw new Error(`Unknown resource: ${uri}`);
  });

  // ==================== Prompts ====================
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request): Promise<GetPromptResult> => {
    const { name, arguments: args } = request.params;
    const handler = promptHandlers[name];
    if (!handler) {
      throw new Error(`Unknown prompt: ${name}`);
    }
    return handler(args ?? {}) as GetPromptResult;
  });

  return server;
}

/**
 * @internal
 * Simple URI template matcher for `{param}` placeholders.
 */
function matchUriTemplate(template: string, uri: string): boolean {
  const regex = new RegExp(
    '^' + template.replace(/\{[^}]+\}/g, '([^/]+)') + '$'
  );
  return regex.test(uri);
}
