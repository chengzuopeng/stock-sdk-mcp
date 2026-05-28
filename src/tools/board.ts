/**
 * 板块数据相关 Tools
 * 包含行业板块和概念板块的列表、行情、成分股、K 线
 */

import type { StockSDK } from 'stock-sdk';
import { z } from 'zod';
import type { Tool, ToolHandler } from './types.js';

// ==================== Schema 定义 ====================

const BoardSymbolSchema = z.object({
  symbol: z.string().describe('板块名称（如"小金属"、"人工智能"）或代码（如"BK1027"、"BK0800"）'),
});

const BoardKlineSchema = z.object({
  symbol: z.string().describe('板块名称或代码'),
  period: z.enum(['daily', 'weekly', 'monthly']).optional().describe('K 线周期: daily=日线, weekly=周线, monthly=月线'),
  adjust: z.enum(['', 'qfq', 'hfq']).optional().describe('复权类型: 空=不复权, qfq=前复权, hfq=后复权'),
  startDate: z.string().optional().describe('开始日期，格式 YYYYMMDD'),
  endDate: z.string().optional().describe('结束日期，格式 YYYYMMDD'),
});

const BoardMinuteKlineSchema = z.object({
  symbol: z.string().describe('板块名称或代码'),
  period: z.enum(['1', '5', '15', '30', '60']).optional().describe('分钟周期: 1, 5, 15, 30, 60'),
});

// ==================== Tool 定义 ====================

export const boardTools: Tool[] = [
  // ==================== 行业板块 ====================
  {
    name: 'get_industry_list',
    description: '获取行业板块名称列表，返回所有行业板块的名称、代码、涨跌幅、领涨股等信息',
    inputSchema: { type: 'object', properties: {} },
    annotations: { title: '行业板块列表', readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'get_industry_spot',
    description: '获取行业板块实时行情，返回板块的详细指标',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '行业板块名称（如"小金属"）或代码（如"BK1027"）' },
      },
      required: ['symbol'],
    },
    annotations: { title: '行业板块行情', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_industry_constituents',
    description: '获取行业板块成分股列表，返回板块内所有股票的实时行情',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '行业板块名称（如"小金属"）或代码（如"BK1027"）' },
      },
      required: ['symbol'],
    },
    annotations: { title: '行业板块成分股', readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'get_industry_kline',
    description: '获取行业板块历史 K 线数据（日/周/月），支持复权',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '行业板块名称或代码' },
        period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'K 线周期: daily=日线(默认), weekly=周线, monthly=月线' },
        adjust: { type: 'string', enum: ['', 'qfq', 'hfq'], description: '复权类型: 空=不复权, qfq=前复权, hfq=后复权' },
        startDate: { type: 'string', description: '开始日期，格式 YYYYMMDD' },
        endDate: { type: 'string', description: '结束日期，格式 YYYYMMDD' },
      },
      required: ['symbol'],
    },
    annotations: { title: '行业板块 K 线', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_industry_minute_kline',
    description: '获取行业板块分钟 K 线/分时数据',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '行业板块名称或代码' },
        period: { type: 'string', enum: ['1', '5', '15', '30', '60'], description: '分钟周期: 1=分时, 5/15/30/60=分钟 K 线' },
      },
      required: ['symbol'],
    },
    annotations: { title: '行业板块分钟 K 线', readOnlyHint: true, openWorldHint: false },
  },
  // ==================== 概念板块 ====================
  {
    name: 'get_concept_list',
    description: '获取概念板块名称列表，返回所有概念板块的名称、代码、涨跌幅、领涨股等信息',
    inputSchema: { type: 'object', properties: {} },
    annotations: { title: '概念板块列表', readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'get_concept_spot',
    description: '获取概念板块实时行情，返回板块的详细指标',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '概念板块名称（如"人工智能"）或代码（如"BK0800"）' },
      },
      required: ['symbol'],
    },
    annotations: { title: '概念板块行情', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_concept_constituents',
    description: '获取概念板块成分股列表，返回板块内所有股票的实时行情',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '概念板块名称（如"人工智能"）或代码（如"BK0800"）' },
      },
      required: ['symbol'],
    },
    annotations: { title: '概念板块成分股', readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'get_concept_kline',
    description: '获取概念板块历史 K 线数据（日/周/月），支持复权',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '概念板块名称或代码' },
        period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'K 线周期: daily=日线(默认), weekly=周线, monthly=月线' },
        adjust: { type: 'string', enum: ['', 'qfq', 'hfq'], description: '复权类型: 空=不复权, qfq=前复权, hfq=后复权' },
        startDate: { type: 'string', description: '开始日期，格式 YYYYMMDD' },
        endDate: { type: 'string', description: '结束日期，格式 YYYYMMDD' },
      },
      required: ['symbol'],
    },
    annotations: { title: '概念板块 K 线', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_concept_minute_kline',
    description: '获取概念板块分钟 K 线/分时数据',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '概念板块名称或代码' },
        period: { type: 'string', enum: ['1', '5', '15', '30', '60'], description: '分钟周期: 1=分时, 5/15/30/60=分钟 K 线' },
      },
      required: ['symbol'],
    },
    annotations: { title: '概念板块分钟 K 线', readOnlyHint: true, openWorldHint: false },
  },
];

