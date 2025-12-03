import json
import requests
import uvicorn
from fastapi import FastAPI
import yfinance as yf
import urllib3
import pandas as pd
from datetime import datetime, timedelta
from mcp.server.fastmcp import FastMCP
from langsmith import traceable
from langsmith.middleware import TracingMiddleware

# =========================================================
# 1️⃣ SSL PATCHING (Isolated to this server)
# =========================================================

app = FastAPI(title="Finance MCP Server")

# This reads 'langsmith-trace' headers from incoming requests
app.add_middleware(TracingMiddleware) 

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Patch top-level requests
methods = ("get", "post", "delete", "options", "head", "patch", "put")
for method in methods:
    original = getattr(requests, method)
    def insecure_request(*args, original=original, **kwargs):
        kwargs["verify"] = False
        return original(*args, **kwargs)
    setattr(requests, method, insecure_request)

# Patch Session objects
original_session_request = requests.Session.request
def insecure_session_request(self, method, url, *args, **kwargs):
    kwargs["verify"] = False
    return original_session_request(self, method, url, *args, **kwargs)
requests.Session.request = insecure_session_request

# =========================================================
# 2️⃣ HELPER FUNCTIONS
# =========================================================
def get_yf_session():
    """Returns a yfinance-compatible session with SSL verification disabled."""
    session = requests.Session()
    session.verify = False
    try:
        from curl_cffi import requests as c_requests
        # Use curl_cffi for robustness if available
        return c_requests.Session(impersonate="chrome", verify=False)
    except ImportError:
        # Fallback to standard requests session
        return session

# =========================================================
# 3️⃣ MCP SERVER SETUP & TOOLS
# =========================================================
mcp = FastMCP(name="Finance Service")

@traceable(run_type="tool", name="Market Data Fetcher")
@mcp.tool()
def get_market_data(ticker: str) -> str:
    """
    Useful for financial analysis. Gets LIVE real-time stock price and recent news for a ticker symbol (e.g., AAPL, TSLA, MSFT).
    Returns a JSON string.
    """
    print(f"DEBUG [Finance MCP]: Fetching market data for: {ticker}")
    
    try:
        ticker = ticker.upper().strip()
        session = get_yf_session()
        stock = yf.Ticker(ticker, session=session)
        
        price = None
        currency = "USD"
        
        # Fetch Price
        try:
            price = stock.fast_info.get('last_price')
            currency = stock.fast_info.get('currency')
            if price is None:
                raise ValueError("fast_info returned None")
        except Exception:
            try:
                info = stock.info
                if info:
                    price = info.get('currentPrice') or info.get('regularMarketPrice')
                    currency = info.get('currency')
            except Exception:
                pass

        # Fetch News
        news_items = []
        try:
            news_items = stock.news[:3] if stock.news else []
        except Exception:
            pass

        clean_news = [{"title": i.get("title"), "link": i.get("link")} for i in news_items]

        if not price:
            return f"Could not fetch price data for {ticker}."

        data = {
            "ticker": ticker,
            "current_price": round(price, 2),
            "currency": currency,
            "latest_news": clean_news
        }
        return json.dumps(data)

    except Exception as e:
        return f"Error in Finance MCP Server: {str(e)}"


@traceable(run_type="tool", name="Financial Analyst Logic")
@mcp.tool()
def get_financial_advice(ticker: str) -> str:
    """
    The expert Financial Advisor. Useful for technical analysis, calculating Support/Resistance (S&R), 
    and generating a specific BUY, SELL, or HOLD recommendation. 
    Requires at least 60 days of historical data.
    """
    print(f"DEBUG [Finance MCP]: Generating financial advice for: {ticker}")
    ticker = ticker.upper()
    
    try:
        session = get_yf_session()
        stock = yf.Ticker(ticker, session=session)

        # 1. Fetch Historical Data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90) 
        history = stock.history(start=start_date, end=end_date, interval="1d")
        
        if history.empty or len(history) < 60:
            return f"Error: Insufficient historical data found for {ticker} (need min 60 days)."
        
        df = pd.DataFrame(history)
        
        # 2. Calculate Indicators
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['SMA_50'] = df['Close'].rolling(window=50).mean()

        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI_14'] = 100 - (100 / (1 + rs))
        
        df['Pivot'] = (df['High'] + df['Low'] + df['Close']) / 3
        df['PP_R1'] = (2 * df['Pivot']) - df['Low']
        df['PP_S1'] = (2 * df['Pivot']) - df['High']

        # 3. Analysis Logic
        latest = df.iloc[-1]
        latest_price = latest['Close']
        rsi_value = latest['RSI_14']
        sma_50 = latest['SMA_50']
        
        R1 = latest['PP_R1'] if pd.notna(latest['PP_R1']) else None
        S1 = latest['PP_S1'] if pd.notna(latest['PP_S1']) else None
        
        recommendation = "HOLD"
        reasoning = []
        PROXIMITY_THRESHOLD = 0.015 
        
        # Logic
        if rsi_value < 35 and latest_price < sma_50:
            recommendation = "STRONG BUY"
            reasoning.append(f"Stock is OVERSOLD (RSI: {round(rsi_value, 2)}).")
        elif rsi_value < 45 and latest_price > sma_50:
            recommendation = "BUY"
            reasoning.append(f"Stock in uptrend (above 50-SMA) and showing strength.")
        elif rsi_value > 75 and latest_price > sma_50:
            recommendation = "STRONG SELL"
            reasoning.append(f"Stock is OVERBOUGHT (RSI: {round(rsi_value, 2)}).")
        elif rsi_value > 65 and latest_price < sma_50:
            recommendation = "SELL"
            reasoning.append(f"Stock failing to hold 50-day average.")
        else:
            recommendation = "HOLD"
            reasoning.append(f"Neutral trading conditions.")

        # 4. Return Result
        advice_data = {
            "ticker": ticker,
            "recommendation": recommendation,
            "current_price": round(latest_price, 2),
            "key_indicators": {
                "RSI_14": round(rsi_value, 2),
                "SMA_50": round(sma_50, 2),
                "R1": round(R1, 2) if R1 else "N/A",
                "S1": round(S1, 2) if S1 else "N/A"
            },
            "reasoning": " ".join(reasoning)
        }
        
        return json.dumps(advice_data)

    except Exception as e:
        return f"Error running financial analysis for {ticker}: {str(e)}"
    
app.mount("/mcp", mcp.sse_app())

if __name__ == "__main__":
    # Run as a web server on a specific port (e.g., 8001)
    uvicorn.run(app, host="0.0.0.0", port=8001)