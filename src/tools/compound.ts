/**
 * 复合分析 Tools
 * 将多个 SDK 调用组合为一次性分析工具，减少 LLM 调用次数
 */

import type { StockSDK, FullQuote, IndicatorOptions } from 'stock-sdk';
import { z } from 'zod';
import type { Tool, ToolHandler } from './types.js';

// ==================== Schema 定义 ====================

const AnalyzeStockSchema = z.object({
  symbol: z.string().describe('股票代码，如 "sh600519"、"00700"、"AAPL"'),
  market: z.enum(['A', 'HK', 'US']).optional().describe('市场类型，不传则自动识别'),
  period: z.enum(['daily', 'weekly', 'monthly']).optional().describe('K 线周期，默认 daily'),
});

const CompareStocksSchema = z.object({
  symbols: z.array(z.string()).min(2).max(10).describe('股票代码数组（2-10 只），如 ["sh600519", "sh000858"]'),
  period: z.enum(['daily', 'weekly', 'monthly']).optional().describe('K 线周期，默认 daily'),
});

const ScanMarketSchema = z.object({
  market: z
    .enum(['all', 'sh', 'sz', 'bj', 'kc', 'cy'])
    .optional()
    .describe('市场筛选: all=全部, sh=上证, sz=深证, bj=北证, kc=科创板, cy=创业板'),
  minChange: z.number().optional().describe('最低涨跌幅(%)，如 5 表示涨幅 ≥ 5%'),
  maxChange: z.number().optional().describe('最高涨跌幅(%)，如 -5 表示跌幅 ≥ 5%'),
  minVolume: z.number().optional().describe('最低成交量（手）'),
  minAmount: z.number().optional().describe('最低成交额（元）'),
  minTurnover: z.number().optional().describe('最低换手率(%)'),
  maxPE: z.number().optional().describe('最高市盈率'),
  minPE: z.number().optional().describe('最低市盈率（过滤负市盈率可设为 0）'),
  sortBy: z.enum(['changePercent', 'volume', 'amount', 'turnoverRate', 'pe']).optional().describe('排序字段，默认 changePercent'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('排序方向，默认 desc'),
  limit: z.number().optional().describe('返回数量限制，默认 50'),
});

const MarketOverviewSchema = z.object({
  includeHK: z.boolean().optional().describe('是否包含港股指数，默认 false'),
});

const SectorAnalysisSchema = z.object({
  symbol: z.string().describe('板块名称或代码，如 "人工智能"、"BK0800"'),
  type: z.enum(['industry', 'concept']).describe('板块类型: industry=行业, concept=概念'),
  topN: z.number().optional().describe('返回成分股 TOP N，默认 10'),
});

// ==================== Tool 定义 ====================

export const compoundTools: Tool[] = [
  {
    name: 'analyze_stock',
    description:
      '【复合】个股全景分析：一次性返回带指标 K 线（MA/MACD/KDJ/RSI/BOLL）、资金流向、资金流历史趋势、北向持仓历史、分红记录，适合快速全面了解一只股票',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '股票代码，如 "sh600519"、"00700"、"AAPL"' },
        market: { type: 'string', enum: ['A', 'HK', 'US'], description: '市场类型，不传则自动识别' },
        period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'K 线周期，默认 daily' },
      },
      required: ['symbol'],
    },
    annotations: { title: '个股全景分析', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'compare_stocks',
    description:
      '【复合】多股对比分析：一次性返回多只股票的实时行情和近期指标（MA/MACD）的并排对比数据',
    inputSchema: {
      type: 'object',
      properties: {
        symbols: { type: 'array', items: { type: 'string' }, description: '股票代码数组（2-10 只）' },
        period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'K 线周期，默认 daily' },
      },
      required: ['symbols'],
    },
    annotations: { title: '多股对比', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'scan_market',
    description:
      '【复合】条件选股：获取全市场 A 股行情并在服务端过滤，支持涨跌幅、成交量、换手率、市盈率等条件筛选，返回排序后的结果',
    inputSchema: {
      type: 'object',
      properties: {
        market: { type: 'string', enum: ['all', 'sh', 'sz', 'bj', 'kc', 'cy'], description: '市场筛选' },
        minChange: { type: 'number', description: '最低涨跌幅(%)' },
        maxChange: { type: 'number', description: '最高涨跌幅(%)' },
        minVolume: { type: 'number', description: '最低成交量（手）' },
        minAmount: { type: 'number', description: '最低成交额（元）' },
        minTurnover: { type: 'number', description: '最低换手率(%)' },
        maxPE: { type: 'number', description: '最高市盈率' },
        minPE: { type: 'number', description: '最低市盈率' },
        sortBy: { type: 'string', enum: ['changePercent', 'volume', 'amount', 'turnoverRate', 'pe'], description: '排序字段，默认 changePercent' },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], description: '排序方向，默认 desc' },
        limit: { type: 'number', description: '返回数量限制，默认 50' },
      },
    },
    annotations: { title: '条件选股', readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'get_market_overview',
    description:
      '【复合】大盘概览：一次性返回主要指数行情、行业/概念板块 TOP10、涨跌家数统计、北向资金、涨停/跌停家数、板块异动',
    inputSchema: {
      type: 'object',
      properties: {
        includeHK: { type: 'boolean', description: '是否包含港股指数，默认 false' },
      },
    },
    annotations: { title: '大盘概览', readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'get_sector_analysis',
    description:
      '【复合】板块深度分析：一次性返回板块行情、近 30 日 K 线、涨幅前 N 的成分股',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '板块名称或代码' },
        type: { type: 'string', enum: ['industry', 'concept'], description: '板块类型: industry=行业, concept=概念' },
        topN: { type: 'number', description: '返回涨幅前 N 成分股，默认 10' },
      },
      required: ['symbol', 'type'],
    },
    annotations: { title: '板块深度分析', readOnlyHint: true, openWorldHint: false },
  },
];

