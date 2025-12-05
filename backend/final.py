import os
import json
import re
from typing import Dict, Any, List, Literal, Optional
from neo4j import GraphDatabase
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import httpx


# --- Configuration ---
class Config:
    """Centralized configuration"""
    NEO4J_URI = os.getenv("NEO4J_URI", "neo4j://127.0.0.1:7687")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "Kuldip1234##")
    OPENAI_API_KEY = "sk-IaiNQwSQfEZN7c3FlwBbMQ"
    BASE_URL = "https://genailab.tcs.in"
    MODEL = "azure/genailab-maas-gpt-4o"
os.environ["OPEN_API_KEY"]=Config.OPENAI_API_KEY
# --- Data Models ---
class SMEProfile(BaseModel):
    """SME profile with validation"""
    sme_size: Literal['Micro', 'Small', 'Medium']
    udyam_status: bool
    sector_category: Literal['Manufacturing', 'Service', 'Trading']
    financial_performance: str 
    location_state: str 
    project_value: float 
    project_need_description: str = Field(description="User's description of what they need money for")

# --- Smart Grant Search with Sector Flexibility ---
def find_matching_grants(sme: SMEProfile, driver) -> List[Dict]:
    """
    Find grants with intelligent sector matching:
    - Exact match (e.g., "Manufacturing")
    - "All Verticals" grants (universal)
    - Partial match (e.g., "Manufacturing (Energy Intensive)")
    """
    
    session = driver.session()
    keywords = sme.project_need_description.replace(" ", "~ OR ") + "~"
    
    # Smart query that handles "All Verticals" and partial sector matches
    query = f"""
    CALL db.index.fulltext.queryNodes("grant_keywords", "{keywords}") 
    YIELD node AS g, score
    WHERE 
        // Size filter
        EXISTS {{ MATCH (g)-[:ELIGIBLE_FOR_SIZE]->(s) WHERE s.name = '{sme.sme_size}' }} 
        
        AND
        
        // Sector filter (smart matching):
        // 1. Exact match: "Manufacturing"
        // 2. Universal: "All Verticals" (with or without parentheses)
        // 3. Partial match: Contains "Manufacturing"
        (
            EXISTS {{ 
                MATCH (g)-[:TARGETS_VERTICAL]->(v) 
                WHERE v.name = '{sme.sector_category}'
                   OR v.name STARTS WITH 'All Verticals'
                   OR v.name CONTAINS '{sme.sector_category}'
            }}
        )
        
        AND
        
        // Location filter (optional - national grants have no geographic filter)
        (
            NOT EXISTS {{ MATCH (g)-[:HAS_GEOGRAPHIC_FILTER]->(r) }} 
            OR EXISTS {{ MATCH (g)-[:HAS_GEOGRAPHIC_FILTER]->(r) WHERE r.name = '{sme.location_state}' }}
        )
        
        AND
        
        // Value filter (clean currency format)
        toInteger(replace(replace(replace(g.max_value, '$', ''), ',', ''), ' ', '')) >= {int(sme.project_value)}
    
    RETURN {{
        id: g.id,
        title: g.name,
        funding_type: g.funding_type,
        max_value: g.max_value,
        description: g.description,
        match_score: score,
        target_verticals: [(g)-[:TARGETS_VERTICAL]->(v) | v.name],
        supported_technologies: [(g)-[:USES_TECH]->(t) | t.name],
        eligible_sizes: [(g)-[:ELIGIBLE_FOR_SIZE]->(s) | s.name],
        geographic_coverage: [(g)-[:HAS_GEOGRAPHIC_FILTER]->(r) | r.name],
        eligibility_criteria: [(g)-[:REQUIRES_CRITERION]->(c) | {{
            type: c.type, 
            description: c.description
        }}]
    }} AS grant_data
    ORDER BY score DESC
    LIMIT 10
    """
    
    print(f"🔍 Searching grants for: {sme.project_need_description}")
    print(f"   Filters: {sme.sme_size} | {sme.sector_category} | {sme.location_state} | ≥₹{sme.project_value:,.0f}\n")
    
    try:
        result = session.run(query)
        matches = [record["grant_data"] for record in result]
        
        if matches:
            print(f"✅ Found {len(matches)} matching grants!\n")
        else:
            print(f"⚠️  No grants found. Trying relaxed search...\n")
            # Try without budget constraint
            matches = find_grants_relaxed(sme, driver)
        
        return matches
        
    except Exception as e:
        print(f"❌ Search error: {e}")
        return []
    finally:
        session.close()

