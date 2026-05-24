/**
 * 集成测试：实际调用真实 SDK 验证新增工具
 * 默认跳过（避免污染单元测试），通过 RUN_INTEGRATION=1 启用
 *
 * yarn test 不会运行；
 * RUN_INTEGRATION=1 yarn vitest run src/__tests__/integration.test.ts 才会运行
 */

import { describe, it, expect } from 'vitest';
import { StockSDK } from 'stock-sdk';
import { createAllHandlers } from '../tools/index.js';

const RUN = process.env.RUN_INTEGRATION === '1';
const describeIf = RUN ? describe : describe.skip;

const sdk = new StockSDK();
const handlers = createAllHandlers(sdk);

/** 对网络错误重试一次（针对 eastmoney datacenter 的偶发 socket close） */
async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String((e as Error).message ?? e);
      if (!/fetch failed|socket|ECONNRESET|other side closed|timeout/i.test(msg)) throw e;
      if (i < retries) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr;
}

const fmt = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const today = new Date();
const lastMonth = new Date(today);
lastMonth.setDate(lastMonth.getDate() - 30);

const TIMEOUT = 30000;

describeIf('Integration: fundflow.ts', () => {
  it('get_stock_fund_flow_history', async () => {
    const r = await handlers.get_stock_fund_flow_history({ symbol: 'sh600519', period: 'daily' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_market_fund_flow', async () => {
    const r = await handlers.get_market_fund_flow({});
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_fund_flow_rank scope=stock', async () => {
    const r = await withRetry(() =>
      handlers.get_fund_flow_rank({ scope: 'stock', indicator: 'today' })
    );
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, 60000);

  it('get_fund_flow_rank scope=sector', async () => {
    const r = await withRetry(() =>
      handlers.get_fund_flow_rank({ scope: 'sector', sectorType: 'industry', indicator: 'today' })
    );
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, 60000);

  it('get_sector_fund_flow_history', async () => {
    const r = await handlers.get_sector_fund_flow_history({ symbol: 'BK0438', period: 'daily' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);
});

describeIf('Integration: northbound.ts', () => {
  it('get_northbound_realtime', async () => {
    const r = await handlers.get_northbound_realtime({ direction: 'north' });
    expect(r).toBeDefined();
    expect((r as any).minute).toBeDefined();
    expect((r as any).summary).toBeDefined();
  }, TIMEOUT);

  it('get_northbound_history scope=market', async () => {
    const r = await handlers.get_northbound_history({ scope: 'market', direction: 'north' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_northbound_history scope=stock', async () => {
    const r = await handlers.get_northbound_history({ scope: 'stock', symbol: 'sh600519' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_northbound_holding_rank', async () => {
    // SDK 一次拉全量约 4-8 万条数据，实测耗时 100-150s（handler 内已 topN 截断响应）
    const r = await handlers.get_northbound_holding_rank({ market: 'shanghai', period: 'today', topN: 50 });
    expect(r).toBeDefined();
    const result = r as any;
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.data.length).toBeLessThanOrEqual(50);

    // 验证字段名修复（addShares 真存在 & 排序确实按 abs(addShares) desc）
    if (result.data.length >= 2) {
      expect(result.data[0]).toHaveProperty('addShares');
      expect(result.sortedBy).toBe('addShares(abs desc)');
      const a0 = Math.abs(result.data[0].addShares ?? 0);
      const a1 = Math.abs(result.data[1].addShares ?? 0);
      expect(a0).toBeGreaterThanOrEqual(a1);
    }
  }, 240000);
});

describeIf('Integration: hotspot.ts', () => {
  it('get_zt_pool type=zt', async () => {
    const r = await handlers.get_zt_pool({ type: 'zt' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_zt_pool type=broken', async () => {
    const r = await handlers.get_zt_pool({ type: 'broken' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_stock_changes', async () => {
    const r = await handlers.get_stock_changes({ type: 'large_buy' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_board_changes', async () => {
    const r = await handlers.get_board_changes({});
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);
});

describeIf('Integration: dragontiger.ts', () => {
  it('get_dragon_tiger_list', async () => {
    const r = await handlers.get_dragon_tiger_list({
      startDate: fmt(lastMonth),
      endDate: fmt(today),
    });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_dragon_tiger_stats type=stock_stats', async () => {
    const r = await handlers.get_dragon_tiger_stats({ type: 'stock_stats', period: '1month' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_dragon_tiger_stats type=institution', async () => {
    const r = await handlers.get_dragon_tiger_stats({
      type: 'institution',
      startDate: fmt(lastMonth),
      endDate: fmt(today),
    });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_dragon_tiger_stats type=branch_rank', async () => {
    const r = await handlers.get_dragon_tiger_stats({ type: 'branch_rank', period: '1month' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);
});

describeIf('Integration: margin.ts', () => {
  it('get_block_trade type=overview', async () => {
    const r = await handlers.get_block_trade({ type: 'overview' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_block_trade type=detail', async () => {
    const r = await handlers.get_block_trade({ type: 'detail' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_block_trade type=daily_stat', async () => {
    const r = await handlers.get_block_trade({ type: 'daily_stat' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_margin_data type=account', async () => {
    const r = await handlers.get_margin_data({ type: 'account' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);

  it('get_margin_data type=target', async () => {
    const r = await handlers.get_margin_data({ type: 'target' });
    expect(r).toBeDefined();
    expect((r as any).total).toBeGreaterThanOrEqual(0);
  }, TIMEOUT);
});

describeIf('Integration: enhanced compound tools', () => {
  it('analyze_stock should return all enhanced data fields with dataStatus', async () => {
    const r = await handlers.analyze_stock({ symbol: 'sh600519', period: 'daily' });
    expect(r).toBeDefined();
    const result = r as any;
    expect(result.dataStatus).toBeDefined();
    // dataStatus 现在是 { status, error? } 对象（修复 #7）
    for (const key of ['kline', 'fundFlow', 'fundFlowHistory', 'northboundHolding', 'dividends']) {
      expect(result.dataStatus[key].status).toMatch(/fulfilled|rejected/);
      if (result.dataStatus[key].status === 'rejected') {
        expect(typeof result.dataStatus[key].error).toBe('string');
      }
    }
    expect(result.kline).toBeDefined();
    expect(result.fundFlowHistory).toBeDefined();
    expect(result.northboundHolding).toBeDefined();
  }, 60000);

  it('get_market_overview should return all enhanced data fields with dataStatus', async () => {
    const r = await handlers.get_market_overview({});
    expect(r).toBeDefined();
    const result = r as any;
    expect(result.dataStatus).toBeDefined();
    // dataStatus 现在是 { status, error? } 对象（修复 #7）
    for (const key of ['indices', 'industry', 'concept', 'hkIndices', 'northbound', 'ztPool', 'dtPool', 'boardChanges']) {
      expect(result.dataStatus[key].status).toMatch(/fulfilled|rejected/);
    }
    expect(result.indices).toBeDefined();
    expect(result.industryTop10).toBeDefined();
    expect('ztCount' in result).toBe(true);
    expect('dtCount' in result).toBe(true);
    expect('boardChanges' in result).toBe(true);
    expect('northbound' in result).toBe(true);

    // 验证字段名修复（leadingStockChangePercent 不是 leadingStockChange）
    if (result.industryTop10.length > 0) {
      const top = result.industryTop10[0];
      expect(top).toHaveProperty('leadingStock');
      expect(top).toHaveProperty('leadingStockChangePercent');
      expect(top).not.toHaveProperty('leadingStockChange');
    }

    // 验证 sectorBreadth 重命名（修复 #9）
    expect(result.sectorBreadth).toHaveProperty('industryRiseBoardCount');
    expect(result.sectorBreadth).toHaveProperty('industryFallBoardCount');
    expect(result.sectorBreadth).not.toHaveProperty('industryRise');
  }, 60000);
});

describeIf('Integration: Skill workflow simulation', () => {
  // smart-money-tracker 工作流：模拟 Skill 文档中的多步调用
  // 实际场景中 LLM 串行调用，单步失败应可容忍 → 用 allSettled
  // 注意：剔除 holding_rank（单独测试，>2min），避免拖累整个 workflow
  it('smart-money-tracker workflow should chain successfully', async () => {
    const startDate = fmt(lastMonth);
    const endDate = fmt(today);

    const calls = await Promise.allSettled([
      handlers.get_northbound_realtime({}),
      handlers.get_dragon_tiger_stats({ type: 'institution', startDate, endDate }),
      handlers.get_dragon_tiger_stats({ type: 'stock_stats', period: '1month' }),
      handlers.get_block_trade({ type: 'overview' }),
      handlers.get_margin_data({ type: 'account' }),
      handlers.get_fund_flow_rank({ scope: 'stock' }),
      handlers.get_fund_flow_rank({ scope: 'sector', sectorType: 'industry' }),
      handlers.get_market_fund_flow({}),
    ]);

    const fulfilled = calls.filter((c) => c.status === 'fulfilled').length;
    // 至少 6/8 成功才算通过（允许 2 个网络抖动）
    expect(fulfilled).toBeGreaterThanOrEqual(6);
  }, 180000);

  // stock-analyst 工作流
  it('stock-analyst workflow uses analyze_stock', async () => {
    const r = await handlers.analyze_stock({ symbol: 'sh600519', period: 'daily' });
    expect(r).toBeDefined();
    expect((r as any).kline.data).toBeDefined();
    expect((r as any).fundFlowHistory).toBeDefined();
    expect((r as any).northboundHolding).toBeDefined();
  }, 60000);

  // market-overview 工作流
  it('market-overview workflow uses get_market_overview', async () => {
    const r = await handlers.get_market_overview({});
    expect(r).toBeDefined();
    expect((r as any).indices).toBeDefined();
    expect((r as any).industryTop10).toBeDefined();
  }, 60000);
});
