/**
 * Replacement data-source helpers for endpoints that are stale in stock-sdk 1.9.x.
 * These helpers intentionally live in the MCP layer so we can test the fix in this
 * repository without patching node_modules or adding a fallback script.
 */

import { setDefaultResultOrder } from 'node:dns';

try {
  // Some Eastmoney hosts close IPv6 TLS sockets from this environment. Prefer IPv4
  // for Node's built-in fetch to avoid intermittent UND_ERR_SOCKET failures.
  setDefaultResultOrder('ipv4first');
} catch {
  // Older runtimes may not support this; requests will still work when DNS is OK.
}

const EASTMONEY_UT = 'b2884a393a59ad64002292a3e90d46a5';
const EASTMONEY_FFLOW_DAYKLINE = 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get';
const EASTMONEY_HSGT_RTMIN = 'https://push2.eastmoney.com/api/qt/kamtbs.rtmin/get';
const EASTMONEY_HSGT_SNAPSHOT = 'https://push2.eastmoney.com/api/qt/kamt/get';
const EASTMONEY_DATACENTER = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
const TDX_HSGT_TQLEX = 'http://calc.tdx.com.cn:7616/TQLEX?Entry=HQServ.hq_nlp';
const FUND_FLOW_FIELDS = 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65';

export type FundFlowSnapshot = {
  code: string;
  name: string;
  date: string;
  mainNet: number | null;
  smallNet: number | null;
  mediumNet: number | null;
  largeNet: number | null;
  superLargeNet: number | null;
  mainNetRatio: number | null;
  smallNetRatio: number | null;
  mediumNetRatio: number | null;
  largeNetRatio: number | null;
  superLargeNetRatio: number | null;
  close: number | null;
  changePercent: number | null;
  source: string;
  raw: string;
};

export type HsgtMinutePoint = {
  date: string;
  time: string;
  shanghaiNetInflow: number | null;
  shenzhenNetInflow: number | null;
  totalNetInflow: number | null;
};

export type HsgtSnapshotPoint = {
  date: string;
  time?: string;
  shanghaiNetBuyAmount: number | null;
  shenzhenNetBuyAmount: number | null;
  totalNetBuyAmount: number | null;
  source: string;
};