# --- Relaxed Search (Remove Budget Constraint) ---
def find_grants_relaxed(sme: SMEProfile, driver) -> List[Dict]:
    """
    Fallback search without budget constraint
    """
    session = driver.session()
    keywords = sme.project_need_description.replace(" ", "~ OR ") + "~"
    
    query = f"""
    CALL db.index.fulltext.queryNodes("grant_keywords", "{keywords}") 
    YIELD node AS g, score
    WHERE 
        EXISTS {{ MATCH (g)-[:ELIGIBLE_FOR_SIZE]->(s) WHERE s.name = '{sme.sme_size}' }} 
        AND
        (
            EXISTS {{ 
                MATCH (g)-[:TARGETS_VERTICAL]->(v) 
                WHERE v.name = '{sme.sector_category}'
                   OR v.name STARTS WITH 'All Verticals'
                   OR v.name CONTAINS '{sme.sector_category}'
            }}
        )
    RETURN {{
        id: g.id,
        title: g.name,
        funding_type: g.funding_type,
        max_value: g.max_value,
        match_score: score,
        target_verticals: [(g)-[:TARGETS_VERTICAL]->(v) | v.name],
        supported_technologies: [(g)-[:USES_TECH]->(t) | t.name],
        eligible_sizes: [(g)-[:ELIGIBLE_FOR_SIZE]->(s) | s.name],
        geographic_coverage: [(g)-[:HAS_GEOGRAPHIC_FILTER]->(r) | r.name],
        eligibility_criteria: [(g)-[:REQUIRES_CRITERION]->(c) | {{
            type: c.type, 
            description: c.description
        }}]
    }} AS grant_data
    ORDER BY score DESC
    LIMIT 10
    """
    
    try:
        result = session.run(query)
        matches = [record["grant_data"] for record in result]
        print(f"✅ Relaxed search found {len(matches)} grants (ignoring budget limit)\n")
        return matches
    except Exception as e:
        print(f"❌ Relaxed search failed: {e}")
        return []
    finally:
        session.close()

# --- LLM-Enhanced Grant Ranking ---
def rank_grants_with_llm(grants: List[Dict], sme: SMEProfile) -> List[Dict]:
    """
    Use LLM to rank and explain grant relevance
    """
    if not grants or len(grants) <= 1:
        return grants
    
    print("🧠 Using AI to rank and explain grant matches...\n")
    
    # Prepare grant summaries for LLM
    grant_summaries = []
    for i, g in enumerate(grants):
        summary = f"""
Grant {i+1}: {g['title']}
- Funding: {g['funding_type']} (Max: {g['max_value']})
- Sectors: {', '.join(g.get('target_verticals', []))}
- Technologies: {', '.join(g.get('supported_technologies', [])[:3])}
- Eligibility: {len(g.get('eligibility_criteria', []))} criteria
"""
        grant_summaries.append(summary)
    
    prompt = f"""You are an SME grant advisor. Rank these grants for an SME with this profile:
- Size: {sme.sme_size}
- Sector: {sme.sector_category}
- Need: {sme.project_need_description}
- Budget: ₹{sme.project_value:,.0f}
- Location: {sme.location_state}
- Udyam: {'Registered' if sme.udyam_status else 'Not Registered'}

Available Grants:
{''.join(grant_summaries)}

Provide a ranked list (1 to {len(grants)}) with brief 1-sentence explanations of fit.
Format: "1. Grant Title - Reason"
"""
    
    try:
        client = httpx.Client(verify=False, timeout=30.0)
        llm = ChatOpenAI(
            base_url=Config.BASE_URL,
            model=Config.MODEL,
            api_key=Config.OPENAI_API_KEY,
            http_client=client,
            temperature=0
        )
        
        response = llm.invoke(prompt).content
        print("📊 AI Ranking:\n" + "="*80)
        print(response)
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"⚠️  AI ranking unavailable: {e}\n")
    
    return grants

# --- Pretty Print Results ---
def print_grant_results(grants: List[Dict], sme: SMEProfile):
    """Format and display grant results with match explanations"""
    if not grants:
        print("⚠️  No matching grants found")
        return
    
    for i, grant in enumerate(grants, 1):
        print(f"\n{'='*80}")
        print(f"🎯 GRANT #{i}: {grant.get('title', 'N/A')}")
        print(f"{'='*80}")
        
        # Basic Info
        print(f"📋 Grant ID: {grant.get('id', 'N/A')}")
        print(f"💰 Funding Type: {grant.get('funding_type', 'N/A')}")
        print(f"💵 Maximum Value: {grant.get('max_value', 'N/A')}")
        print(f"⭐ Match Score: {grant.get('match_score', 0):.2f}")
        
        # Match Explanation
        sectors = grant.get('target_verticals', [])
        is_universal = any('All Verticals' in s for s in sectors)
        
        print(f"\n✨ Why This Matches:")
        print(f"   • Keywords match: '{sme.project_need_description}'")
        print(f"   • Eligible for {sme.sme_size} SMEs")
        if is_universal:
            print(f"   • Universal grant (All Verticals - includes {sme.sector_category})")
        else:
            print(f"   • Sector match: {', '.join(sectors)}")
        
        if not grant.get('geographic_coverage'):
            print(f"   • National coverage (no location restrictions)")
        else:
            print(f"   • Geographic match: {', '.join(grant['geographic_coverage'])}")
        
        # Details
        if grant.get('target_verticals'):
            print(f"\n📊 Target Sectors: {', '.join(grant['target_verticals'])}")
        
        if grant.get('eligible_sizes'):
            print(f"📏 Eligible Sizes: {', '.join(grant['eligible_sizes'])}")
        
        if grant.get('supported_technologies'):
            techs = grant['supported_technologies']
            print(f"💡 Technologies: {', '.join(techs[:5])}")
            if len(techs) > 5:
                print(f"   ... and {len(techs)-5} more")
        
        if grant.get('eligibility_criteria'):
            print(f"\n✅ Key Eligibility Requirements:")
            for j, criteria in enumerate(grant['eligibility_criteria'][:5], 1):
                ctype = criteria.get('type', 'N/A')
                desc = criteria.get('description', 'N/A')
                print(f"   {j}. [{ctype}] {desc[:100]}")
            
            if len(grant['eligibility_criteria']) > 5:
                print(f"   ... and {len(grant['eligibility_criteria'])-5} more criteria")

