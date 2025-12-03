import os
import json
import httpx
import random
import yfinance as yf  
import urllib3  
import pandas as pd # <-- NEW IMPORT
import pandas_ta as ta # <-- NEW IMPORT
from typing import List, Optional
from datetime import datetime, timedelta # <-- MODIFIED IMPORT (added timedelta)
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# LangChain Imports
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from langchain_mcp_adapters.client import MultiServerMCPClient
from dotenv import load_dotenv

load_dotenv()

# =========================================================
# 1️⃣ BYPASS SSL ERRORS GLOBALLY (Required for some corporate environments)
# =========================================================
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Patch top-level requests functions
methods = ("get", "post", "delete", "options", "head", "patch", "put")
for method in methods:
    original = getattr(requests, method)
    def insecure_request(*args, original=original, **kwargs):
        kwargs["verify"] = False
        return original(*args, **kwargs)
    setattr(requests, method, insecure_request)

# Patch Session objects because libraries like yfinance use them internally
original_session_request = requests.Session.request
def insecure_session_request(self, method, url, *args, **kwargs):
    kwargs["verify"] = False
    return original_session_request(self, method, url, *args, **kwargs)
requests.Session.request = insecure_session_request

client = httpx.Client(verify=False)

# Initialize the LLM
# IMPORTANT: Replace with your actual LLM endpoint and model if different
llm = ChatOpenAI(
    base_url="https://genailab.tcs.in",
    model="azure_ai/genailab-maas-DeepSeek-V3-0324",
    api_key=os.getenv("OPENAI_API_KEY"),
    http_client=client,
    temperature=0
)

# =========================================================
# 2️⃣ MOCK DATA LAYER (Hybrid Knowledge Base)
# =========================================================

INVENTORY_DB = {
    "SKU-001": {"name": "Laptop Pro X", "stock": 12, "reorder_level": 20, "supplier_lead_time": "5 days"},
    "SKU-002": {"name": "Wireless Mouse", "stock": 500, "reorder_level": 100, "supplier_lead_time": "2 days"},
    "SKU-003": {"name": "Monitor 4K", "stock": 5, "reorder_level": 15, "supplier_lead_time": "10 days"}
}

POLICY_DOCS = {
    "parking": "Residents can apply for a street parking permit if they live in Zone A. Cost is $50/year. Processing time is 3 business days.",
    "waste": "Garbage collection happens on Tuesdays. Large item pickup requires a scheduled appointment via the city portal.",
    "voting": "To vote in municipal elections, you must be registered 30 days prior. Polling stations open at 7 AM."
}

DRUG_DB = {
    "aspirin": {"interactions": ["warfarin", "ibuprofen"], "severity": "High", "description": "Increases bleeding risk."},
    "tylenol": {"interactions": ["alcohol"], "severity": "Moderate", "description": "Risk of liver damage."}
}

# =========================================================
# 3️⃣ TOOL DEFINITIONS (The "Hands" - including the new Financial Agent)
# =========================================================

# --- Utility Function for Session Setup ---
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


# Global storage
app_state = {
    "llm_with_tools": None, 
    "tools_map": {} 
}

# =========================================================
# 2️⃣ LOCAL TOOLS
# =========================================================
@tool
def check_inventory(sku_or_product_name: str):
    """Useful for checking stock levels."""
    print(f"🛠️ LOCAL TOOL: Checking inventory for {sku_or_product_name}")
    return json.dumps([{"name": "Laptop Pro", "stock": 12}])

@tool
def search_public_policy(query: str):
    """
    Useful for answering citizen questions about public services, rules, regulations, and permits.
    Input should be a specific topic like 'parking permit' or 'waste collection'.
    """
    query = query.lower()
    found_info = []
    for topic, content in POLICY_DOCS.items():
        if topic in query or query in topic:
            found_info.append(content)
    
    if not found_info:
        # Fallback to general search if direct match fails
        return "I searched the policy documents but couldn't find a specific match. Please contact the city clerk."
    return "\n".join(found_info)


@tool
def get_market_data(ticker: str):
    """
    Useful for financial analysis. Gets LIVE real-time stock price and recent news for a ticker symbol (e.g., AAPL, TSLA, MSFT) using Yahoo Finance.
    NOTE: Use get_financial_advice for BUY/SELL recommendations.
    """
    print(f"DEBUG: Entering get_market_data with ticker: {ticker}")
    try:
        ticker = ticker.upper()
        
        session = get_yf_session()
        stock = yf.Ticker(ticker, session=session)
        
        print(f"DEBUG: yf.Ticker object created for {ticker}. Fetching data...")
        
        price = None
        currency = "USD"
        
        # 3. Fetch Price (Try fast_info -> info)
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
                else:
                    pass
            except Exception:
                pass

        # 4. Fetch News
        news_items = []
        try:
            news_items = stock.news[:3] if stock.news else []
        except Exception:
            pass

        clean_news = [
            {"title": item.get("title"), "link": item.get("link")} 
            for item in news_items
        ]

        if not price:
            return f"Could not fetch price data for {ticker}. Check ticker validity."

        data = {
            "ticker": ticker,
            "current_price": round(price, 2),
            "currency": currency,
            "latest_news": clean_news
        }
        return json.dumps(data)
        
    except Exception as e:
        print(f"DEBUG: CRITICAL ERROR in get_market_data: {e}")
        return f"Error fetching market data for {ticker}: {str(e)}"