function num(value: unknown): number | null {
  if (value == null || value === '' || value === '-') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function compactCode(code: string): string {
  return code.trim().replace(/^(sh|sz|bj)/i, '');
}

function secidOf(code: string): string {
  const c = compactCode(code);
  if (/^6/.test(c)) return `1.${c}`;
  if (/^(0|3)/.test(c)) return `0.${c}`;
  if (/^(8|9|4)/.test(c)) return `0.${c}`;
  return code.includes('.') ? code : c;
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://data.eastmoney.com/',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.json();
}

function parseFundFlowLine(line: string): Omit<FundFlowSnapshot, 'code' | 'name' | 'source' | 'raw'> {
  const p = line.split(',');
  return {
    date: p[0] ?? '',
    mainNet: num(p[1]),
    smallNet: num(p[2]),
    mediumNet: num(p[3]),
    largeNet: num(p[4]),
    superLargeNet: num(p[5]),
    mainNetRatio: num(p[6]),
    smallNetRatio: num(p[7]),
    mediumNetRatio: num(p[8]),
    largeNetRatio: num(p[9]),
    superLargeNetRatio: num(p[10]),
    close: num(p[11]),
    changePercent: num(p[12]),
  };
}

export async function getEastmoneyFundFlow(codes: string[]): Promise<FundFlowSnapshot[]> {
  const results = await Promise.all(codes.map(async (code) => {
    const params = new URLSearchParams({
      lmt: '1',
      klt: '101',
      secid: secidOf(code),
      fields1: 'f1,f2,f3,f7',
      fields2: FUND_FLOW_FIELDS,
      ut: EASTMONEY_UT,
    });
    const json = await fetchJson(`${EASTMONEY_FFLOW_DAYKLINE}?${params.toString()}`);
    const data = json?.data;
    const line = Array.isArray(data?.klines) ? data.klines.at(-1) : null;
    if (!data || !line) {
      throw new Error(`Eastmoney fund-flow has no data for ${code}`);
    }
    return {
      code: String(data.code ?? compactCode(code)),
      name: String(data.name ?? ''),
      ...parseFundFlowLine(line),
      source: 'eastmoney_fflow_daykline',
      raw: line,
    };
  }));
  return results;
}

function parseHsgtMinute(line: string, date: string): HsgtMinutePoint {
  const p = line.split(',');
  return {
    date,
    time: p[0] ?? '',
    shanghaiNetInflow: num(p[1]),
    shenzhenNetInflow: num(p[3]),
    totalNetInflow: num(p[5]),
  };
}

function parseHsgtDate(raw: string): string {
  if (!raw) return raw;
  return /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
}

function inferMinuteTime(index: number, direction: 'north' | 'south'): string {
  const startMinute = direction === 'north' ? (9 * 60 + 25) : (9 * 60 + 20);
  const total = startMinute + index;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

async function getTdxHsgtMinute(reqId: '1997' | '2000', direction: 'north' | 'south'): Promise<HsgtMinutePoint[]> {
  const body = JSON.stringify([{ ReqId: reqId, DataTime: '090000', modname: 'mod_hsgt.dll' }]);
  const json = await fetchJson(TDX_HSGT_TQLEX, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Referer: 'http://chaguwang.cn/',
    },
  });
  const content = json?.ResultSets?.[0]?.Content?.[0];
  if (!Array.isArray(content) || content.length < 5) return [];

  const shArr = direction === 'north' ? content[1] : content[3];
  const szArr = direction === 'north' ? content[2] : content[4];
  const timeArr = direction === 'north' ? content[5] : content[6];
  if (!Array.isArray(shArr) || !Array.isArray(szArr)) return [];

  const points: HsgtMinutePoint[] = [];
  for (let i = 0; i < Math.min(shArr.length, szArr.length); i += 1) {
    const t = Array.isArray(timeArr) && timeArr[i] ? String(timeArr[i]) : inferMinuteTime(i, direction);
    points.push({
      date: '',
      time: t,
      shanghaiNetInflow: num(shArr[i]),
      shenzhenNetInflow: num(szArr[i]),
      totalNetInflow: num((Number(shArr[i] ?? 0) + Number(szArr[i] ?? 0))),
    });
  }
  return points;
}

async function getEastmoneyNorthboundSnapshot(): Promise<HsgtSnapshotPoint | null> {
  const params = new URLSearchParams({
    fields1: 'f1,f2,f3,f4',
    fields2: 'f51,f52,f53,f54,f63',
    ut: EASTMONEY_UT,
  });
  const json = await fetchJson(`${EASTMONEY_HSGT_SNAPSHOT}?${params.toString()}`);
  const data = json?.data;
  if (!data) return null;

  const hk2sh = data.hk2sh ?? data.HK2SH ?? {};
  const hk2sz = data.hk2sz ?? data.HK2SZ ?? {};
  const sh = num(hk2sh.netBuyAmt ?? hk2sh.dayNetAmtIn ?? hk2sh.f52 ?? hk2sh.f54);
  const sz = num(hk2sz.netBuyAmt ?? hk2sz.dayNetAmtIn ?? hk2sz.f52 ?? hk2sz.f54);
  const total = (sh ?? 0) + (sz ?? 0);
  const date = parseHsgtDate(String(data.s2nDate ?? data.n2sDate ?? ''));
  return {
    date,
    shanghaiNetBuyAmount: sh,
    shenzhenNetBuyAmount: sz,
    totalNetBuyAmount: Number.isFinite(total) ? total : null,
    source: 'eastmoney_kamt_snapshot',
  };
}

function allZero(points: HsgtMinutePoint[]): boolean {
  return points.length > 0 && points.every((p) =>
    (p.shanghaiNetInflow ?? 0) === 0 && (p.shenzhenNetInflow ?? 0) === 0 && (p.totalNetInflow ?? 0) === 0
  );
}

function boardTypeFor(direction: 'north' | 'south'): string[] {
  return direction === 'north' ? ['001', '003'] : ['002', '004'];
}

