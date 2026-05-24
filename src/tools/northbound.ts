/**
 * 北向资金 / 沪深港通 Tools
 * 包含北向实时数据、历史数据、持股排行
 */

import type { StockSDK, NorthboundHoldingRankItem } from 'stock-sdk';
import { z } from 'zod';
import type { Tool, ToolHandler } from './types.js';

// ==================== Schema 定义 ====================

const NorthboundRealtimeSchema = z.object({
  direction: z
    .enum(['north', 'south'])
    .optional()
    .describe('资金方向: north=北向(默认), south=南向'),
});

const NorthboundHistorySchema = z.object({
  scope: z
    .enum(['market', 'stock'])
    .describe('查询维度: market=整体北向/南向历史, stock=个股北向持仓历史'),
  direction: z
    .enum(['north', 'south'])
    .optional()
    .describe('资金方向（scope=market 时使用）: north=北向(默认), south=南向'),
  symbol: z
    .string()
    .optional()
    .describe('股票代码（scope=stock 时必填），如 "600519"'),
  startDate: z.string().optional().describe('起始日期 YYYY-MM-DD'),
  endDate: z.string().optional().describe('结束日期 YYYY-MM-DD'),
});

const NorthboundHoldingRankSchema = z.object({
  market: z
    .enum(['all', 'shanghai', 'shenzhen'])
    .optional()
    .describe('市场: all=全部(默认), shanghai=沪股通, shenzhen=深股通'),
  period: z
    .enum(['today', '3day', '5day', '10day', 'month', 'quarter', 'year'])
    .optional()
    .describe('排名周期: today, 3day, 5day(默认), 10day, month, quarter, year'),
  date: z.string().optional().describe('指定交易日 YYYY-MM-DD（默认最新交易日）'),
  topN: z
    .number()
    .optional()
    .default(100)
    .describe('返回前 N 条（按持股变动排序），默认 100。完整数据约 4-8 万条，避免一次性返回'),
});

// ==================== Tool 定义 ====================

export const northboundTools: Tool[] = [
  {
    name: 'get_northbound_realtime',
    description:
      '获取北向/南向资金实时数据，一次性返回分时流入曲线和沪深港通汇总，用于判断当日外资动向',
    inputSchema: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['north', 'south'],
          description: '资金方向: north=北向(默认), south=南向',
        },
      },
    },
    annotations: { title: '北向资金实时', readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'get_northbound_history',
    description:
      '获取北向资金历史数据，通过 scope 区分：market=整体北向/南向资金历史趋势，stock=个股北向持仓变化历史',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['market', 'stock'],
          description: '查询维度: market=整体北向/南向历史, stock=个股北向持仓历史',
        },
        direction: {
          type: 'string',
          enum: ['north', 'south'],
          description: '资金方向（scope=market 时使用）: north=北向(默认), south=南向',
        },
        symbol: {
          type: 'string',
          description: '股票代码（scope=stock 时必填），如 "600519"',
        },
        startDate: { type: 'string', description: '起始日期 YYYY-MM-DD' },
        endDate: { type: 'string', description: '结束日期 YYYY-MM-DD' },
      },
      required: ['scope'],
    },
    annotations: { title: '北向资金历史', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_northbound_holding_rank',
    description: '获取北向/沪股通/深股通持股个股排行，可按不同周期查看持股变动排名（默认仅返回 TOP 100，避免响应过大）',
    inputSchema: {
      type: 'object',
      properties: {
        market: {
          type: 'string',
          enum: ['all', 'shanghai', 'shenzhen'],
          description: '市场: all=全部(默认), shanghai=沪股通, shenzhen=深股通',
        },
        period: {
          type: 'string',
          enum: ['today', '3day', '5day', '10day', 'month', 'quarter', 'year'],
          description: '排名周期，默认 5day',
        },
        date: { type: 'string', description: '指定交易日 YYYY-MM-DD（默认最新交易日）' },
        topN: {
          type: 'number',
          description: '返回前 N 条（按持股变动排序），默认 100。完整数据约 4-8 万条，避免一次性返回',
        },
      },
    },
    annotations: { title: '北向持股排行', readOnlyHint: true, openWorldHint: true },
  },
];

// ==================== Handler 实现 ====================

export function createNorthboundHandlers(sdk: StockSDK): Record<string, ToolHandler> {
  return {
    get_northbound_realtime: async (args) => {
      const { direction } = NorthboundRealtimeSchema.parse(args);
      const dir = direction ?? 'north';

      const [minute, summary] = await Promise.allSettled([
        sdk.getNorthboundMinute(dir),
        sdk.getNorthboundFlowSummary(),
      ]);

      return {
        minute: {
          status: minute.status,
          data: minute.status === 'fulfilled' ? minute.value : null,
          error: minute.status === 'rejected' ? String(minute.reason) : undefined,
        },
        summary: {
          status: summary.status,
          data: summary.status === 'fulfilled' ? summary.value : null,
          error: summary.status === 'rejected' ? String(summary.reason) : undefined,
        },
      };
    },

    get_northbound_history: async (args) => {
      const { scope, direction, symbol, startDate, endDate } =
        NorthboundHistorySchema.parse(args);

      if (scope === 'market') {
        const data = await sdk.getNorthboundHistory(direction ?? 'north', {
          startDate,
          endDate,
        });
        return { total: data.length, data };
      } else {
        if (!symbol) {
          throw new Error('scope 为 "stock" 时，symbol 必填');
        }
        const data = await sdk.getNorthboundIndividual(symbol, {
          startDate,
          endDate,
        });
        return { total: data.length, data };
      }
    },

    get_northbound_holding_rank: async (args) => {
      const { market, period, date, topN } = NorthboundHoldingRankSchema.parse(args);
      const data = await sdk.getNorthboundHoldingRank({ market, period, date });
      // 按区间增持股数绝对值排序，取 TOP N，避免响应过大（完整数据可能 4-8 万条）
      const sorted = [...data].sort((a: NorthboundHoldingRankItem, b: NorthboundHoldingRankItem) => {
        const va = Math.abs(a.addShares ?? 0);
        const vb = Math.abs(b.addShares ?? 0);
        return vb - va;
      });
      const limit = topN ?? 100;
      return {
        total: data.length,
        topN: limit,
        sortedBy: 'addShares(abs desc)',
        data: sorted.slice(0, limit),
      };
    },
  };
}
