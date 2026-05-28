# Stock SDK MCP Server

<p align="center">
  <img src="https://img.shields.io/npm/v/stock-sdk-mcp" alt="npm version">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="node version">
  <img src="https://img.shields.io/badge/OpenClaw-Compatible-orange" alt="OpenClaw Compatible">
  <img src="https://img.shields.io/badge/protocol-MCP-blue" alt="MCP Protocol">
  <img src="https://img.shields.io/badge/license-ISC-green" alt="license">
</p>

> **为 [OpenClaw](https://github.com/anthropics/clawdbot) 生态研发的股票行情 MCP + Skills 完整解决方案**

基于 [stock-sdk](https://www.npmjs.com/package/stock-sdk) 构建，本项目不仅提供底层的 **MCP (Model Context Protocol) Server**，还内置了一套专业的 **AI Skills (量化技能)** 和 **MCP Prompts**。它能让你的 AI 助手（如 Cursor、Claude、OpenClaw 等）瞬间化身为具备实时数据、技术分析和策略筛选能力的"顶级金融顾问"。

支持 **OpenClaw**、**Cursor**、**Claude Desktop**、**Antigravity**、**Gemini/Codex CLI** 等主流 AI 工具。


## ✨ 特性

## ⚠️ 当前数据源说明

> 本项目当前已修复 **个股资金流**、**南向实时/汇总**、**大盘/板块/个股资金流历史** 等主要资金流功能。
> 但 **北向实时分钟级完整曲线** 仍受公开免费数据源限制，暂未 100% 恢复。

### 已恢复 / 可正常使用

- `get_fund_flow`：已从失效的腾讯 `ff_` 接口切换到东方财富 `fflow/daykline`
- `get_fund_flow_rank`：个股/行业/概念/地域资金流排行可用
- `get_market_fund_flow`：大盘资金流历史趋势可用
- `get_stock_fund_flow_history`：个股资金流历史可用
- `get_sector_fund_flow_history`：板块资金流历史可用
- `get_northbound_realtime(direction="south")`：南向分钟级 + 汇总可用
- `get_northbound_realtime(direction="north")`：北向汇总可用，异常时提供 warning / snapshot / 替代逻辑

### 当前限制

- **北向实时分钟级完整曲线**：
  - 东方财富公开分钟源 `kamtbs.rtmin/get` 的北向 `s2n` 当前返回全 0
  - 通达信公开 `mod_hsgt.dll` 分钟接口实测北向数组也为全 0
  - 因此当前版本只能保证：
    - 北向 **汇总** 可用
    - 北向 **快照/替代逻辑** 可用
    - 北向 **完整分钟曲线** 暂不可稳定恢复

### 设计说明

这不是 MCP 包装层单点故障，更像是 **公开免费北向高频数据源整体收紧**。因此当前版本的目标是：

1. 修复已经明确失效的个股资金流接口；
2. 恢复南向分钟级与资金流主线功能；
3. 对北向分钟级缺失提供明确 warning，避免 AI 或用户误把全 0 当真数据。

如未来获得新的稳定公开源、券商专业终端接口或付费数据权限，可继续补全北向完整分钟级能力。

| 特性 | 描述 |
|------|------|
| 🌐 **多市场支持** | A 股（含沪深北、科创/创业板）、港股、美股（纳斯达克/纽交所/美交所）、公募基金 |
| 📊 **实时行情** | 获取最新价、涨跌幅、成交量、五档盘口、市盈率等 40+ 字段 |
| 📈 **K 线数据** | 日/周/月 K 线，以及 1/5/15/30/60 分钟级别 K 线 |
| 🧮 **技术指标** | 内置 MA/MACD/BOLL/KDJ/RSI/WR/BIAS/CCI/ATR 等常用指标计算 |
| 🏷️ **板块数据** | 行业板块、概念板块的行情、成分股、分钟 K 线 |
| 📦 **期货数据** | 国内/全球期货行情、K 线、仓单库存、COMEX 库存 |
| 📋 **期权数据** | 指数/ETF/商品期权报价、K 线、中金所期权、龙虎榜 |
| 💰 **扩展功能** | 资金流向、分红详情、交易日历、盘口大单 |
| 🚀 **批量查询** | 全市场行情一次性获取（5000+ A 股、2000+ 港股、8000+ 美股） |
| 🔮 **复合分析** | 个股全景分析、多股对比、条件选股、大盘概览、板块深度分析 |
| 💬 **MCP Prompts** | 内置股票分析师、选股器、大盘概览、持仓监控、期货概览等预设 Prompt |
| 📐 **Resource Templates** | 参数化资源模板，通过 URI 直接读取行情和 K 线数据 |
| 🏷️ **Tool Annotations** | 所有工具标注了 readOnlyHint、openWorldHint 等语义信息 |

## 📦 安装方式

### 方式一：npx 直接运行（推荐）

无需安装，在配置文件中直接使用 `npx`：

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

### 方式二：全局安装

```bash
npm install -g stock-sdk-mcp
```

安装后可直接运行 `stock-mcp` 命令。

### 方式三：本地开发安装

```bash
git clone https://github.com/chengzuopeng/stock-sdk-mcp.git
cd stock-sdk-mcp
yarn install
yarn build
```

或使用一键安装脚本：

```bash
./install.sh
```

---

## 🔧 AI 工具配置指南

### OpenClaw（推荐）

> 🎯 本项目专为 OpenClaw 生态设计，提供开箱即用的股票行情数据能力。

[OpenClaw](https://github.com/anthropics/clawdbot) 是一个开源的 MCP 网关，支持将多个 MCP Server 聚合为统一服务，可通过 HTTP API 在任意应用中调用。

#### 1. 在 OpenClaw 配置中注册此 MCP Server

编辑 `~/.clawdbot/config.yaml`：

```yaml
servers:
  stock-sdk:
    command: npx
    args:
      - "-y"
      - "stock-sdk-mcp"
    description: "股票行情数据服务 - 支持 A股/港股/美股实时行情和技术分析"
    tags:
      - finance
      - stock
      - market-data
```

#### 2. 启动 OpenClaw 网关

```bash
clawdbot gateway start
```

#### 3. 通过 HTTP API 调用

```bash
# 查询股票实时行情
curl -X POST http://localhost:8080/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "server": "stock-sdk",
    "tool": "get_quotes_by_query",
    "arguments": {
      "queries": ["茅台", "腾讯"]
    }
  }'

# 获取带技术指标的 K 线
curl -X POST http://localhost:8080/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "server": "stock-sdk",
    "tool": "get_kline_with_indicators",
    "arguments": {
      "symbol": "600519",
      "indicators": {"ma": {"periods": [5, 10, 20]}, "macd": true}
    }
  }'
```

这样，你可以在任何支持 HTTP 调用的应用中使用股票数据能力。

---

### Cursor IDE

配置文件路径：`~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

配置完成后，重启 Cursor 即可在对话中使用股票查询能力。

---

### Claude Desktop

配置文件路径：

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

---

### Antigravity（Gemini Pro in VS Code）

配置文件路径：`~/.antigravity/mcp.json`

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

---

### Codex CLI（OpenAI）

配置文件路径：`~/.codex/config.json`

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

---

### Gemini CLI（Google）

配置文件路径：`~/.gemini/settings.json`

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

---

## 🛠️ 可用 Tools

### 实时行情

| Tool | 描述 |
|------|------|
| `get_quotes_by_query` | **【推荐】** 按名称、代码或拼音获取行情，自动识别 A股/港股/美股 |
| `get_a_share_quotes` | 获取 A 股/指数实时行情（40+ 字段） |
| `get_hk_quotes` | 获取港股实时行情 |
| `get_us_quotes` | 获取美股实时行情 |
| `get_fund_quotes` | 获取公募基金实时净值 |
| `get_all_a_share_quotes` | **【批量】** 获取全市场 A 股行情（5000+ 只） |
| `get_all_hk_quotes` | **【批量】** 获取全市场港股行情（2000+ 只） |
| `get_all_us_quotes` | **【批量】** 获取全市场美股行情（8000+ 只） |

### K 线数据

| Tool | 描述 |
|------|------|
| `get_history_kline` | 获取 A 股历史 K 线（日/周/月） |
| `get_hk_history_kline` | 获取港股历史 K 线 |
| `get_us_history_kline` | 获取美股历史 K 线 |
| `get_minute_kline` | 获取 A 股分钟 K 线（1/5/15/30/60 分钟） |
| `get_today_timeline` | 获取 A 股当日分时走势 |
| `get_kline_with_indicators` | **【重要】** 获取带技术指标的 K 线（MA/MACD/BOLL/KDJ/RSI 等） |

### 板块数据

| Tool | 描述 |
|------|------|
| `get_industry_list` | 获取行业板块列表 |
| `get_industry_spot` | 获取行业板块实时行情 |
| `get_industry_constituents` | 获取行业板块成分股 |
| `get_industry_kline` | 获取行业板块 K 线（支持复权） |
| `get_industry_minute_kline` | 获取行业板块分钟 K 线/分时 |
| `get_concept_list` | 获取概念板块列表 |
| `get_concept_spot` | 获取概念板块实时行情 |
| `get_concept_constituents` | 获取概念板块成分股 |
| `get_concept_kline` | 获取概念板块 K 线（支持复权） |
| `get_concept_minute_kline` | 获取概念板块分钟 K 线/分时 |

### 期货数据 🆕

| Tool | 描述 |
|------|------|
| `get_futures_kline` | 获取国内期货历史 K 线（含持仓量） |
| `get_global_futures_spot` | 获取全球期货实时行情（原油、黄金、铜等） |
| `get_global_futures_kline` | 获取全球期货历史 K 线 |
| `get_futures_inventory_symbols` | 获取可查库存的期货品种列表 |
| `get_futures_inventory` | 获取期货仓单/库存数据 |
| `get_comex_inventory` | 获取 COMEX 黄金/白银库存 |

### 期权数据 🆕

| Tool | 描述 |
|------|------|
| `get_index_option_spot` | 获取指数期权 T 型报价（沪深300/中证1000等） |
| `get_index_option_kline` | 获取指数期权合约日 K 线 |
| `get_cffex_option_quotes` | 获取中金所期权实时行情列表 |
| `get_etf_option_months` | 获取 ETF 期权可用合约月份 |
| `get_etf_option_expire_day` | 获取 ETF 期权到期日信息 |
| `get_etf_option_minute` | 获取 ETF 期权合约分时数据 |
| `get_etf_option_daily_kline` | 获取 ETF 期权合约日 K 线 |
| `get_commodity_option_spot` | 获取商品期权 T 型报价 |
| `get_commodity_option_kline` | 获取商品期权合约日 K 线 |
| `get_option_lhb` | 获取期权龙虎榜数据 |

### 复合分析工具 🆕

| Tool | 描述 |
|------|------|
| `analyze_stock` | **【复合】** 个股全景分析（行情+K线+指标+资金流+分红） |
| `compare_stocks` | **【复合】** 多股对比分析（2-10 只股票并排对比） |
| `scan_market` | **【复合】** 条件选股（涨跌幅/量比/换手率/市盈率等过滤） |
| `get_market_overview` | **【复合】** 大盘概览（指数+行业TOP10+概念TOP10+涨跌统计；北向分钟线受公开源限制） |
| `get_sector_analysis` | **【复合】** 板块深度分析（行情+K线+龙头股） |

### 代码列表

| Tool | 描述 |
|------|------|
| `get_a_share_code_list` | 获取全部 A 股代码（5000+ 只） |
| `get_hk_code_list` | 获取全部港股代码（2000+ 只） |
| `get_us_code_list` | 获取全部美股代码（8000+ 只） |
| `get_fund_code_list` | 获取全部基金代码（26000+ 只） |

### 搜索

| Tool | 描述 |
|------|------|
| `search_stock` | 搜索股票（支持代码、名称、拼音模糊匹配） |

### 扩展功能

| Tool | 描述 |
|------|------|
| `get_fund_flow` | 获取个股/板块资金流向（当前已切换为东方财富资金流接口） |
| `get_panel_large_order` | 获取盘口大单占比 |
| `get_trading_calendar` | 获取 A 股交易日历 |
| `get_dividend_detail` | 获取分红派送详情 |

---

## 💬 MCP Prompts 🆕

内置预设 Prompt，所有支持 MCP 的 AI 客户端均可直接使用：

| Prompt | 描述 | 参数 |
|--------|------|------|
| `stock-analyst` | 个股技术分析专家 | `symbol`(必填), `period` |
| `stock-screener` | 智能选股器 | `conditions`(必填), `market` |
| `market-overview` | 大盘全景概览 | `scope` |
| `realtime-monitor` | 自选股实时监控 | `stocks`(必填), `costs` |
| `futures-overview` | 期货市场概览 | `scope` |

---

## 🧠 AI Skills (技能)

Skills 是一组预定义的"场景化指令"，将多个 MCP Tools 组合成专业的工作流。本项目专为 **OpenClaw** 提供了开箱即用的技能支持。

| Skill | 描述 | 包含步骤 |
|-------|------|----------|
| [股票技术分析专家](./skills/stock-analyst/SKILL.md) | 深度分析 K 线形态与指标 | 行情查询 -> 历史 K 线 -> 指标计算 (MACD/RSI/BOLL) -> 综合诊断 |
| [智能股票筛选器](./skills/stock-screener/SKILL.md) | 按策略筛选全市场标的 | 范围定位 (如科创板) -> 批量数据获取 -> 条件过滤 -> 排序输出 |
| [市场深度概览](./skills/market-overview/SKILL.md) | 快速把握全局行情 | 指数汇总 -> 行业/概念板块排名 -> 情绪评估 -> 简评报告 |
| [自选股实时监控](./skills/realtime-monitor/SKILL.md) | 持续跟踪并计算损益 | 批量行情监控 -> 异动检测 -> 持仓成本对比 -> 价格提醒 |

#### 💬 技能使用示例：
- **技术分析**："分析一下**腾讯**最近的走势，帮我看看 **MACD** 什么时候金叉？"
- **策略筛选**："帮我找出今天**科创板**里涨幅前 10 且**市盈率**低于 50 的股票。"
- **市场全局**："现在**盘面表现**如何？有哪些**热门概念**值得关注？"
- **损益监控**："查一下我的持仓：**茅台**买入价 1400，**美团**买入价 120。"

> 💡 关于如何在 OpenClaw、Cursor 等工具中使用这些技能，请参阅 [Skills 使用指南](./skills/README.md)。

---

## 📚 可用 Resources

### 静态资源

MCP Resources 是静态数据资源，可供 AI 主动读取：

| URI | 描述 |
|-----|------|
| `stock://calendar/trading` | A 股交易日历 |
| `stock://market/a-share/codes` | A 股代码列表 |
| `stock://market/hk/codes` | 港股代码列表 |
| `stock://market/us/codes` | 美股代码列表 |
| `stock://market/fund/codes` | 基金代码列表 |
| `stock://board/industry/list` | 行业板块列表 |
| `stock://board/concept/list` | 概念板块列表 |

### Resource Templates 🆕

参数化资源模板，通过 URI 直接读取动态数据：

| URI Template | 描述 | 示例 |
|-------------|------|------|
| `stock://quotes/{code}` | 个股实时行情 | `stock://quotes/sh600519` |
| `stock://kline/{code}/{period}` | 个股 K 线数据 | `stock://kline/600519/daily` |
| `stock://board/industry/{code}` | 行业板块详情 | `stock://board/industry/BK1027` |
| `stock://board/concept/{code}` | 概念板块详情 | `stock://board/concept/BK0800` |

---

## 💡 使用示例

配置完成后，你可以在 AI 对话中直接输入：

```
请帮我查询贵州茅台（600519）的实时行情

获取腾讯控股（00700）最近 30 天的日 K 线，并计算 MACD 和布林带

查看人工智能概念板块有哪些成分股，以及今天涨幅前 5 的股票

获取全市场科创板股票的实时行情，按涨幅排序

苹果公司最近的 RSI 指标是多少？是否超买？

帮我看看螺纹钢主力合约最近的走势

全球黄金期货现在什么价位？COMEX 库存最近变化如何？

帮我用 scan_market 找出今天换手率大于 10% 且涨幅大于 5% 的股票
```

---

## 🧑‍💻 本地开发

```bash
# 安装依赖
yarn install

# 开发模式（监听文件变化自动重新构建）
yarn dev

# 构建生产版本
yarn build

# 运行服务
yarn start

# 运行测试
yarn test
```

### 调试 MCP Server

你可以通过管道发送 JSON-RPC 消息来测试：

```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_quotes_by_query", "arguments": {"queries": ["茅台"]}}}' | node dist/index.js
```

---

## 📄 License

ISC © [chengzuopeng](https://github.com/chengzuopeng/stock-sdk-mcp)

---

## 🔗 相关链接

- [OpenClaw](https://github.com/anthropics/clawdbot) - MCP 网关
- [stock-sdk](https://www.npmjs.com/package/stock-sdk) - 核心 SDK 库
- [MCP Protocol](https://modelcontextprotocol.io) - Model Context Protocol 官方文档
- [Cursor](https://cursor.sh) - AI 代码编辑器
- [Claude Desktop](https://claude.ai/download) - Anthropic 桌面客户端