function num(v: unknown): number | null {
  if (v == null || v === '' || v === '-') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchGbkHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://q.10jqka.com.cn/',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString('latin1');
}

function decodeGbkText(input: string): string {
  return Buffer.from(input, 'latin1').toString('utf8');
}

async function fetchThsConceptList() {
  const htmlLatin1 = await fetchGbkHtml('https://q.10jqka.com.cn/gn/');
  const html = decodeGbkText(htmlLatin1);
  const m = html.match(/id="gnSection"\s+value='(.+?)'/);
  if (!m) throw new Error('未找到同花顺概念板块隐藏数据 gnSection');
  const data = JSON.parse(m[1]);
  return Object.values(data).map((row: any) => ({
    code: String(row.platecode ?? '').replace(/^88/, 'BK'),
    name: String(row.platename ?? ''),
    changePercent: num(row['199112']),
    mainNetInflow: num(row.zjjlr),
    constituentCount: num(row.zfl),
    source: 'ths_gn_hidden_json',
  }));
}

async function fetchThsIndustryList() {
  const htmlLatin1 = await fetchGbkHtml('https://q.10jqka.com.cn/thshy/');
  const html = decodeGbkText(htmlLatin1);
  const pattern = /<tr>\s*<td>(\d+)<\/td>\s*<td><a[^>]*detail\/code\/(\d+)\/[^>]*>([^<]+)<\/a><\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td><a[^>]*>([^<]+)<\/a><\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>/g;
  const rows = [...html.matchAll(pattern)];
  if (rows.length === 0) throw new Error('未解析到同花顺行业板块表格');
  return rows.map((m) => ({
    rank: num(m[1]),
    code: String(m[2]).replace(/^88/, 'BK'),
    name: m[3],
    changePercent: num(m[4]),
    totalVolume: num(m[5]),
    totalAmount: num(m[6]),
    mainNetInflow: num(m[7]),
    riseCount: num(m[8]),
    fallCount: num(m[9]),
    avgPrice: num(m[10]),
    leadingStock: m[11],
    latest: num(m[12]),
    leadingStockChangePercent: num(m[13]),
    source: 'ths_industry_table',
  }));
}

// ==================== Handler 实现 ====================

export function createBoardHandlers(sdk: StockSDK): Record<string, ToolHandler> {
  return {
    // ==================== 行业板块 ====================
    get_industry_list: async () => {
      const list = await fetchThsIndustryList();
      return { total: list.length, data: list };
    },

    get_industry_spot: async (args) => {
      const { symbol } = BoardSymbolSchema.parse(args);
      return await sdk.getIndustrySpot(symbol);
    },

    get_industry_constituents: async (args) => {
      const { symbol } = BoardSymbolSchema.parse(args);
      const constituents = await sdk.getIndustryConstituents(symbol);
      return { total: constituents.length, data: constituents };
    },

    get_industry_kline: async (args) => {
      const { symbol, period, adjust, startDate, endDate } = BoardKlineSchema.parse(args);
      return await sdk.getIndustryKline(symbol, { period, adjust, startDate, endDate });
    },

    get_industry_minute_kline: async (args) => {
      const { symbol, period } = BoardMinuteKlineSchema.parse(args);
      return await sdk.getIndustryMinuteKline(symbol, { period });
    },

    // ==================== 概念板块 ====================
    get_concept_list: async () => {
      const list = await fetchThsConceptList();
      return { total: list.length, data: list };
    },

    get_concept_spot: async (args) => {
      const { symbol } = BoardSymbolSchema.parse(args);
      return await sdk.getConceptSpot(symbol);
    },

    get_concept_constituents: async (args) => {
      const { symbol } = BoardSymbolSchema.parse(args);
      const constituents = await sdk.getConceptConstituents(symbol);
      return { total: constituents.length, data: constituents };
    },

    get_concept_kline: async (args) => {
      const { symbol, period, adjust, startDate, endDate } = BoardKlineSchema.parse(args);
      return await sdk.getConceptKline(symbol, { period, adjust, startDate, endDate });
    },

    get_concept_minute_kline: async (args) => {
      const { symbol, period } = BoardMinuteKlineSchema.parse(args);
      return await sdk.getConceptMinuteKline(symbol, { period });
    },
  };
}
