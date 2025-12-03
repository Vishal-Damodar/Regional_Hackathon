import json
import requests
import yfinance as yf
import urllib3
from mcp.server.fastmcp import FastMCP

# =========================================================
# 1️⃣ SSL PATCHING (Isolated to this server only)
# =========================================================
# Suppress warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Patch top-level requests (standard workaround)
methods = ("get", "post", "delete", "options", "head", "patch", "put")
for method in methods:
    original = getattr(requests, method)
    def insecure_request(*args, original=original, **kwargs):
        kwargs["verify"] = False
        return original(*args, **kwargs)
    setattr(requests, method, insecure_request)

# Patch Session objects (critical for yfinance internals)
original_session_request = requests.Session.request
def insecure_session_request(self, method, url, *args, **kwargs):
    kwargs["verify"] = False
    return original_session_request(self, method, url, *args, **kwargs)
requests.Session.request = insecure_session_request

# =========================================================
# 2️⃣ MCP SERVER SETUP
# =========================================================
# We name the server "Finance Service"
mcp = FastMCP("Finance Service")

@mcp.tool()
def get_market_data(ticker: str) -> str:
    """
    Gets LIVE real-time stock price and recent news for a ticker symbol (e.g., AAPL, TSLA, MSFT).
    Returns a JSON string with price, currency, and news.
    """
    print(f"DEBUG: MCP Server received request for: {ticker}")
    
    try:
        ticker = ticker.upper().strip()
        
        # 1. SETUP SESSION
        session = None
        try:
            from curl_cffi import requests as c_requests
            print("DEBUG: curl_cffi detected. Using masqueraded session.")
            session = c_requests.Session(impersonate="chrome", verify=False)
        except ImportError:
            print("DEBUG: curl_cffi not found. Using standard requests.")
            session = requests.Session()
            session.verify = False

        # 2. Initialize Ticker
        stock = yf.Ticker(ticker, session=session)
        
        price = None
        currency = "USD"
        
        # 3. Fetch Price (fast_info -> info fallback strategy)
        try:
            price = stock.fast_info.get('last_price')
            currency = stock.fast_info.get('currency')
            
            if price is None:
                raise ValueError("fast_info returned None")
                
        except Exception as fast_info_err:
            print(f"DEBUG: fast_info failed ({fast_info_err}). Trying .info...")
            try:
                info = stock.info
                if info:
                    price = info.get('currentPrice') or info.get('regularMarketPrice')
                    currency = info.get('currency')
            except Exception as info_err:
                print(f"DEBUG: stock.info fetch failed: {info_err}")

        # 4. Fetch News
        news_items = []
        try:
            news_items = stock.news[:3] if stock.news else []
        except Exception:
            pass # Ignore news errors if price was found

        clean_news = [
            {"title": item.get("title"), "link": item.get("link")} 
            for item in news_items
        ]

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

# =========================================================
# 3️⃣ ENTRY POINT
# =========================================================
if __name__ == "__main__":
    # This runs the server over stdio (standard input/output)
    # This is how the MCP Client (your main app) will talk to it.
    mcp.run()