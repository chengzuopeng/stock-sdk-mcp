/**
 * MCP Resources 定义
 * 提供静态或缓存的数据资源，以及参数化的 Resource Templates
 */

import type { StockSDK } from 'stock-sdk';

export interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export type ResourceHandler = (uri?: string) => Promise<string>;

/**
 * 获取所有静态 Resource 定义
 */
export function getAllResources(): Resource[] {
  return [
    {
      uri: 'stock://calendar/trading',
      name: 'A 股交易日历',
      description: '从 1990 年至今的 A 股交易日期列表，可用于判断某天是否为交易日',
      mimeType: 'application/json',
    },
    {
      uri: 'stock://market/a-share/codes',
      name: 'A 股代码列表',
      description: '全部 A 股股票代码（5000+ 只），包含上证、深证、北证',
      mimeType: 'application/json',
    },
    {
      uri: 'stock://market/hk/codes',
      name: '港股代码列表',
      description: '全部港股股票代码（2000+ 只）',
      mimeType: 'application/json',
    },
    {
      uri: 'stock://market/us/codes',
      name: '美股代码列表',
      description: '全部美股股票代码（8000+ 只），包含纳斯达克和纽交所',
      mimeType: 'application/json',
    },
    {
      uri: 'stock://market/fund/codes',
      name: '基金代码列表',
      description: '全部公募基金代码（26000+ 只）',
      mimeType: 'application/json',
    },
    {
      uri: 'stock://board/industry/list',
      name: '行业板块列表',
      description: '所有行业板块的名称和代码',
      mimeType: 'application/json',
    },
    {
      uri: 'stock://board/concept/list',
      name: '概念板块列表',
      description: '所有概念板块的名称和代码',
      mimeType: 'application/json',
    },
  ];
}

/**
 * 获取 Resource Templates（参数化资源）
 */
export function getResourceTemplates(): ResourceTemplate[] {
  return [
    {
      uriTemplate: 'stock://quotes/{code}',
      name: '个股实时行情',
      description: '获取指定股票代码的实时行情数据（A 股），如 stock://quotes/sh600519',
      mimeType: 'application/json',
    },
    {
      uriTemplate: 'stock://kline/{code}/{period}',
      name: '个股 K 线数据',
      description: '获取指定股票代码的 K 线数据，如 stock://kline/600519/daily',
      mimeType: 'application/json',
    },
    {
      uriTemplate: 'stock://board/industry/{code}',
      name: '行业板块详情',
      description: '获取指定行业板块的实时行情和成分股概要，如 stock://board/industry/BK1027',
      mimeType: 'application/json',
    },
    {
      uriTemplate: 'stock://board/concept/{code}',
      name: '概念板块详情',
      description: '获取指定概念板块的实时行情和成分股概要，如 stock://board/concept/BK0800',
      mimeType: 'application/json',
    },
  ];
}

/**
 * 从 URI 中提取参数（自动 URL-decode，支持中文板块名等非 ASCII 字符）
 */
function extractUriParams(template: string, uri: string): Record<string, string> | null {
  const paramNames: string[] = [];
  const regex = new RegExp(
    '^' + template.replace(/\{([^}]+)\}/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    }) + '$'
  );
  const match = uri.match(regex);
  if (!match) return null;
  const params: Record<string, string> = {};
  paramNames.forEach((name, i) => {
    const raw = match[i + 1];
    try {
      params[name] = decodeURIComponent(raw);
    } catch {
      // 非合法 URL 编码（如已是中文），原样返回
      params[name] = raw;
    }
  });
  return params;
}

/**
 * 创建所有 Resource Handlers（包含静态和模板资源）
 */
export function createResourceHandlers(
  sdk: StockSDK
): Record<string, ResourceHandler> {
  return {
    // ==================== 静态 Resources ====================
    'stock://calendar/trading': async () => {
      const calendar = await sdk.getTradingCalendar();
      return JSON.stringify(
        {
          total: calendar.length,
          startDate: calendar.length > 0 ? calendar[0] : null,
          endDate: calendar.length > 0 ? calendar[calendar.length - 1] : null,
          dates: calendar,
        },
        null, 2
      );
    },

    'stock://market/a-share/codes': async () => {
      const codes = await sdk.getAShareCodeList();
      return JSON.stringify({ total: codes.length, codes }, null, 2);
    },

    'stock://market/hk/codes': async () => {
      const codes = await sdk.getHKCodeList();
      return JSON.stringify({ total: codes.length, codes }, null, 2);
    },

    'stock://market/us/codes': async () => {
      const codes = await sdk.getUSCodeList();
      return JSON.stringify({ total: codes.length, codes }, null, 2);
    },

    'stock://market/fund/codes': async () => {
      const codes = await sdk.getFundCodeList();
      return JSON.stringify({ total: codes.length, codes }, null, 2);
    },

    'stock://board/industry/list': async () => {
      const list = await sdk.getIndustryList();
      return JSON.stringify(
        { total: list.length, data: list.map((item) => ({ name: item.name, code: item.code, changePercent: item.changePercent })) },
        null, 2
      );
    },

    'stock://board/concept/list': async () => {
      const list = await sdk.getConceptList();
      return JSON.stringify(
        { total: list.length, data: list.map((item) => ({ name: item.name, code: item.code, changePercent: item.changePercent })) },
        null, 2
      );
    },

    // ==================== Resource Templates ====================
    'stock://quotes/{code}': async (uri?: string) => {
      if (!uri) throw new Error('URI is required');
      const params = extractUriParams('stock://quotes/{code}', uri);
      if (!params) throw new Error(`Invalid URI: ${uri}`);
      const quotes = await sdk.getFullQuotes([params.code]);
      return JSON.stringify(quotes.length > 0 ? quotes[0] : { error: 'Not found' }, null, 2);
    },

    'stock://kline/{code}/{period}': async (uri?: string) => {
      if (!uri) throw new Error('URI is required');
      const params = extractUriParams('stock://kline/{code}/{period}', uri);
      if (!params) throw new Error(`Invalid URI: ${uri}`);
      const data = await sdk.getHistoryKline(params.code, {
        period: params.period as 'daily' | 'weekly' | 'monthly',
      });
      return JSON.stringify({ total: data.length, data: data.slice(-60) }, null, 2);
    },

    'stock://board/industry/{code}': async (uri?: string) => {
      if (!uri) throw new Error('URI is required');
      const params = extractUriParams('stock://board/industry/{code}', uri);
      if (!params) throw new Error(`Invalid URI: ${uri}`);
      const [spot, constituents] = await Promise.all([
        sdk.getIndustrySpot(params.code),
        sdk.getIndustryConstituents(params.code),
      ]);
      const sorted = [...constituents].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
      return JSON.stringify({
        spot,
        constituents: { total: constituents.length, top5: sorted.slice(0, 5) },
      }, null, 2);
    },

    'stock://board/concept/{code}': async (uri?: string) => {
      if (!uri) throw new Error('URI is required');
      const params = extractUriParams('stock://board/concept/{code}', uri);
      if (!params) throw new Error(`Invalid URI: ${uri}`);
      const [spot, constituents] = await Promise.all([
        sdk.getConceptSpot(params.code),
        sdk.getConceptConstituents(params.code),
      ]);
      const sorted = [...constituents].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
      return JSON.stringify({
        spot,
        constituents: { total: constituents.length, top5: sorted.slice(0, 5) },
      }, null, 2);
    },
  };
}