# --- 🌟 NEW TOOL: The Financial Advisor Agent Logic 🌟 ---
# --- 🌟 NEW TOOL: The Financial Advisor Agent Logic (FIXED VERSION) 🌟 ---
@tool
def get_financial_advice(ticker: str):
    """
    The expert Financial Advisor. Useful for technical analysis, calculating Support/Resistance (S&R), 
    and generating a specific BUY, SELL, or HOLD recommendation for a stock ticker. 
    Requires at least 60 days of historical data for analysis.
    """
    print(f"DEBUG: Entering get_financial_advice with ticker: {ticker}")
    ticker = ticker.upper()
    
    try:
        session = get_yf_session()
        stock = yf.Ticker(ticker, session=session)

        # 1. Fetch Historical Data (Last 90 days of daily data)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90) 
        
        history = stock.history(start=start_date, end=end_date, interval="1d")
        
        if history.empty or len(history) < 60:
            return f"Error: Insufficient historical data found for {ticker} (need min 60 days)."
        
        df = pd.DataFrame(history)
        
        # 2. Calculate Technical Indicators (FIXED LOGIC HERE)
        
        # --- FIXED: Calculate Pivot Points using direct ta.pivot_points() ---
        R1, S1 = None, None # Initialize S&R values
        try:
            # Pass the High, Low, Close series directly to the function
            pp_df = ta.pivot_points(
                df['High'], df['Low'], df['Close'], 
                # We append later, so we omit append=True here if using direct call
            )
            # Merge the resulting DataFrame back into the main DF
            df = pd.merge(df, pp_df, left_index=True, right_index=True, how='left')
            print("DEBUG: Pivot Points calculated and merged.")
        except Exception as e:
            # If PP calculation fails, we just move on
            print(f"DEBUG: Pivot Points calculation failed: {e}. S&R advice will be limited.")

        # Calculate RSI (This usually works fine with .ta)
        df.ta.rsi(append=True)
        
        # Calculate Moving Averages 
        df.ta.sma(length=20, append=True, col_names=['SMA_20'])
        df.ta.sma(length=50, append=True, col_names=['SMA_50'])
        
        # Get the latest data point
        latest = df.iloc[-1]
        
        # 3. Extract Values (Using improved checks for None/NaN)
        latest_price = latest['Close']
        
        # Pivot Point Resistance (PP_R1) and Support (PP_S1)
        # Check for column existence and then check for NaN/None
        if 'PP_R1' in latest and pd.notna(latest['PP_R1']):
            R1 = latest['PP_R1']
        
        if 'PP_S1' in latest and pd.notna(latest['PP_S1']):
            S1 = latest['PP_S1']
        
        rsi_value = latest['RSI_14']
        sma_50 = latest['SMA_50']
        
        # 4. Generate the Buy/Sell Signal and Reasoning
        recommendation = "HOLD"
        reasoning = []

        # Define proximity for S&R check (e.g., within 1.5% of the level)
        PROXIMITY_THRESHOLD = 0.015 
        
        # --- BUY Logic (Near Support / Oversold) ---
        if rsi_value < 35 and latest_price < sma_50:
            recommendation = "STRONG BUY"
            reasoning.append(f"Stock is **OVERSOLD** (RSI: {round(rsi_value, 2)}).")
            if S1 is not None and (S1 * (1 - PROXIMITY_THRESHOLD)) < latest_price < (S1 * (1 + PROXIMITY_THRESHOLD)):
                reasoning.append(f"It is currently **bouncing off a key Support level (S1: {round(S1, 2)})**.")
            else:
                reasoning.append(f"Trading below the 50-day average, indicating potential value.")

        elif rsi_value < 45 and latest_price > sma_50:
            recommendation = "BUY"
            reasoning.append(f"The stock is in an uptrend (above 50-day SMA: {round(sma_50, 2)}) and showing strength after a dip (RSI: {round(rsi_value, 2)}).")

        # --- SELL/AVOID Logic (Near Resistance / Overbought) ---
        elif rsi_value > 75 and latest_price > sma_50:
            recommendation = "STRONG SELL"
            reasoning.append(f"Stock is heavily **OVERBOUGHT** (RSI: {round(rsi_value, 2)}).")
            if R1 is not None and (R1 * (1 - PROXIMITY_THRESHOLD)) < latest_price < (R1 * (1 + PROXIMITY_THRESHOLD)):
                reasoning.append(f"It is currently **struggling at a key Resistance level (R1: {round(R1, 2)})**.")
            else:
                reasoning.append(f"Trading well above its 50-day average, suggesting a correction is due.")

        elif rsi_value > 65 and latest_price < sma_50:
            recommendation = "SELL"
            reasoning.append(f"Stock is **Overbought** (RSI: {round(rsi_value, 2)}) but failing to hold the 50-day average. A downward move is likely.")

        # --- HOLD/NEUTRAL Logic ---
        else:
            recommendation = "HOLD"
            reasoning.append(f"The stock is trading neutrally (RSI: {round(rsi_value, 2)}). No strong S&R or momentum signal for immediate action.")

        # 5. Compile and Return the Result
        advice_data = {
            "ticker": ticker,
            "recommendation": recommendation,
            "current_price": round(latest_price, 2),
            "key_indicators": {
                "RSI_14": round(rsi_value, 2),
                "SMA_50": round(sma_50, 2),
                "Resistance_R1": round(R1, 2) if R1 is not None else "N/A",
                "Support_S1": round(S1, 2) if S1 is not None else "N/A"
            },
            "reasoning": " ".join(reasoning)
        }
        
        return json.dumps(advice_data)
        
    except Exception as e:
        print(f"DEBUG: Financial Advice Error: {e}")
        return f"Error running financial analysis for {ticker}: {str(e)}. Check ticker symbol or data availability."

