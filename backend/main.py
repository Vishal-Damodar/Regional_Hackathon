import os
import requests
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

# =========================================================
# 1️⃣ BYPASS SSL ERRORS GLOBALLY (Requests + HTTPX)
# =========================================================
# This section monkey-patches requests to ignore SSL verification
methods = ("get", "post", "delete", "options", "head", "patch", "put")
for method in methods:
    original = getattr(requests, method)
    def insecure_request(*args, original=original, **kwargs):
        kwargs["verify"] = False
        return original(*args, **kwargs)
    setattr(requests, method, insecure_request)

# Create an insecure httpx client for the LLM
client = httpx.Client(verify=False)

# Initialize the LLM with your specific configuration
# Note: Ensure you have connectivity to genailab.tcs.in
llm = ChatOpenAI(
    base_url="https://genailab.tcs.in",
    model="azure_ai/genailab-maas-DeepSeek-V3-0324",
    api_key=os.getenv("OPENAI_API_KEY"), # ideally, use os.getenv("API_KEY") in production
    http_client=client
)

# =========================================================
# 2️⃣ FASTAPI APP SETUP
# =========================================================
app = FastAPI(title="DeepSeek Chatbot API")

# Configure CORS to allow the React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@app.get("/")
def health_check():
    return {"status": "running", "model": "DeepSeek-V3"}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        # Invoke the LLM
        # Using invoke() is standard for newer LangChain versions
        result = llm.invoke(request.message)
        
        # Extract content from the AIMessage object
        response_text = result.content if hasattr(result, 'content') else str(result)
        
        return {"response": response_text}
    except Exception as e:
        print(f"Error calling LLM: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM Error: {str(e)}")

# To run this file:
# uvicorn main:app --reload --port 8000