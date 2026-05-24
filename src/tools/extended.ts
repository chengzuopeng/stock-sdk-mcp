/**
 * 扩展功能 Tools
 * 包含资金流向、盘口大单、交易日历、分红详情等
 */

import type { StockSDK } from 'stock-sdk';
import { z } from 'zod';
import type { Tool, ToolHandler } from './types.js';

// ==================== Schema 定义 ====================

const CodesSchema = z.object({
  codes: z.array(z.string()).describe('股票代码数组，如 ["sz000858", "sh600519"]'),
});

const SymbolSchema = z.object({
  symbol: z.string().describe('股票代码，如 "600519" 或 "sh600519"'),
});

// ==================== Tool 定义 ====================

export const extendedTools: Tool[] = [
  {
    name: 'get_fund_flow',
    description: '获取股票资金流向，返回主力/散户的流入流出金额和净流入占比',
    inputSchema: {
      type: 'object',
      properties: {
        codes: { type: 'array', items: { type: 'string' }, description: '股票代码数组，如 ["sz000858", "sh600519"]' },
      },
      required: ['codes'],
    },
    annotations: { title: '资金流向', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_panel_large_order',
    description: '获取盘口大单占比，返回买盘/卖盘的大单和小单占比',
    inputSchema: {
      type: 'object',
      properties: {
        codes: { type: 'array', items: { type: 'string' }, description: '股票代码数组，如 ["sz000858", "sh600519"]' },
      },
      required: ['codes'],
    },
    annotations: { title: '盘口大单', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_trading_calendar',
    description: '获取 A 股交易日历，返回从 1990 年至今的所有交易日期列表',
    inputSchema: { type: 'object', properties: {} },
    annotations: { title: '交易日历', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_dividend_detail',
    description: '获取股票分红派送详情，包含现金分红、送转股份、除权日、派息日等 20+ 维度信息',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '股票代码，如 "600519" 或 "sh600519"' },
      },
      required: ['symbol'],
    },
    annotations: { title: '分红详情', readOnlyHint: true, openWorldHint: false },
  },
];

// ==================== Handler 实现 ====================

export function createExtendedHandlers(
  sdk: StockSDK
): Record<string, ToolHandler> {
  return {
    get_fund_flow: async (args) => {
      const { codes } = CodesSchema.parse(args);
      return await sdk.getFundFlow(codes);
    },

    get_panel_large_order: async (args) => {
      const { codes } = CodesSchema.parse(args);
      return await sdk.getPanelLargeOrder(codes);
    },

    get_trading_calendar: async () => {
      const calendar = await sdk.getTradingCalendar();
      return {
        total: calendar.length,
        startDate: calendar.length > 0 ? calendar[0] : null,
        endDate: calendar.length > 0 ? calendar[calendar.length - 1] : null,
        dates: calendar,
      };
    },

    get_dividend_detail: async (args) => {
      const { symbol } = SymbolSchema.parse(args);
      const dividends = await sdk.getDividendDetail(symbol);
      return {
        total: dividends.length,
        data: dividends,
      };
    },
  };
}