// ==================== Handler 实现 ====================

export function createCompoundHandlers(sdk: StockSDK): Record<string, ToolHandler> {
  return {
    analyze_stock: async (args) => {
      const { symbol, market, period } = AnalyzeStockSchema.parse(args);

      const indicators: IndicatorOptions = {
        ma: { periods: [5, 10, 20, 60] },
        macd: true,
        kdj: true,
        rsi: true,
        boll: true,
      };

      const klinePromise = sdk.getKlineWithIndicators(symbol, {
        market,
        period: period ?? 'daily',
        adjust: 'qfq',
        indicators,
      });

      const isAShare = market === 'A' || /^(sh|sz|bj)/i.test(symbol) || /^\d{6}$/.test(symbol);

      const results = await Promise.allSettled([
        klinePromise,
        isAShare ? sdk.getFundFlow([symbol]) : Promise.resolve([]),
        isAShare ? sdk.getDividendDetail(symbol) : Promise.resolve([]),
        isAShare ? sdk.getIndividualFundFlow(symbol, { period: 'daily' }) : Promise.resolve([]),
        isAShare ? sdk.getNorthboundIndividual(symbol).catch(() => []) : Promise.resolve([]),
      ]);

      const klines = results[0].status === 'fulfilled' ? results[0].value : [];
      const fundFlow = results[1].status === 'fulfilled' ? results[1].value : [];
      const dividends = results[2].status === 'fulfilled' ? results[2].value : [];
      const fundFlowHistory = results[3].status === 'fulfilled' ? results[3].value : [];
      const northboundHolding = results[4].status === 'fulfilled' ? results[4].value : [];

      const latest = klines.length > 0 ? klines[klines.length - 1] : null;

      return {
        dataStatus: {
          kline: results[0].status,
          fundFlow: results[1].status,
          dividends: results[2].status,
          fundFlowHistory: results[3].status,
          northboundHolding: results[4].status,
        },
        kline: {
          total: klines.length,
          latest,
          data: klines.slice(-60),
        },
        fundFlow: fundFlow.length > 0 ? fundFlow[0] : null,
        fundFlowHistory: {
          total: fundFlowHistory.length,
          recent: fundFlowHistory.slice(-20),
        },
        northboundHolding: {
          total: northboundHolding.length,
          recent: northboundHolding.slice(-20),
        },
        dividends: {
          total: dividends.length,
          recent: dividends.slice(0, 5),
        },
      };
    },

    compare_stocks: async (args) => {
      const { symbols, period } = CompareStocksSchema.parse(args);

      const indicators: IndicatorOptions = {
        ma: { periods: [5, 20] },
        macd: true,
      };

      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const klines = await sdk.getKlineWithIndicators(symbol, {
              period: period ?? 'daily',
              adjust: 'qfq',
              indicators,
            });
            const latest = klines.length > 0 ? klines[klines.length - 1] : null;
            return {
              symbol,
              latest,
              recentKlines: klines.slice(-10),
            };
          } catch (error) {
            return {
              symbol,
              error: error instanceof Error ? error.message : String(error),
              latest: null,
              recentKlines: [],
            };
          }
        })
      );

      return { total: results.length, data: results };
    },

    scan_market: async (args) => {
      const {
        market, minChange, maxChange, minVolume, minAmount,
        minTurnover, maxPE, minPE, sortBy, sortOrder, limit,
      } = ScanMarketSchema.parse(args);

      const options: Parameters<typeof sdk.getAllAShareQuotes>[0] = {
        batchSize: 500,
        concurrency: 7,
      };
      if (market && market !== 'all') {
        options.market = market as 'sh' | 'sz' | 'bj' | 'kc' | 'cy';
      }

      const allQuotes = await sdk.getAllAShareQuotes(options);

      let filtered = allQuotes.filter((q: FullQuote) => {
        if (minChange !== undefined && (q.changePercent ?? 0) < minChange) return false;
        if (maxChange !== undefined && (q.changePercent ?? 0) > maxChange) return false;
        if (minVolume !== undefined && (q.volume ?? 0) < minVolume) return false;
        if (minAmount !== undefined && (q.amount ?? 0) < minAmount) return false;
        if (minTurnover !== undefined && (q.turnoverRate ?? 0) < minTurnover) return false;
        if (maxPE !== undefined && q.pe !== null && q.pe !== undefined && q.pe > maxPE) return false;
        if (minPE !== undefined && (q.pe === null || q.pe === undefined || q.pe < minPE)) return false;
        return true;
      });

      const field = sortBy ?? 'changePercent';
      const order = sortOrder ?? 'desc';
      filtered.sort((a, b) => {
        const va = (a as Record<string, unknown>)[field] as number ?? 0;
        const vb = (b as Record<string, unknown>)[field] as number ?? 0;
        return order === 'desc' ? vb - va : va - vb;
      });

      const maxLimit = limit ?? 50;
      return {
        totalScanned: allQuotes.length,
        totalMatched: filtered.length,
        data: filtered.slice(0, maxLimit),
      };
    },

    get_market_overview: async (args) => {
      const { includeHK } = MarketOverviewSchema.parse(args);

      const indexCodes = ['sh000001', 'sz399001', 'sz399006', 'sh000688', 'sh000300'];
      const hkIndexCodes = ['hkHSI', 'hkHSCEI', 'hkHSTECH'];

      const results = await Promise.allSettled([
        sdk.getFullQuotes(indexCodes),
        sdk.getIndustryList(),
        sdk.getConceptList(),
        includeHK ? sdk.getHKQuotes(hkIndexCodes) : Promise.resolve([]),
        sdk.getNorthboundFlowSummary(),
        sdk.getZTPool('zt'),
        sdk.getZTPool('dt'),
        sdk.getBoardChanges(),
      ]);

      const indices = results[0].status === 'fulfilled' ? results[0].value : [];
      const industryList = results[1].status === 'fulfilled' ? results[1].value : [];
      const conceptList = results[2].status === 'fulfilled' ? results[2].value : [];
      const hkIndices = results[3].status === 'fulfilled' ? results[3].value : [];
      const northboundSummary = results[4].status === 'fulfilled' ? results[4].value : [];
      const ztPool = results[5].status === 'fulfilled' ? results[5].value : [];
      const dtPool = results[6].status === 'fulfilled' ? results[6].value : [];
      const boardChanges = results[7].status === 'fulfilled' ? results[7].value : [];

      const sortedIndustry = [...industryList]
        .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
      const sortedConcept = [...conceptList]
        .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));

      const riseCount = industryList.filter((b) => (b.changePercent ?? 0) > 0).length;
      const fallCount = industryList.filter((b) => (b.changePercent ?? 0) < 0).length;

      return {
        dataStatus: {
          indices: results[0].status,
          industry: results[1].status,
          concept: results[2].status,
          hkIndices: results[3].status,
          northbound: results[4].status,
          ztPool: results[5].status,
          dtPool: results[6].status,
          boardChanges: results[7].status,
        },
        indices: [...indices, ...(includeHK ? hkIndices : [])],
        industryTop10: sortedIndustry.slice(0, 10).map((b) => ({
          name: b.name, code: b.code, changePercent: b.changePercent,
          leadingStock: b.leadingStock, leadingStockChangePercent: b.leadingStockChangePercent,
        })),
        industryBottom10: sortedIndustry.slice(-10).reverse().map((b) => ({
          name: b.name, code: b.code, changePercent: b.changePercent,
        })),
        conceptTop10: sortedConcept.slice(0, 10).map((b) => ({
          name: b.name, code: b.code, changePercent: b.changePercent,
          leadingStock: b.leadingStock, leadingStockChangePercent: b.leadingStockChangePercent,
        })),
        sectorBreadth: {
          industryRise: riseCount,
          industryFall: fallCount,
          industryFlat: industryList.length - riseCount - fallCount,
        },
        northbound: northboundSummary.length > 0 ? northboundSummary : null,
        ztCount: ztPool.length,
        dtCount: dtPool.length,
        boardChanges: boardChanges.slice(0, 10),
      };
    },

    get_sector_analysis: async (args) => {
      const { symbol, type, topN } = SectorAnalysisSchema.parse(args);
      const n = topN ?? 10;

      const getConstituents = type === 'industry'
        ? sdk.getIndustryConstituents(symbol)
        : sdk.getConceptConstituents(symbol);
      const getKline = type === 'industry'
        ? sdk.getIndustryKline(symbol, { period: 'daily' })
        : sdk.getConceptKline(symbol, { period: 'daily' });

      const [constituents, kline] = await Promise.all([getConstituents, getKline]);

      const sorted = [...constituents]
        .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));

      return {
        constituents: {
          total: constituents.length,
          topN: sorted.slice(0, n),
          bottomN: sorted.slice(-n).reverse(),
        },
        kline: {
          total: kline.length,
          recent: kline.slice(-30),
        },
      };
    },
  };
}
