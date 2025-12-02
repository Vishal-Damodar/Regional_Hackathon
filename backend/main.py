import os
import json
import requests
import httpx
import random
import yfinance as yf  # <--- NEW IMPORT
import urllib3  # <--- NEW IMPORT for suppressing warnings
from typing import List, Optional
from datetime import datetime

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
# 1️⃣ BYPASS SSL ERRORS GLOBALLY (Requests + HTTPX)
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

# NEW: Patch Session objects because libraries like yfinance use them internally
original_session_request = requests.Session.request
def insecure_session_request(self, method, url, *args, **kwargs):
    kwargs["verify"] = False
    return original_session_request(self, method, url, *args, **kwargs)
requests.Session.request = insecure_session_request

client = httpx.Client(verify=False)

# Initialize the LLM
llm = ChatOpenAI(
    base_url="https://genailab.tcs.in",
    model="azure_ai/genailab-maas-DeepSeek-V3-0324",
    api_key=os.getenv("OPENAI_API_KEY"),
    http_client=client,
    temperature=0  # Lower temperature for more deterministic tool usage
)

# =========================================================
# 2️⃣ MOCK DATA LAYER (The "Hybrid Knowledge Base")
# =========================================================
# In a real scenario, these would be SQL DBs and Vector Stores

# Problem 1 & 5: Inventory & Supply Chain Data
INVENTORY_DB = {
    "SKU-001": {"name": "Laptop Pro X", "stock": 12, "reorder_level": 20, "supplier_lead_time": "5 days"},
    "SKU-002": {"name": "Wireless Mouse", "stock": 500, "reorder_level": 100, "supplier_lead_time": "2 days"},
    "SKU-003": {"name": "Monitor 4K", "stock": 5, "reorder_level": 15, "supplier_lead_time": "10 days"}
}

# Problem 2: Public Service Policies (Text chunks)
POLICY_DOCS = {
    "parking": "Residents can apply for a street parking permit if they live in Zone A. Cost is $50/year. Processing time is 3 business days.",
    "waste": "Garbage collection happens on Tuesdays. Large item pickup requires a scheduled appointment via the city portal.",
    "voting": "To vote in municipal elections, you must be registered 30 days prior. Polling stations open at 7 AM."
}

# Problem 4: Drug Interactions
DRUG_DB = {
    "aspirin": {"interactions": ["warfarin", "ibuprofen"], "severity": "High", "description": "Increases bleeding risk."},
    "tylenol": {"interactions": ["alcohol"], "severity": "Moderate", "description": "Risk of liver damage."}
}

# =========================================================
# 3️⃣ TOOL DEFINITIONS (The "Hands")
# =========================================================
# We define tools that the LLM can choose to call based on the user query.

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
    """
    print(f"DEBUG: Entering get_market_data with ticker: {ticker}")
    try:
        ticker = ticker.upper()
        
        # 1. SETUP SESSION (Handle SSL issues for both requests and curl_cffi)
        session = None
        try:
            # Check if curl_cffi is available (yfinance prefers it if installed)
            from curl_cffi import requests as c_requests
            print("DEBUG: curl_cffi detected. Creating session with verify=False.")
            session = c_requests.Session(impersonate="chrome", verify=False)
        except ImportError:
            print("DEBUG: curl_cffi not found. Using standard requests Session with verify=False.")
            session = requests.Session()
            session.verify = False

        # 2. Initialize Ticker with the session
        stock = yf.Ticker(ticker, session=session)
        
        print(f"DEBUG: yf.Ticker object created for {ticker}. Fetching data...")
        
        price = None
        currency = "USD"
        
        # 3. Fetch Price (Try fast_info -> info)
        try:
            price = stock.fast_info.get('last_price')
            currency = stock.fast_info.get('currency')
            
            # CRITICAL FIX: Explicitly check if price is None to trigger fallback
            if price is None:
                print("DEBUG: fast_info returned None. Raising error to trigger fallback...")
                raise ValueError("fast_info returned None")
                
            print(f"DEBUG: fast_info success. Price: {price}")
        except Exception as fast_info_err:
            print(f"DEBUG: fast_info failed ({fast_info_err}). Trying .info...")
            try:
                # Fallback to .info (with null check to prevent crash)
                info = stock.info
                if info:
                    price = info.get('currentPrice') or info.get('regularMarketPrice')
                    currency = info.get('currency')
                else:
                    print("DEBUG: stock.info is None.")
            except Exception as info_err:
                print(f"DEBUG: stock.info fetch failed: {info_err}")

        # 4. Fetch News
        news_items = []
        try:
            news_items = stock.news[:3] if stock.news else []
        except Exception as news_err:
             print(f"DEBUG: news fetch failed: {news_err}")

        clean_news = [
            {"title": item.get("title"), "link": item.get("link")} 
            for item in news_items
        ]

        if not price:
            return f"Could not fetch price data for {ticker}. Check SSL settings or ticker validity."

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

# Bind tools to the LLM
tools = [check_inventory, search_public_policy, get_market_data, check_drug_interaction]
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
    user_context: Optional[str] = "general" # Can be 'inventory_manager', 'citizen', 'trader', etc.

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
        # This aligns the "Persona" as discussed in our solution analysis
        base_system_prompt = """You are a Unified Intelligent Assistant capable of handling Inventory, 
        Public Services, Financial Markets, and Healthcare queries.
        
        You have access to specific tools. 
        - If the user asks about stock/products, use 'check_inventory'.
        - If the user asks about city rules/permits, use 'search_public_policy'.
        - If the user asks about LIVE stock prices, trading, or financial news, use 'get_market_data'.
        - If the user asks about medicine/safety, use 'check_drug_interaction'.
        
        Always answer in a helpful, professional tone suitable for the context."""

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
                    "check_drug_interaction": check_drug_interaction
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
        # For debugging, it's often helpful to return the error
        raise HTTPException(status_code=500, detail=f"Orchestrator Error: {str(e)}")

# To run: uvicorn main:app --reload --port 8000