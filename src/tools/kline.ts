/**
 * K 线数据相关 Tools
 * 包含 A 股、港股、美股的历史 K 线和分钟 K 线
 * 以及带技术指标的 K 线数据（重要功能）
 */

import type { StockSDK, IndicatorOptions } from 'stock-sdk';
import { z } from 'zod';
import type { Tool, ToolHandler } from './types.js';

// ==================== Schema 定义 ====================

const PeriodEnum = z.enum(['daily', 'weekly', 'monthly']);
const AdjustEnum = z.enum(['', 'qfq', 'hfq']);
const MinutePeriodEnum = z.enum(['1', '5', '15', '30', '60']);

const GetHistoryKlineSchema = z.object({
  symbol: z.string().describe('股票代码，如 "600519" 或 "sh600519"'),
  period: PeriodEnum.optional().describe('K 线周期: daily=日线, weekly=周线, monthly=月线'),
  adjust: AdjustEnum.optional().describe('复权类型: 空=不复权, qfq=前复权, hfq=后复权'),
  startDate: z.string().optional().describe('开始日期，格式 YYYYMMDD，如 "20240101"'),
  endDate: z.string().optional().describe('结束日期，格式 YYYYMMDD，如 "20241231"'),
});

const GetMinuteKlineSchema = z.object({
  symbol: z.string().describe('股票代码，如 "600519" 或 "sh600519"'),
  period: MinutePeriodEnum.optional().describe('分钟周期: 1, 5, 15, 30, 60'),
  adjust: AdjustEnum.optional().describe('复权类型: 空=不复权, qfq=前复权, hfq=后复权'),
  startDate: z.string().optional().describe('开始日期，格式 YYYYMMDD，如 "20240101"'),
  endDate: z.string().optional().describe('结束日期，格式 YYYYMMDD，如 "20241231"'),
});

const GetTodayTimelineSchema = z.object({
  code: z.string().describe('股票代码，如 "sz000001" 或 "sh600000"'),
});

// ==================== 重要：带技术指标的 K 线 ====================

const IndicatorConfigSchema = z.object({
  ma: z
    .union([
      z.boolean(),
      z.object({
        periods: z.array(z.number()).optional().describe('均线周期数组，如 [5, 10, 20, 60]'),
        type: z.enum(['sma', 'ema', 'wma']).optional().describe('均线类型: sma=简单, ema=指数, wma=加权'),
      }),
    ])
    .optional()
    .describe('MA 均线配置，true 表示使用默认参数 [5,10,20,30,60,120,250]'),
  macd: z
    .union([
      z.boolean(),
      z.object({
        short: z.number().optional().describe('短期 EMA 周期，默认 12'),
        long: z.number().optional().describe('长期 EMA 周期，默认 26'),
        signal: z.number().optional().describe('信号线周期，默认 9'),
      }),
    ])
    .optional()
    .describe('MACD 配置，true 表示使用默认参数'),
  boll: z
    .union([
      z.boolean(),
      z.object({
        period: z.number().optional().describe('周期，默认 20'),
        stdDev: z.number().optional().describe('标准差倍数，默认 2'),
      }),
    ])
    .optional()
    .describe('布林带配置'),
  kdj: z
    .union([
      z.boolean(),
      z.object({
        period: z.number().optional().describe('RSV 周期，默认 9'),
        kPeriod: z.number().optional().describe('K 值平滑周期，默认 3'),
        dPeriod: z.number().optional().describe('D 值平滑周期，默认 3'),
      }),
    ])
    .optional()
    .describe('KDJ 配置'),
  rsi: z
    .union([
      z.boolean(),
      z.object({
        periods: z.array(z.number()).optional().describe('RSI 周期数组，如 [6, 12, 24]'),
      }),
    ])
    .optional()
    .describe('RSI 配置'),
  wr: z
    .union([
      z.boolean(),
      z.object({
        periods: z.array(z.number()).optional().describe('WR 周期数组，如 [6, 10]'),
      }),
    ])
    .optional()
    .describe('威廉指标配置'),
  bias: z
    .union([
      z.boolean(),
      z.object({
        periods: z.array(z.number()).optional().describe('BIAS 周期数组，如 [6, 12, 24]'),
      }),
    ])
    .optional()
    .describe('乖离率配置'),
  cci: z
    .union([
      z.boolean(),
      z.object({
        period: z.number().optional().describe('CCI 周期，默认 14'),
      }),
    ])
    .optional()
    .describe('CCI 配置'),
  atr: z
    .union([
      z.boolean(),
      z.object({
        period: z.number().optional().describe('ATR 周期，默认 14'),
      }),
    ])
    .optional()
    .describe('ATR 配置'),
});

