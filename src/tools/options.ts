/**
 * 期权数据相关 Tools
 * 包含指数期权、ETF 期权、商品期权和中金所期权数据
 */

import type { StockSDK, ETFOptionCate } from 'stock-sdk';
import { z } from 'zod';
import type { Tool, ToolHandler } from './types.js';

// ==================== Schema 定义 ====================

const IndexOptionSpotSchema = z.object({
  product: z.enum(['ho', 'io', 'mo']).describe('期权品种: ho=上证50ETF, io=沪深300, mo=中证1000'),
  contract: z.string().describe('合约月份，如 "io2504"'),
});

const IndexOptionKlineSchema = z.object({
  symbol: z.string().describe('期权合约代码，如 "io2504C3600"'),
});

const CFFEXOptionQuotesSchema = z.object({
  pageSize: z.number().optional().describe('每页数量'),
});

// SDK 实际接受品种名，但 LLM 更熟悉 ETF 代码，提供别名映射
const ETF_OPTION_CATE_ENUM = ['50ETF', '300ETF', '500ETF', '科创50', '科创板50'] as const;
const ETF_OPTION_CATE_DESC = 'ETF 期权品种: 50ETF, 300ETF, 500ETF, 科创50, 科创板50';

const ETFOptionMonthsSchema = z.object({
  cate: z.enum(ETF_OPTION_CATE_ENUM).describe(ETF_OPTION_CATE_DESC),
});

const ETFOptionExpireDaySchema = z.object({
  cate: z.enum(ETF_OPTION_CATE_ENUM).describe(ETF_OPTION_CATE_DESC),
  month: z.string().describe('到期月份，格式 YYYY-MM，如 "2025-04"'),
});

const ETFOptionCodeSchema = z.object({
  code: z.string().describe('期权合约代码'),
});

const CommodityOptionSpotSchema = z.object({
  variety: z.string().describe('商品品种代码，如 "m"（豆粕）'),
  contract: z.string().describe('合约月份，如 "m2409"'),
});

const CommodityOptionKlineSchema = z.object({
  symbol: z.string().describe('商品期权合约代码，如 "m2409C3200"'),
});

const OptionLHBSchema = z.object({
  symbol: z.string().describe('标的代码，如 "510050"、"510300"'),
  date: z.string().describe('日期，格式 YYYY-MM-DD，如 "2025-03-27"'),
});

// ==================== Tool 定义 ====================