@tool
def check_drug_interaction(drug_name: str):
    """Useful for drug interaction queries."""
    return "No interactions found."

# Bind all tools, including the new financial advisor
tools = [check_inventory, search_public_policy, get_market_data, check_drug_interaction, get_financial_advice] # <-- MODIFIED
llm_with_tools = llm.bind_tools(tools)

# =========================================================
# 3️⃣ LIFESPAN (Stateless Initialization)
# =========================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n🔄 LIFESPAN: Initializing MCP Client...")
    
    # 1. Instantiate Client (Stateless Factory)
    # We do NOT use 'async with' here.
    mcp_client = MultiServerMCPClient({
        "finance": {
            "command": "python",
            "args": ["finance_server.py"], 
            "transport": "stdio"
        }
    })

    try:
        # 2. Fetch Tools (This opens a temporary connection)
        # The client will start the server, get tools, and kill the server automatically.
        mcp_tools = await mcp_client.get_tools()
        print(f"✅ LIFESPAN: Loaded {len(mcp_tools)} MCP tools: {[t.name for t in mcp_tools]}")

        # 3. Combine & Index
        all_tools = local_tools + mcp_tools
        app_state["tools_map"] = {t.name: t for t in all_tools}
        
        # 4. Bind to LLM
        app_state["llm_with_tools"] = llm.bind_tools(all_tools)
        
        yield
        
    except Exception as e:
        print(f"❌ LIFESPAN ERROR: {e}")
        raise e
    
    # 5. NO CLEANUP REQUIRED
    # Since the client is stateless, there is no .close() method to call.
    print("🛑 LIFESPAN: Application shutdown.")

# =========================================================
# 4️⃣ FASTAPI APP
# =========================================================
app = FastAPI(title="Unified GenAI Orchestration Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    user_context: Optional[str] = "general" 

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    print(f"\n📩 REQUEST: {request.message}")
    
    model = app_state["llm_with_tools"]
    tools_map = app_state["tools_map"]
    
    if not model:
        raise HTTPException(status_code=500, detail="System not initialized.")

    messages = [
        SystemMessage(content="You are a helpful assistant. Use 'get_market_data' for stock prices."),
        HumanMessage(content=request.message)
    ]

    # 1. First LLM Call
    print("🤖 AI: Thinking...")
    ai_msg = model.invoke(messages)
    messages.append(ai_msg)

    # 2. Check for Tool Calls
    if ai_msg.tool_calls:
        print("⚙️ TOOL CALL DETECTED!")
        
        for tool_call in ai_msg.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            tool_id = tool_call["id"]
            
            print(f"👉 EXECUTING: {tool_name} with args: {tool_args}")
            
            selected_tool = tools_map.get(tool_name)
            
            if selected_tool:
                try:
                    # EXECUTE TOOL
                    # Note: For MCP tools, this will internally:
                    # Start Process -> Run Tool -> Stop Process
                    tool_output = await selected_tool.ainvoke(tool_args)
                    
                    print(f"✅ TOOL OUTPUT: {str(tool_output)}...")
                    
                    messages.append(ToolMessage(
                        tool_call_id=tool_id,
                        content=str(tool_output)
                    ))
                except Exception as e:
                    print(f"❌ TOOL ERROR: {e}")
                    messages.append(ToolMessage(
                        tool_call_id=tool_id,
                        content=f"Error executing tool: {str(e)}"
                    ))
            else:
                print(f"⚠️ Warning: Tool '{tool_name}' not found.")

        # 3. Final LLM Call
        print("🤖 AI: Generating final response...")
        final_response = model.invoke(messages)
        return {"response": final_response.content, "tool_used": str(ai_msg.tool_calls)}

    return {"response": ai_msg.content, "tool_used": "None"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
