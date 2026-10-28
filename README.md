# Crypto Market Intelligence

Educational crypto market-data dashboard built with Next.js and TypeScript.

## Features
- Public MEXC spot ticker and candle ingestion (read-only)
- EMA, RSI, MACD and ATR indicators
- Historical candle view and a transparent, fee-aware educational backtest
- Market freshness/error status and signal-quality guardrails
- News/sentiment and persistent-worker integration points documented for later setup

## Safety
This is a research/education dashboard, not financial advice. It does not produce actionable leveraged futures LONG/SHORT calls, exact entry/stop-loss/take-profit instructions, or place orders. It shows market context and historical model behavior only. No order execution is implemented.

## Run
1. Install Node.js 20+.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

No exchange credentials are needed for public market data. Copy `.env.example` to `.env.local` only if configuring optional persistence.