export async function getEastmoneyHsgtSummary(direction?: 'north' | 'south') {
  const filter = direction
    ? `(MUTUAL_TYPE in (${boardTypeFor(direction).map((x) => `"${x}"`).join(',')}))`
    : undefined;
  const params = new URLSearchParams({
    reportName: 'RPT_MUTUAL_QUOTA',
    columns: 'TRADE_DATE,MUTUAL_TYPE,BOARD_TYPE,MUTUAL_TYPE_NAME,FUNDS_DIRECTION,INDEX_CODE,INDEX_NAME,BOARD_CODE',
    quoteColumns: 'status~07~BOARD_CODE,dayNetAmtIn~07~BOARD_CODE,dayAmtRemain~07~BOARD_CODE,dayAmtThreshold~07~BOARD_CODE,f104~07~BOARD_CODE,f105~07~BOARD_CODE,f106~07~BOARD_CODE,f3~03~INDEX_CODE~INDEX_f3,netBuyAmt~07~BOARD_CODE',
    quoteType: '0',
    sortColumns: 'MUTUAL_TYPE',
    sortTypes: '1',
    pageSize: '2000',
    pageNumber: '1',
    source: 'WEB',
    client: 'WEB',
  });
  if (filter) params.set('filter', filter);
  const json = await fetchJson(`${EASTMONEY_DATACENTER}?${params.toString()}`);
  const rows = json?.result?.data;
  if (!Array.isArray(rows)) return [];
  return rows.map((e: any) => ({
    date: String(e.TRADE_DATE ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? String(e.TRADE_DATE ?? ''),
    type: String(e.MUTUAL_TYPE ?? ''),
    boardName: String(e.MUTUAL_TYPE_NAME ?? ''),
    direction: String(e.FUNDS_DIRECTION ?? ''),
    status: String(e.status ?? ''),
    netBuyAmount: num(e.netBuyAmt),
    netInflow: num(e.dayNetAmtIn),
    remainAmount: num(e.dayAmtRemain),
    upCount: num(e.f104),
    flatCount: num(e.f106),
    downCount: num(e.f105),
    indexCode: String(e.INDEX_CODE ?? ''),
    indexName: String(e.INDEX_NAME ?? ''),
    indexChangePercent: num(e.INDEX_f3),
  }));
}

export async function getEastmoneyHsgtRealtime(direction: 'north' | 'south') {
  const params = new URLSearchParams({
    fields1: 'f1,f2,f3,f4',
    fields2: 'f51,f54,f52,f58,f53,f62,f56,f57,f60,f61',
    ut: EASTMONEY_UT,
  });
  const json = await fetchJson(`${EASTMONEY_HSGT_RTMIN}?${params.toString()}`);
  const key = direction === 'south' ? 'n2s' : 's2n';
  const dateKey = direction === 'south' ? 'n2sDate' : 's2nDate';
  const date = String(json?.data?.[dateKey] ?? '');
  const raw = json?.data?.[key];
  let minute = Array.isArray(raw) ? raw.map((line: string) => parseHsgtMinute(line, date)) : [];
  const summary = await getEastmoneyHsgtSummary(direction);
  let warning: string | undefined;
  let snapshot: HsgtSnapshotPoint | null = null;

  if (direction === 'north' && allZero(minute)) {
    const tdxMinute = await getTdxHsgtMinute('1997', 'north').catch(() => []);
    if (tdxMinute.length > 0 && !allZero(tdxMinute)) {
      const dateNormalized = parseHsgtDate(date);
      minute = tdxMinute.map((p) => ({ ...p, date: dateNormalized || p.date }));
      warning = 'Eastmoney s2n minute series is all zero; replaced northbound minute data with TDX mod_hsgt minute source.';
    } else {
      snapshot = await getEastmoneyNorthboundSnapshot();
      if (snapshot && snapshot.totalNetBuyAmount !== null) {
        minute = [{
          date: snapshot.date,
          time: 'snapshot',
          shanghaiNetInflow: snapshot.shanghaiNetBuyAmount,
          shenzhenNetInflow: snapshot.shenzhenNetBuyAmount,
          totalNetInflow: snapshot.totalNetBuyAmount,
        }];
        warning = 'Eastmoney s2n minute series is all zero; replaced minute data with current northbound snapshot from kamt/get.';
      } else {
        warning = 'Eastmoney realtime s2n minute series is all zero; use summary/history source for northbound conclusions.';
      }
    }
  }

  return {
    minute,
    summary,
    snapshot,
    source: 'eastmoney_kamtbs_rtmin+datacenter_mutual_quota',
    warning,
  };
}