# --- Generate Application Checklist ---
def generate_application_checklist(grant: Dict, sme: SMEProfile, driver) -> str:
    """
    Generate a personalized application checklist using LLM
    """
    print(f"\n📝 Generating application guide for: {grant['title']}...\n")
    
    criteria_text = "\n".join([
        f"- [{c['type']}] {c['description']}" 
        for c in grant.get('eligibility_criteria', [])
    ])
    
    prompt = f"""Create a practical application checklist for this grant:

Grant: {grant['title']}
Funding Type: {grant['funding_type']}
Max Amount: {grant['max_value']}

Eligibility Criteria:
{criteria_text}

SME Profile:
- Size: {sme.sme_size}
- Sector: {sme.sector_category}  
- Project: {sme.project_need_description}
- Budget: ₹{sme.project_value:,.0f}
- Udyam: {'Yes' if sme.udyam_status else 'No'}

Provide:
1. Pre-qualification check (do they meet requirements?)
2. Required documents list
3. Application steps
4. Tips for success

Keep it concise and actionable."""

    try:
        client = httpx.Client(verify=False, timeout=30.0)
        llm = ChatOpenAI(
            base_url=Config.BASE_URL,
            model=Config.MODEL,
            api_key=Config.OPENAI_API_KEY,
            http_client=client,
            temperature=0.3
        )
        
        response = llm.invoke(prompt).content
        return response
        
    except Exception as e:
        return f"⚠️  Could not generate checklist: {e}"

# --- Main Execution ---
def main():
    """Main execution function"""
    print("🚀 SME Grant Matching System\n")
    
    # Connect to Neo4j
    try:
        driver = GraphDatabase.driver(
            Config.NEO4J_URI, 
            auth=(Config.NEO4J_USER, Config.NEO4J_PASSWORD)
        )
        driver.verify_connectivity()
        print("✅ Connected to Neo4j\n")
    except Exception as e:
        print(f"❌ Neo4j connection failed: {e}")
        return
    
    # Define SME profile
    sme_data = SMEProfile(
        sme_size="Medium",
        udyam_status=False,
        sector_category="Manufacturing",
        financial_performance="Profitable",
        location_state="Karnataka",
        project_value=10000000.0,
        project_need_description="solar panels"
    )
    
    print(f"🏢 SME PROFILE:")
    print(f"{'='*80}")
    print(f"   Company Size: {sme_data.sme_size}")
    print(f"   Sector: {sme_data.sector_category}")
    print(f"   Location: {sme_data.location_state}")
    print(f"   Project Need: {sme_data.project_need_description}")
    print(f"   Project Budget: ₹{sme_data.project_value:,.0f}")
    print(f"   Udyam Status: {'✅ Registered' if sme_data.udyam_status else '❌ Not Registered'}")
    print(f"   Financial Health: {sme_data.financial_performance}")
    print(f"{'='*80}\n")
    
    # Search for matching grants
    results = find_matching_grants(sme_data, driver)
    
    if results:
        # Rank with AI
        results = rank_grants_with_llm(results, sme_data)
        
        # Display results
        print_grant_results(results, sme_data)
        
        # Generate application guide for top match
        if results:
            print("\n" + "="*80)
            print("📋 APPLICATION GUIDE FOR TOP MATCH")
            print("="*80)
            checklist = generate_application_checklist(results[0], sme_data, driver)
            print(checklist)
        
        # Export to JSON
        output_file = "grant_matches.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\n\n💾 Full results saved to: {output_file}")
        
    else:
        print("\n⚠️  No grants found matching your criteria.")
        print("\n💡 SUGGESTIONS:")
        print("   1. Try different keywords (e.g., 'renewable energy', 'clean energy')")
        print("   2. Consider a lower budget requirement")
        print("   3. Check available sectors in your database")
    
    driver.close()
    print("\n✅ Analysis complete!")

if __name__ == "__main__":
    main()