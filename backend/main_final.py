from fastapi import FastAPI
import uvicorn
from grant_router import router as grant_router

app = FastAPI(title="SME Grant Matcher API")

# Include the router
app.include_router(grant_router)

@app.get("/")
def health_check():
    return {"status": "active", "system": "SME Grant Matcher"}

if __name__ == "__main__":
    # Run using: python main.py
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)