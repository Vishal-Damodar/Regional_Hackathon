import os
import json
import requests
import httpx
import random
import yfinance as yf  
import urllib3  
import pandas as pd # <-- NEW IMPORT
import pandas_ta as ta # <-- NEW IMPORT
from typing import List, Optional
from datetime import datetime, timedelta # <-- MODIFIED IMPORT (added timedelta)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# LangChain Imports
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv()

# =========================================================
# 1️⃣ BYPASS SSL ERRORS GLOBALLY (Required for some corporate environments)
# =========================================================
# Suppress the inevitable warnings that come from disabling SSL
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
    temperature=0  # Lower temperature for more deterministic tool usage
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


@tool
def check_inventory(sku_or_product_name: str):
    """
    Useful for checking stock levels, reorder points, and supplier lead times for products.
    Input should be a product name (e.g., 'Laptop') or SKU.
    """
    # Simple fuzzy search simulation
    results = []
    for sku, data in INVENTORY_DB.items():
        if sku_or_product_name.lower() in data['name'].lower() or sku_or_product_name.lower() in sku.lower():
            results.append(data)
    
    if not results:
        return f"No inventory records found for '{sku_or_product_name}'."
    return json.dumps(results)

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
    """
    Useful for healthcare queries. Checks for known drug interactions and severity.
    """
    drug_name = drug_name.lower()
    data = DRUG_DB.get(drug_name)
    if not data:
        return f"No interaction data found for {drug_name} in the knowledge base."
    return json.dumps(data)

# Bind all tools, including the new financial advisor
tools = [check_inventory, search_public_policy, get_market_data, check_drug_interaction, get_financial_advice] # <-- MODIFIED
llm_with_tools = llm.bind_tools(tools)

# =========================================================
# 4️⃣ FASTAPI APP SETUP
# =========================================================
app = FastAPI(title="Unified GenAI Orchestration Platform")

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

class ChatResponse(BaseModel):
    response: str
    used_tool: Optional[str] = None

@app.get("/")
def health_check():
    return {"status": "running", "mode": "Unified Orchestrator"}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        # 1. Construct the System Prompt based on context
        base_system_prompt = """You are a Unified Intelligent Assistant capable of handling Inventory, 
        Public Services, Financial Markets, and Healthcare queries.
        
        You have access to specific tools. 
        - If the user asks about stock/products, use 'check_inventory'.
        - If the user asks about city rules/permits, use 'search_public_policy'.
        - If the user asks about LIVE stock prices or news only, use 'get_market_data'.
        - If the user asks for a specific **BUY, SELL, or HOLD financial RECOMMENDATION** or stock analysis based on **technical analysis** or S&R, **ALWAYS use 'get_financial_advice'**.
        - If the user asks about medicine/safety, use 'check_drug_interaction'.
        
        Always answer in a helpful, professional tone suitable for the context. When using the financial advice tool, analyze the output and provide a clear, easy-to-understand recommendation to the user.""" # <-- UPDATED PROMPT

        messages = [
            SystemMessage(content=base_system_prompt),
            HumanMessage(content=request.message)
        ]

        # 2. Invoke LLM to see if it wants to use a tool
        ai_msg = llm_with_tools.invoke(messages)
        messages.append(ai_msg)

        tool_used = None
        
        # 3. If the LLM decided to call a tool (Function Calling)
        if ai_msg.tool_calls:
            for tool_call in ai_msg.tool_calls:
                tool_used = tool_call["name"]
                
                # Execute the specific tool
                selected_tool = {
                    "check_inventory": check_inventory,
                    "search_public_policy": search_public_policy,
                    "get_market_data": get_market_data,
                    "check_drug_interaction": check_drug_interaction,
                    "get_financial_advice": get_financial_advice # <-- NEW TOOL MAPPED
                }[tool_call["name"]]
                
                # Run the tool
                tool_output = selected_tool.invoke(tool_call["args"])
                
                # Append the tool result to conversation history
                messages.append(ToolMessage(tool_call_id=tool_call["id"], content=str(tool_output)))

            # 4. Final Invoke: Get the natural language answer based on tool output
            final_response = llm_with_tools.invoke(messages)
            return {"response": final_response.content, "used_tool": tool_used}
        
        # If no tool was needed (general chat)
        return {"response": ai_msg.content, "used_tool": "None"}

    except Exception as e:
        print(f"Error calling LLM: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Orchestrator Error: {str(e)}")

# To run: uvicorn main:app --reload --port 8000