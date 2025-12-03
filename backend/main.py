import os
import json
import shutil
import httpx
import requests
import random
from typing import List, Optional, Annotated
from typing_extensions import TypedDict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# LangChain Imports
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_community.document_loaders import PyPDFLoader
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

# LangGraph Imports
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver

from langsmith import traceable

load_dotenv()

# =========================================================
# 1️⃣ BYPASS SSL ERRORS GLOBALLY
# =========================================================
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Patch requests
methods = ("get", "post", "delete", "options", "head", "patch", "put")
for method in methods:
    original = getattr(requests, method)
    def insecure_request(*args, original=original, **kwargs):
        kwargs["verify"] = False
        return original(*args, **kwargs)
    setattr(requests, method, insecure_request)

# Patch Session
original_session_request = requests.Session.request
def insecure_session_request(self, method, url, *args, **kwargs):
    kwargs["verify"] = False
    return original_session_request(self, method, url, *args, **kwargs)
requests.Session.request = insecure_session_request

client = httpx.Client(verify=False)

llm = ChatOpenAI(
    base_url="https://genailab.tcs.in",
    model="azure_ai/genailab-maas-DeepSeek-V3-0324",
    api_key=os.getenv("OPENAI_API_KEY"),
    http_client=client,
    temperature=0
)

# =========================================================
# 2️⃣ MOCK DATA LAYER (Local Knowledge Base)
# =========================================================
INVENTORY_DB = {
    "SKU-001": {"name": "Laptop Pro X", "stock": 12, "reorder_level": 20},
    "SKU-002": {"name": "Wireless Mouse", "stock": 500, "reorder_level": 100},
}
POLICY_DOCS = {
    "parking": "Residents can apply for a street parking permit if they live in Zone A.",
}
DRUG_DB = {
    "aspirin": {"interactions": ["warfarin", "ibuprofen"], "severity": "High"},
}

# =========================================================
# 🆕 SELF-LEARNING LAYER
# =========================================================
FEEDBACK_FILE = "agent_rules.json"

def load_rules():
    if os.path.exists(FEEDBACK_FILE):
        try:
            with open(FEEDBACK_FILE, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []
    return []

def save_rule(trigger: str, instruction: str):
    rules = load_rules()
    # Avoid duplicates
    if not any(r['trigger'] == trigger and r['instruction'] == instruction for r in rules):
        rules.append({"trigger": trigger, "instruction": instruction})
        with open(FEEDBACK_FILE, "w") as f:
            json.dump(rules, f, indent=2)
        print(f"🧠 LEARNING: Added new rule for '{trigger}'")

# =========================================================
# 3️⃣ RAG SETUP & TOOLS
# =========================================================
DB_DIR = "./chroma_db"

def get_vectorstore():
    """Returns the persistent vector store connection."""
    return Chroma(
        persist_directory=DB_DIR, 
        embedding_function=OpenAIEmbeddings(
            base_url="https://genailab.tcs.in",
            api_key=os.getenv("OPENAI_API_KEY"),
            model="azure_ai/genailab-maas-text-embedding-3-small",
            http_client=client 
        )
    )

@tool
def search_financial_reports(query: str):
    """
    Useful for answering qualitative questions about company strategy, risks, 
    and earnings reports based on uploaded PDF documents.
    """
    print(f"🔎 RAG: Searching persistent DB for '{query}'...")
    try:
        vectorstore = get_vectorstore()
        retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
        relevant_docs = retriever.invoke(query)
        
        if not relevant_docs:
            return "No relevant financial information found in the uploaded documents."
            
        context = "\n\n".join([doc.page_content for doc in relevant_docs])
        return context
    except Exception as e:
        return f"Error retrieving documents: {str(e)}"

@tool
def check_inventory(sku_or_product_name: str):
    """Useful for checking stock levels."""
    print(f"🛠️ LOCAL TOOL: Checking inventory for {sku_or_product_name}")
    results = []
    for sku, data in INVENTORY_DB.items():
        if sku_or_product_name.lower() in data['name'].lower() or sku_or_product_name.lower() in sku.lower():
            results.append(data)
    if not results:
        return f"No inventory records found for '{sku_or_product_name}'."
    return json.dumps(results)

@tool
def search_public_policy(query: str):
    """Useful for answering citizen questions about public services and rules."""
    query = query.lower()
    found_info = []
    for topic, content in POLICY_DOCS.items():
        if topic in query or query in topic:
            found_info.append(content)
    if not found_info:
        return "No specific policy found."
    return "\n".join(found_info)

@tool
def check_drug_interaction(drug_name: str):
    """Useful for drug interaction queries."""
    drug_name = drug_name.lower()
    data = DRUG_DB.get(drug_name)
    if not data:
        return "No interactions found."
    return json.dumps(data)

local_tools = [check_inventory, search_public_policy, check_drug_interaction, search_financial_reports]

app_state = {
    "graph": None
}

# =========================================================
# 4️⃣ LANGGRAPH DEFINITION
# =========================================================

class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

def create_agent_graph(tools_list):
    memory = MemorySaver()
    llm_with_tools = llm.bind_tools(tools_list)

    def agent_node(state: State):
        # 1. LOAD RULES (Self-Learning Context)
        rules = load_rules()
        # Handle case where state["messages"] might be empty initially (rare but possible)
        if not state["messages"]:
             user_msg = ""
        else:
             user_msg = state["messages"][-1].content
        
        if isinstance(user_msg, str):
            relevant_instructions = [
                r["instruction"] for r in rules 
                if r["trigger"].lower() in user_msg.lower()
            ]
        else:
            relevant_instructions = []
        
        system_prompt = "You are a helpful assistant."
        if relevant_instructions:
            system_prompt += f"\n\n⚠️ IMPORTANT USER RULES:\n- " + "\n- ".join(relevant_instructions)
            
        # Prepend the system prompt dynamically
        messages = [SystemMessage(content=system_prompt)] + state["messages"]
        return {"messages": [llm_with_tools.invoke(messages)]}

    workflow = StateGraph(State)
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", ToolNode(tools_list))

    workflow.add_edge(START, "agent")
    workflow.add_conditional_edges("agent", tools_condition)
    workflow.add_edge("tools", "agent")

    # 🆕 CRITICAL CHANGE: Interrupt before tools execute
    return workflow.compile(
        checkpointer=memory, 
        interrupt_before=["tools"] 
    )

# =========================================================
# 5️⃣ LIFESPAN
# =========================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n🔄 LIFESPAN: Initializing MCP Client...")
    
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)
        print(f"📁 LIFESPAN: Created vector DB directory at {DB_DIR}")

    mcp_client = MultiServerMCPClient({
        "finance": {
            "transport": "sse",  # <--- CHANGED
            "url": "http://localhost:8001/mcp/sse", # <--- Endpoint defined by mcp.mount_fastapi
        }
    })

    try:
        print("⏳ LIFESPAN: Connecting to Finance MCP Server...")
        mcp_tools = await mcp_client.get_tools()    
        print(f"✅ LIFESPAN: Loaded {len(mcp_tools)} MCP tools")

        all_tools = local_tools + mcp_tools
        
        print("📊 LIFESPAN: Compiling LangGraph with Memory...")
        app_state["graph"] = create_agent_graph(all_tools)
        print("🚀 LIFESPAN: Graph Ready.")
        
        yield
        
    except Exception as e:
        print(f"❌ LIFESPAN ERROR: {e}")
        raise e
    
    print("🛑 LIFESPAN: Application shutdown.")