const GetKlineWithIndicatorsSchema = z.object({
  symbol: z.string().describe('股票代码，如 "600519"、"00700"(港股)、"105.AAPL"(美股)'),
  market: z.enum(['A', 'HK', 'US']).optional().describe('市场类型，不传则自动识别'),
  period: PeriodEnum.optional().describe('K 线周期: daily=日线, weekly=周线, monthly=月线'),
  adjust: AdjustEnum.optional().describe('复权类型: 空=不复权, qfq=前复权(默认), hfq=后复权'),
  startDate: z.string().optional().describe('开始日期，格式 YYYYMMDD'),
  endDate: z.string().optional().describe('结束日期，格式 YYYYMMDD'),
  indicators: IndicatorConfigSchema.optional().describe('技术指标配置'),
});

// ==================== Tool 定义 ====================

export const klineTools: Tool[] = [
  {
    name: 'get_history_kline',
    description: '获取 A 股历史 K 线数据（日/周/月），包含开高低收、成交量、涨跌幅等',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '股票代码，如 "600519" 或 "sh600519"' },
        period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'K 线周期: daily=日线(默认), weekly=周线, monthly=月线' },
        adjust: { type: 'string', enum: ['', 'qfq', 'hfq'], description: '复权类型: 空=不复权, qfq=前复权(默认), hfq=后复权' },
        startDate: { type: 'string', description: '开始日期，格式 YYYYMMDD，如 "20240101"' },
        endDate: { type: 'string', description: '结束日期，格式 YYYYMMDD，如 "20241231"' },
      },
      required: ['symbol'],
    },
    annotations: { title: 'A 股历史 K 线', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_hk_history_kline',
    description: '获取港股历史 K 线数据（日/周/月）',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '港股代码，如 "00700"、"09988"' },
        period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'K 线周期: daily=日线(默认), weekly=周线, monthly=月线' },
        adjust: { type: 'string', enum: ['', 'qfq', 'hfq'], description: '复权类型: 空=不复权, qfq=前复权(默认), hfq=后复权' },
        startDate: { type: 'string', description: '开始日期，格式 YYYYMMDD' },
        endDate: { type: 'string', description: '结束日期，格式 YYYYMMDD' },
      },
      required: ['symbol'],
    },
    annotations: { title: '港股历史 K 线', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_us_history_kline',
    description: '获取美股历史 K 线数据（日/周/月）',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '美股代码，如 "105.AAPL"、"106.BABA"' },
        period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'K 线周期: daily=日线(默认), weekly=周线, monthly=月线' },
        adjust: { type: 'string', enum: ['', 'qfq', 'hfq'], description: '复权类型: 空=不复权, qfq=前复权(默认), hfq=后复权' },
        startDate: { type: 'string', description: '开始日期，格式 YYYYMMDD' },
        endDate: { type: 'string', description: '结束日期，格式 YYYYMMDD' },
      },
      required: ['symbol'],
    },
    annotations: { title: '美股历史 K 线', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_minute_kline',
    description: '获取 A 股分钟 K 线数据（1/5/15/30/60 分钟）',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '股票代码，如 "600519" 或 "sh600519"' },
        period: { type: 'string', enum: ['1', '5', '15', '30', '60'], description: '分钟周期: 1=1分钟, 5=5分钟, 15=15分钟, 30=30分钟, 60=60分钟' },
        adjust: { type: 'string', enum: ['', 'qfq', 'hfq'], description: '复权类型' },
        startDate: { type: 'string', description: '开始日期，格式 YYYYMMDD' },
        endDate: { type: 'string', description: '结束日期，格式 YYYYMMDD' },
      },
      required: ['symbol'],
    },
    annotations: { title: 'A 股分钟 K 线', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_today_timeline',
    description: '获取 A 股当日分时走势数据，包含每分钟的成交价、成交量、均价',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: '股票代码，如 "sz000001" 或 "sh600000"' },
      },
      required: ['code'],
    },
    annotations: { title: 'A 股当日分时', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_kline_with_indicators',
    description:
      '【重要】获取带技术指标的 K 线数据，一次性返回 K 线和多个技术指标（MA/MACD/BOLL/KDJ/RSI/WR/BIAS/CCI/ATR），支持 A 股/港股/美股，自动处理指标计算所需的历史数据',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '股票代码，如 "600519"(A股)、"00700"(港股)、"105.AAPL"(美股)' },
        market: { type: 'string', enum: ['A', 'HK', 'US'], description: '市场类型: A=A股, HK=港股, US=美股。不传则自动识别' },
        period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'K 线周期: daily=日线(默认), weekly=周线, monthly=月线' },
        adjust: { type: 'string', enum: ['', 'qfq', 'hfq'], description: '复权类型: 空=不复权, qfq=前复权(默认), hfq=后复权' },
        startDate: { type: 'string', description: '开始日期，格式 YYYYMMDD' },
        endDate: { type: 'string', description: '结束日期，格式 YYYYMMDD' },
        indicators: {
          type: 'object',
          description: '技术指标配置，可配置 ma/macd/boll/kdj/rsi/wr/bias/cci/atr',
          properties: {
            ma: { oneOf: [{ type: 'boolean' }, { type: 'object', properties: { periods: { type: 'array', items: { type: 'number' }, description: '均线周期数组，如 [5, 10, 20, 60]' }, type: { type: 'string', enum: ['sma', 'ema', 'wma'], description: '均线类型' } } }], description: 'MA 均线配置，true 表示使用默认参数 [5,10,20,30,60,120,250]' },
            macd: { oneOf: [{ type: 'boolean' }, { type: 'object', properties: { short: { type: 'number', description: '短期 EMA 周期，默认 12' }, long: { type: 'number', description: '长期 EMA 周期，默认 26' }, signal: { type: 'number', description: '信号线周期，默认 9' } } }], description: 'MACD 配置' },
            boll: { oneOf: [{ type: 'boolean' }, { type: 'object', properties: { period: { type: 'number', description: '周期，默认 20' }, stdDev: { type: 'number', description: '标准差倍数，默认 2' } } }], description: '布林带配置' },
            kdj: { oneOf: [{ type: 'boolean' }, { type: 'object', properties: { period: { type: 'number', description: 'RSV 周期，默认 9' }, kPeriod: { type: 'number', description: 'K 值平滑周期，默认 3' }, dPeriod: { type: 'number', description: 'D 值平滑周期，默认 3' } } }], description: 'KDJ 配置' },
            rsi: { oneOf: [{ type: 'boolean' }, { type: 'object', properties: { periods: { type: 'array', items: { type: 'number' }, description: 'RSI 周期数组，如 [6, 12, 24]' } } }], description: 'RSI 配置' },
            wr: { oneOf: [{ type: 'boolean' }, { type: 'object', properties: { periods: { type: 'array', items: { type: 'number' }, description: 'WR 周期数组，如 [6, 10]' } } }], description: '威廉指标配置' },
            bias: { oneOf: [{ type: 'boolean' }, { type: 'object', properties: { periods: { type: 'array', items: { type: 'number' }, description: 'BIAS 周期数组，如 [6, 12, 24]' } } }], description: '乖离率配置' },
            cci: { oneOf: [{ type: 'boolean' }, { type: 'object', properties: { period: { type: 'number', description: 'CCI 周期，默认 14' } } }], description: 'CCI 配置' },
            atr: { oneOf: [{ type: 'boolean' }, { type: 'object', properties: { period: { type: 'number', description: 'ATR 周期，默认 14' } } }], description: 'ATR 配置' },
          },
        },
      },
      required: ['symbol'],
    },
    annotations: { title: 'K 线+技术指标', readOnlyHint: true, openWorldHint: false },
  },
];

