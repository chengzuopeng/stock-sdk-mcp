import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAllHandlers } from '../tools/index.js';

const mockSdk = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (typeof prop === 'string' && prop.startsWith('get')) {
        return (..._args: unknown[]) => Promise.resolve([]);
      }
      return undefined;
    },
  }
) as any;

describe('Data source fixes', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('get_fund_flow should use eastmoney fflow endpoint and return parsed snapshots', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          code: '600519',
          name: '贵州茅台',
          klines: ['2026-05-21,-513470016.0,-663579.0,514133600.0,-508631328.0,-4838688.0,-10.04,-0.01,10.06,-9.95,-0.09,1311.00,-0.30,0.00,0.00'],
        },
      }),
    })) as any;

    const handlers = createAllHandlers(mockSdk);
    const result = await handlers.get_fund_flow({ codes: ['sh600519'] }) as any[];

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = String((global.fetch as any).mock.calls[0][0]);
    expect(calledUrl).toContain('push2his.eastmoney.com/api/qt/stock/fflow/daykline/get');
    expect(result[0]).toMatchObject({
      code: '600519',
      name: '贵州茅台',
      date: '2026-05-21',
      mainNet: -513470016,
      source: 'eastmoney_fflow_daykline',
    });
  });

  it('get_northbound_realtime should return warning when north minute series are all zero', async () => {
    global.fetch = vi.fn(async (url: string) => {
      if (url.includes('kamtbs.rtmin')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              s2nDate: '2026-05-21',
              s2n: ['9:30,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00'],
            },
          }),
        } as any;
      }
      if (url.includes('TQLEX?Entry=HQServ.hq_nlp')) {
        return {
          ok: true,
          json: async () => ({
            ResultSets: [{ Content: [[
              '1997',
              [12.34, 12.35],
              [56.78, 56.79],
              [0, 0],
              [0, 0],
              [],
              []
            ]] }],
          }),
        } as any;
      }
            return {
        ok: true,
        json: async () => ({
          result: {
            data: [
              {
                TRADE_DATE: '2026-05-21',
                MUTUAL_TYPE: '001',
                MUTUAL_TYPE_NAME: '沪股通',
                FUNDS_DIRECTION: '北向',
                status: '3',
                netBuyAmt: 0,
                dayNetAmtIn: 0,
                dayAmtRemain: 0,
                f104: 1,
                f105: 2,
                f106: 3,
                INDEX_CODE: '000001',
                INDEX_NAME: '上证指数',
                INDEX_f3: -2.04,
              },
            ],
          },
        }),
      } as any;
    }) as any;

    const handlers = createAllHandlers(mockSdk);
    const result = await handlers.get_northbound_realtime({ direction: 'north' }) as any;

    expect(result.source).toBe('eastmoney_kamtbs_rtmin+datacenter_mutual_quota');
    expect(result.warning).toMatch(/replaced northbound minute data with TDX mod_hsgt minute source/i);
    expect(result.minute.data[0]).toMatchObject({
      shanghaiNetInflow: 12.34,
      shenzhenNetInflow: 56.78,
      totalNetInflow: 69.12,
    });
    expect(result.minute.data[1]).toMatchObject({
      shanghaiNetInflow: 12.35,
      shenzhenNetInflow: 56.79,
      totalNetInflow: 69.14,
    });
    expect(result.snapshot).toBeUndefined();
    expect(result.summary.data[0]).toMatchObject({
      boardName: '沪股通',
      direction: '北向',
    });
  });
});
