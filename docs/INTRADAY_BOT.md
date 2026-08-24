# 當沖自動交易機器人（TTM Squeeze + MACD + RSI）

一個「一天內多次進出場」的期貨當沖機器人，接 IBKR（盈透證券）Gateway，
指標對應 thinkorswim 圖表上常用的三個副圖：

| 圖表上的指標 | 機器人裡的角色 |
| --- | --- |
| **TTM_Squeeze**（擠壓點 + 動能柱） | 主訊號：擠壓釋放（squeeze fire）時，順著動能柱方向進場 |
| **MACD**（12/26/9） | 確認訊號：柱狀圖方向必須與進場方向一致 |
| **RSI**（14） | 濾網：多單要求 50–75（強但未超買）、空單 25–50 |
| VWAP | 額外趨勢濾網：多單需價格在 VWAP 之上、空單在其下（可關閉） |

> 圖上的 ImpVolatility 是選擇權隱含波動率，無法只靠價格 K 棒計算，
> 因此不在訊號內；如需 IV 濾網可再接 IBKR 的選擇權資料。

## 策略邏輯

**進場（多單；空單完全鏡像）** — 在「收完的 K 棒」上全部成立才進：

1. TTM 擠壓在最近 `FIRE_LOOKBACK`（預設 3）根內釋放，且釋放前擠壓至少持續
   `MIN_SQUEEZE_BARS`（預設 4）根；
2. 動能柱為正且持續走高；
3. MACD 柱狀圖 > 0；
4. RSI 落在 50–75；
5. 收盤價在當日 VWAP 之上。

**出場** — 任一成立即出：

- ATR 停損（預設 1.5×ATR）／ATR 停利（預設 2.5×ATR），實盤用 bracket
  掛單交給 IBKR 伺服器執行；
- 動能柱連續兩根轉弱，或 MACD 柱狀圖翻轉方向；
- 收盤前強制平倉（預設收盤前 10 分鐘），**絕不留倉過夜**。

**風控斷路器**（觸發後當天停止進場）：

- 單日最多 `MAX_TRADES_PER_DAY`（預設 6）筆；
- 單日虧損達 `MAX_DAILY_LOSS`（預設 500 美元）即停。

回測與實盤共用同一套訊號函式（`kerker/intraday_strategy.py`），
回測驗證過的邏輯就是實盤跑的邏輯。

## 安裝

```bash
pip install -r requirements.txt
cp .env.example .env   # 再依需求修改
```

預設商品是 **MES（微型 E-mini S&P 500，每點 5 美元）**，風險是 /ES 的
1/10，建議先用它試。要換 /ES：

```
INTRADAY_SYMBOL=ES
INTRADAY_POINT_VALUE=50
```

## 使用方式（建議照這個順序）

### 1. 回測（不需連 IBKR，可用 CSV）

```bash
# 用自己的 5 分 K CSV（欄位:datetime,open,high,low,close,volume）
python -m kerker backtest --csv bars.csv --trades

# 或直接抓 IBKR 歷史資料回測（需 Gateway 執行中）
python -m kerker backtest --duration "30 D" --trades
```

### 2. Dry-run（連 IBKR 即時行情，但**不下任何單**，只記錄訊號與模擬損益）

```bash
python -m kerker intraday
```

預設 `INTRADAY_DRY_RUN=1`。建議至少跑一到兩週，觀察 log 裡的
ENTRY/EXIT 與每日模擬損益。

### 3. 模擬帳戶實單（paper）

```.env
IBKR_PORT=4002        # Gateway paper
INTRADAY_DRY_RUN=0
```

此時進場會送出市價單 + 停損 + 停利的 bracket 組合單。

### 4. 真實帳戶

確認模擬帳戶長期表現後，自行把 `IBKR_PORT` 改為 4001。
**請務必先完成前三步。**

## 安全設計

- 預設 dry-run，不會送單;預設連 paper gateway(4002)。
- 實盤啟動時若帳戶已有同商品部位,機器人會拒絕啟動(避免重複下單)。
- 停損/停利掛在 IBKR 伺服器端(bracket),斷線也有保護。
- 收盤前強制平倉,不留隔夜風險。
- 單日交易次數與虧損上限。

## 風險提醒

期貨槓桿高,即使是 MES 也可能快速虧損。這個機器人是工具不是保證,
回測績效不代表未來報酬。請只用可承受損失的資金,並先在模擬環境驗證。

## 檔案結構

```
kerker/
  indicators.py         # TTM Squeeze / MACD / RSI / VWAP / ATR(純 pandas)
  intraday_strategy.py  # 進出場訊號 + 時段/風控(回測與實盤共用)
  backtest.py           # K 棒回測引擎 + 績效統計
  intraday_runner.py    # 實盤/dry-run 執行迴圈(ib_async)
  ibkr_client.py        # IBKR 連線、期貨合約、bracket 下單
  config.py             # 所有 INTRADAY_* 環境變數
tests/
  test_indicators.py
  test_intraday_strategy.py
  test_backtest.py
```
