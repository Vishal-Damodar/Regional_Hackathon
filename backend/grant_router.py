from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Literal, List, Dict, Union, Optional
from neo4j import GraphDatabase

# Import logic and config from your existing 'final.py'
from final import (
    Config, 
    SMEProfile as InternalSMEProfile, 
    find_matching_grants, 
    rank_grants_with_llm
)

router = APIRouter(
    prefix="/api/v1/grants",
    tags=["Grant Discovery"]
)

# --- API Input Model ---
# This matches the specific fields you requested
class GrantSearchRequest(BaseModel):
    SME_Size: Literal['Micro', 'Small', 'Medium'] = Field(..., description="Must be an exact match with SME Size Eligibility.")
    Udyam_Status: bool = Field(..., description="Must be True if Must-Have Criterion 1 requires Udyam Registration.")
    Sector_Category: Literal['Manufacturing', 'Service', 'Trading'] = Field(..., description="Must overlap with Target Vertical(s).")
    Financial_Performance: Union[str, float, int] = Field(..., description="Numeric or Description (e.g., 'Cash Profit')")
    Location_State: str = Field(..., description="Must match the Additional Geographic Filter if one is present.")
    Project_Value: float = Field(..., description="Must be less than or equal to Maximum Project Value (INR).")
    
    # Required because 'final.py' logic needs text for fulltext search keywords
    Project_Need_Description: str = Field(..., description="Description of the project need (e.g., 'solar panels') used for keyword matching.")

# --- Database Dependency ---
def get_neo4j_driver():
    """Creates a temporary connection for the request"""
    driver = GraphDatabase.driver(
        Config.NEO4J_URI, 
        auth=(Config.NEO4J_USER, Config.NEO4J_PASSWORD)
    )
    try:
        yield driver
    finally:
        driver.close()

# --- The Endpoint ---
@router.post("/search", response_model=List[Dict])
async def search_grants(
    payload: GrantSearchRequest, 
    driver = Depends(get_neo4j_driver)
):
    """
    Accepts SME Profile data and returns a JSON list of matching grants.
    """
    try:
        # 1. Map API Input (Title_Case) to Internal Logic Model (snake_case)
        # Note: Converting Financial_Performance to string as 'final.py' expects str
        internal_profile = InternalSMEProfile(
            sme_size=payload.SME_Size,
            udyam_status=payload.Udyam_Status,
            sector_category=payload.Sector_Category,
            financial_performance=str(payload.Financial_Performance),
            location_state=payload.Location_State,
            project_value=payload.Project_Value,
            project_need_description=payload.Project_Need_Description
        )

        # 2. Execute Search Logic (from final.py)
        # We suppress print statements in the console by simply not capturing them,
        # but the functions will still print to server logs.
        raw_matches = find_matching_grants(internal_profile, driver)

        # 3. Apply LLM Ranking (from final.py)
        # This will return the list of dicts directly
        ranked_matches = rank_grants_with_llm(raw_matches, internal_profile)

        return ranked_matches

    except Exception as e:
        # Log the error internally here if needed
        raise HTTPException(status_code=500, detail=f"Error processing grant search: {str(e)}")