// ==================== Handler 实现 ====================

export function createKlineHandlers(sdk: StockSDK): Record<string, ToolHandler> {
  return {
    get_history_kline: async (args) => {
      const { symbol, period, adjust, startDate, endDate } =
        GetHistoryKlineSchema.parse(args);
      return await sdk.getHistoryKline(symbol, {
        period,
        adjust,
        startDate,
        endDate,
      });
    },

    get_hk_history_kline: async (args) => {
      const { symbol, period, adjust, startDate, endDate } =
        GetHistoryKlineSchema.parse(args);
      return await sdk.getHKHistoryKline(symbol, {
        period,
        adjust,
        startDate,
        endDate,
      });
    },

    get_us_history_kline: async (args) => {
      const { symbol, period, adjust, startDate, endDate } =
        GetHistoryKlineSchema.parse(args);
      return await sdk.getUSHistoryKline(symbol, {
        period,
        adjust,
        startDate,
        endDate,
      });
    },

    get_minute_kline: async (args) => {
      const { symbol, period, adjust, startDate, endDate } = GetMinuteKlineSchema.parse(args);
      return await sdk.getMinuteKline(symbol, {
        period,
        adjust,
        startDate,
        endDate,
      });
    },

    get_today_timeline: async (args) => {
      const { code } = GetTodayTimelineSchema.parse(args);
      return await sdk.getTodayTimeline(code);
    },

    // ==================== 重要：带技术指标的 K 线 ====================
    get_kline_with_indicators: async (args) => {
      const { symbol, market, period, adjust, startDate, endDate, indicators } =
        GetKlineWithIndicatorsSchema.parse(args);

      // 构建指标配置
      const indicatorOptions: IndicatorOptions = {};
      if (indicators) {
        if (indicators.ma) indicatorOptions.ma = indicators.ma;
        if (indicators.macd) indicatorOptions.macd = indicators.macd;
        if (indicators.boll) indicatorOptions.boll = indicators.boll;
        if (indicators.kdj) indicatorOptions.kdj = indicators.kdj;
        if (indicators.rsi) indicatorOptions.rsi = indicators.rsi;
        if (indicators.wr) indicatorOptions.wr = indicators.wr;
        if (indicators.bias) indicatorOptions.bias = indicators.bias;
        if (indicators.cci) indicatorOptions.cci = indicators.cci;
        if (indicators.atr) indicatorOptions.atr = indicators.atr;
      }

      const klines = await sdk.getKlineWithIndicators(symbol, {
        market,
        period,
        adjust,
        startDate,
        endDate,
        indicators: indicatorOptions,
      });

      return {
        total: klines.length,
        data: klines,
      };
    },
  };
}