export const optionsTools: Tool[] = [
  {
    name: 'get_index_option_spot',
    description: '获取指数期权 T 型报价（认购/认沽），返回各行权价的实时行情',
    inputSchema: {
      type: 'object',
      properties: {
        product: { type: 'string', enum: ['ho', 'io', 'mo'], description: '期权品种: ho=上证50ETF, io=沪深300, mo=中证1000' },
        contract: { type: 'string', description: '合约月份，如 "io2504"' },
      },
      required: ['product', 'contract'],
    },
    annotations: { title: '指数期权报价', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_index_option_kline',
    description: '获取指数期权合约日 K 线数据',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '期权合约代码，如 "io2504C3600"' },
      },
      required: ['symbol'],
    },
    annotations: { title: '指数期权 K 线', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_cffex_option_quotes',
    description: '获取中金所期权实时行情列表（股指期权），包含最新价、涨跌、持仓等',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: { type: 'number', description: '每页数量' },
      },
    },
    annotations: { title: '中金所期权行情', readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'get_etf_option_months',
    description: '获取 ETF 期权可用合约月份列表',
    inputSchema: {
      type: 'object',
      properties: {
        cate: { type: 'string', enum: ETF_OPTION_CATE_ENUM as unknown as string[], description: ETF_OPTION_CATE_DESC },
      },
      required: ['cate'],
    },
    annotations: { title: 'ETF 期权月份', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_etf_option_expire_day',
    description: '获取 ETF 期权到期日信息（到期日、剩余天数等）',
    inputSchema: {
      type: 'object',
      properties: {
        cate: { type: 'string', enum: ETF_OPTION_CATE_ENUM as unknown as string[], description: ETF_OPTION_CATE_DESC },
        month: { type: 'string', description: '到期月份，格式 YYYY-MM，如 "2025-04"' },
      },
      required: ['cate', 'month'],
    },
    annotations: { title: 'ETF 期权到期日', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_etf_option_minute',
    description: '获取 ETF 期权合约分钟走势数据',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'ETF 期权合约代码' },
      },
      required: ['code'],
    },
    annotations: { title: 'ETF 期权分时', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_etf_option_daily_kline',
    description: '获取 ETF 期权合约日 K 线数据',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'ETF 期权合约代码' },
      },
      required: ['code'],
    },
    annotations: { title: 'ETF 期权日 K 线', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_commodity_option_spot',
    description: '获取商品期权 T 型报价（认购/认沽），返回各行权价的实时行情',
    inputSchema: {
      type: 'object',
      properties: {
        variety: { type: 'string', description: '商品品种代码，如 "m"（豆粕）' },
        contract: { type: 'string', description: '合约月份，如 "m2409"' },
      },
      required: ['variety', 'contract'],
    },
    annotations: { title: '商品期权报价', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_commodity_option_kline',
    description: '获取商品期权合约日 K 线数据',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '商品期权合约代码，如 "m2409C3200"' },
      },
      required: ['symbol'],
    },
    annotations: { title: '商品期权 K 线', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_option_lhb',
    description: '获取期权龙虎榜数据，返回各席位的买卖量和持仓排名',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '标的代码，如 "510050"、"510300"' },
        date: { type: 'string', description: '日期，格式 YYYY-MM-DD，如 "2025-03-27"' },
      },
      required: ['symbol', 'date'],
    },
    annotations: { title: '期权龙虎榜', readOnlyHint: true, openWorldHint: false },
  },
];

// ==================== Handler 实现 ====================

export function createOptionsHandlers(sdk: StockSDK): Record<string, ToolHandler> {
  return {
    get_index_option_spot: async (args) => {
      const { product, contract } = IndexOptionSpotSchema.parse(args);
      return await sdk.getIndexOptionSpot(product, contract);
    },

    get_index_option_kline: async (args) => {
      const { symbol } = IndexOptionKlineSchema.parse(args);
      const data = await sdk.getIndexOptionKline(symbol);
      return { total: data.length, data };
    },

    get_cffex_option_quotes: async (args) => {
      const { pageSize } = CFFEXOptionQuotesSchema.parse(args);
      const data = await sdk.getCFFEXOptionQuotes({ pageSize });
      return { total: data.length, data };
    },

    get_etf_option_months: async (args) => {
      const { cate } = ETFOptionMonthsSchema.parse(args);
      return await sdk.getETFOptionMonths(cate as ETFOptionCate);
    },

    get_etf_option_expire_day: async (args) => {
      const { cate, month } = ETFOptionExpireDaySchema.parse(args);
      return await sdk.getETFOptionExpireDay(cate as ETFOptionCate, month);
    },

    get_etf_option_minute: async (args) => {
      const { code } = ETFOptionCodeSchema.parse(args);
      const data = await sdk.getETFOptionMinute(code);
      return { total: data.length, data };
    },

    get_etf_option_daily_kline: async (args) => {
      const { code } = ETFOptionCodeSchema.parse(args);
      const data = await sdk.getETFOptionDailyKline(code);
      return { total: data.length, data };
    },

    get_commodity_option_spot: async (args) => {
      const { variety, contract } = CommodityOptionSpotSchema.parse(args);
      return await sdk.getCommodityOptionSpot(variety, contract);
    },

    get_commodity_option_kline: async (args) => {
      const { symbol } = CommodityOptionKlineSchema.parse(args);
      const data = await sdk.getCommodityOptionKline(symbol);
      return { total: data.length, data };
    },

    get_option_lhb: async (args) => {
      const { symbol, date } = OptionLHBSchema.parse(args);
      const data = await sdk.getOptionLHB(symbol, date);
      return { total: data.length, data };
    },
  };
}