# =========================================================
# 6️⃣ FASTAPI APP
# =========================================================
app = FastAPI(title="Unified GenAI Platform (HITL Enabled)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: Optional[str] = None
    thread_id: str = "default_session"
    action: Optional[str] = None # "resume" or "feedback"
    feedback_text: Optional[str] = None 

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    graph = app_state["graph"]
    if not graph:
        raise HTTPException(status_code=500, detail="System not initialized")

    config = {"configurable": {"thread_id": request.thread_id}}

    # CASE A: Standard User Message
    if not request.action:
        inputs = {"messages": [HumanMessage(content=request.message)]}
        # Run until interrupt or finish
        result = await graph.ainvoke(inputs, config=config)
        
        # Check if we stopped because of an interrupt at "tools"
        snapshot = graph.get_state(config)
        if snapshot.next and snapshot.next[0] == "tools":
            # Extract the tool call to show the user
            last_msg = snapshot.values["messages"][-1]
            if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
                tool_call = last_msg.tool_calls[0]
                return {
                    "response": f"I want to execute: {tool_call['name']} with args {tool_call['args']}. Do you approve?",
                    "status": "requires_approval",
                    "tool_call": tool_call
                }
        
        # If no interrupt, return final response
        return {"response": result["messages"][-1].content, "status": "completed"}

    # CASE B: User Approves ("resume")
    elif request.action == "resume":
        print("▶️ RESUMING Graph execution...")
        # Passing None resumes execution from the saved state
        result = await graph.ainvoke(None, config=config)
        return {"response": result["messages"][-1].content, "status": "completed"}

    # CASE C: User Corrects ("feedback")
    elif request.action == "feedback":
        print("🛑 FEEDBACK RECEIVED. Saving rule...")
        # 1. Save the new rule
        snapshot = graph.get_state(config)
        # Find the last human message to use as the "Trigger"
        msgs = snapshot.values["messages"]
        last_human_msg = next((m for m in reversed(msgs) if isinstance(m, HumanMessage)), None)
        
        trigger_text = last_human_msg.content if last_human_msg else "general"
        save_rule(trigger=trigger_text, instruction=request.feedback_text)
        
        # 2. Inject correction and force retry
        correction_msg = HumanMessage(content=f"STOP. Don't do that. New Rule: {request.feedback_text}. Try again.")
        result = await graph.ainvoke({"messages": [correction_msg]}, config=config)
        
        return {"response": result["messages"][-1].content, "status": "corrected"}
    
    
@app.post("/ingest")
@traceable(run_type="chain", name="PDF Ingestion Pipeline") # <--- NEW: Wraps this in a trace
async def ingest_document(file: UploadFile = File(...)):
    print(f"📥 INGEST: Received file {file.filename}")
    file_path = f"temp_{file.filename}"
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)
        
        if not splits:
            return {"status": "error", "message": "No text could be extracted."}

        vectorstore = get_vectorstore()
        vectorstore.add_documents(splits)
        print(f"✅ INGEST: Added {len(splits)} chunks to DB.")
        
        return {"status": "success", "chunks_added": len(splits), "filename": file.filename}

    except Exception as e:
        print(f"❌ INGEST ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)