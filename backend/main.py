import os
import json
import shutil
import httpx
import requests
import random
import re
import uuid
import time
import smtplib # NEW
from urllib.parse import urljoin
from typing import List, Optional, Annotated, Literal, Dict
from typing_extensions import TypedDict
from contextlib import asynccontextmanager
import subprocess
from pydantic import ValidationError

from dotenv import load_dotenv
from bs4 import BeautifulSoup

# Scrapy Imports
import scrapy
from scrapy.crawler import CrawlerProcess

# FastAPI & Pydantic
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

# Database
from neo4j import GraphDatabase

# LangChain Imports
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_community.document_loaders import PyPDFLoader
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

# LangGraph Imports
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver
from fastapi.staticfiles import StaticFiles

# LangSmith Imports
from langsmith import traceable

load_dotenv()


# =========================================================
# 1️⃣ CONFIGURATION & CREDENTIALS
# =========================================================
NEO4J_URI = "bolt://127.0.0.1:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "KushalKuldipSuhas"
DB_DIR = "./chroma_db"
SCRAPE_DIR = "scraped_docs"
CRAWL_OUTPUT_FILE = "crawler_results.json"
PROMPT_FILE = "extraction_rules.txt"



DEFAULT_PROMPT = f"""
    Role
You are an expert Data Extraction AI specialized in analyzing government documents, grant schemes, and funding opportunity announcements.

Task
Analyze the provided document text and extract specific structured data into a JSON object.

Important: If the document contains some of the required data but is missing a few fields, add appropriate data by yourself based on context, logical inference, or general knowledge. Do not leave fields empty if they can be reasonably populated.

Critical Instruction: Relevance Check
Before extracting any data, evaluate if the document is relevant.

The document IS RELEVANT if it describes:
* A government grant, scheme, or subsidy.
* A loan program or equity funding opportunity.
* An incentive program (e.g., PLI - Production Linked Incentive).

The document is IRRELEVANT if it is:
* A receipt, invoice, or personal letter unrelated to funding.
* A general news article without specific scheme details.
* Completely empty or unintelligible.

IF THE DOCUMENT IS IRRELEVANT:
* Return strictly the string: "abort"
* Do not return JSON. Do not return any other text.

IF THE DOCUMENT IS RELEVANT:
1. Extract the fields defined below and return a valid JSON object.
2. Extraction Schema
3. name (str): Official name of the grant or scheme.
4. funding_type (str): One of ['Subsidy', 'Loan', 'Grant', 'Equity']. Note: 'Production Linked Incentives' (PLI) count as 'Subsidy'.
5. max_value (str | null): Maximum monetary value/outlay (e.g., '19,500 Crore', '50 Lakhs').
6. max_subsidy (str | null): Specific subsidy amount or percentage per beneficiary (e.g., 'Rs 2.20 per Watt peak').
7. verticals (List[str]): Target industries (e.g., ['Solar', 'Renewable Energy', 'Textiles']).
8. tech_focus (List[str]): Specific technologies mentioned (e.g., ['Polysilicon', 'Wafer', 'Cells']).
9. size_eligibility (List[str]): Target business sizes (e.g., ['Large', 'Micro', 'Small']). Infer 'Large' if the scheme requires GW scale or massive capex.
10. geo_filter (List[str]): Specific applicable states/regions. Use ['Pan-India'] if applicable to the whole country.
11. country (List[str]): Countries applicable. Infer 'India' if INR currency or Indian ministries are mentioned.
12. criterion_1 (str): Primary mandatory eligibility criterion (e.g., capacity requirements).
13. criterion_2 (str): Secondary mandatory eligibility criterion.
14. description (str): Description of the grant or scheme.

Output Format
* Return ONLY valid JSON or the string "abort".
* No markdown formatting (like ```json).
    """


def get_current_prompt():
    """Loads the latest self-learned prompt or returns default."""
    if os.path.exists(PROMPT_FILE):
        with open(PROMPT_FILE, "r") as f:
            return f.read()
    return DEFAULT_PROMPT

def update_prompt(new_prompt_text):
    """Saves the optimized prompt."""
    with open(PROMPT_FILE, "w") as f:
        f.write(new_prompt_text)


# =========================================================
# 2️⃣ SCRAPY SPIDER DEFINITION
# =========================================================
class IredaCrawlerSpider(scrapy.Spider):
    """
    A Scrapy Spider designed to crawl a scheme page and its linked pages (BFS).
    """
    name = 'ireda_crawler'
    # Custom settings defined inside the class for encapsulation
    custom_settings = {
        'DEPTH_PRIORITY': 1,
        'SCHEDULER_DISK_QUEUE': 'scrapy.squeues.PickleFifoDiskQueue',
        'SCHEDULER_MEMORY_QUEUE': 'scrapy.squeues.FifoMemoryQueue',
        'DEPTH_LIMIT': 1, # Crawl depth (Start page + 1 click deep)
        'CLOSESPIDER_PAGECOUNT': 10, # Limit total pages to prevent infinite crawling
        'LOG_LEVEL': 'INFO',
        'REQUEST_FINGERPRINTER_IMPLEMENTATION': '2.7',
        'DOWNLOAD_HANDLERS': {
            'https': 'scrapy.core.downloader.handlers.http.HTTPDownloadHandler',
        },
    }

    def __init__(self, start_url=None, *args, **kwargs):
        super(IredaCrawlerSpider, self).__init__(*args, **kwargs)
        self.start_urls = [start_url] if start_url else []
        self.pdf_xpath = '//a[contains(@href, ".pdf")] | //*[contains(@onclick, "open_doc")]'
        self.url_pattern_onclick = re.compile(r"open_doc\('([^']+)'\)")

    def parse(self, response):
        # 1. Extract PDFs
        pdf_elements = response.xpath(self.pdf_xpath)
        for element in pdf_elements:
            pdf_url = None
            
            # Check JS links
            onclick_content = element.xpath('@onclick').get()
            if onclick_content:
                match = self.url_pattern_onclick.search(onclick_content)
                if match:
                    pdf_url = response.urljoin(match.group(1))

            # Check standard links
            if not pdf_url:
                href_content = element.xpath('@href').get()
                if href_content and href_content.lower().endswith('.pdf'):
                    pdf_url = response.urljoin(href_content)

            if pdf_url:
                yield {
                    'source_url': response.url,
                    'pdf_link': pdf_url
                }

        # 2. Follow Links (BFS)
        # Only follow internal links to avoid crawling the whole internet
        all_links = response.xpath('//a/@href').getall()
        for href in all_links:
            full_url = response.urljoin(href)
            # Basic domain restriction logic
            if response.url.split('/')[2] in full_url: 
                yield response.follow(full_url, callback=self.parse)

# =========================================================
# 3️⃣ CRAWLER PROCESS WRAPPER
# =========================================================
def run_crawler_process(start_url: str, output_file: str):
    """
    Isolated function to run Scrapy in a separate process.
    """
    # Remove old results
    if os.path.exists(output_file):
        os.remove(output_file)

    settings = {
        'FEED_FORMAT': 'json',
        'FEED_URI': output_file,
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    process = CrawlerProcess(settings)
    process.crawl(IredaCrawlerSpider, start_url=start_url)
    process.start() # Blocks here until crawling finishes

    
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
    model="azure/genailab-maas-gpt-4o",
    api_key=os.getenv("OPENAI_API_KEY"),
    http_async_client=httpx.AsyncClient(verify=False),
    http_client=client,
    temperature=0
)


# =========================================================
# 2️⃣ SCHEMA DEFINITION (The "Mind" of the Agent)
# =========================================================
class GrantSchema(BaseModel):
    """Structured extraction schema for Government Grants."""
    id: Optional[str] = Field(description="Unique Identifier for the grant", default=None)
    filename: Optional[str] = Field(description="Name of the source PDF file", default=None)    
    name: str = Field(description="Official name of the grant or scheme")
    description: str = Field(description="Brief summary.", default="No description provided.")
    funding_type: str = Field(description="Type of funding: 'Subsidy', 'Loan', 'Grant', or 'Equity'")
    max_value: Optional[str] = Field(description="Maximum monetary value (e.g., '50 Lakhs')")
    max_subsidy: Optional[str] = Field(description="Percentage or amount of subsidy")
    verticals: List[str] = Field(description="List of target industries (e.g., ['Agriculture', 'Textiles'])")
    tech_focus: List[str] = Field(description="List of technologies (e.g., ['Solar', 'EV', 'IoT'])")
    size_eligibility: List[str] = Field(description="SME sizes eligible (e.g., ['Micro', 'Small', 'Medium'])")
    geo_filter: List[str] = Field(description="Specific regions/states if applicable")
    country: List[str] = Field(description="Countries applicable. Infer 'India' if INR currency is used.")
    criterion_1: str = Field(description="Primary mandatory eligibility criterion")
    criterion_2: str = Field(description="Secondary mandatory eligibility criterion")

    # FIX 2: Auto-convert single strings to lists (e.g. "India" -> ["India"])
    @field_validator('verticals', 'tech_focus', 'size_eligibility', 'geo_filter', 'country', mode='before')
    @classmethod
    def convert_string_to_list(cls, v):
        if isinstance(v, str):
            # Split by comma if it looks like a CSV string, otherwise wrap in list
            if "," in v:
                return [item.strip() for item in v.split(",")]
            return [v]
        return v


class SMEProfile(BaseModel):
    """SME profile with validation"""
    email: Optional[str] = Field(default=None, description="Email for notifications") # NEW FIELD
    sme_size: Literal['Micro', 'Small', 'Medium', 'Large']
    udyam_status: bool
    sector_category: str # Relaxed from Literal to allow flexibility
    financial_performance: str 
    location_state: str 
    project_value: float 
    project_need_description: str = Field(description="User's description of what they need money for")

# --- NEW: Feedback Schema ---
class ErrorReport(BaseModel):
    grant_id: str
    user_feedback: str # "This matches wrongly because..."


# =========================================================
# 3️⃣ NEO4J HANDLER (Refactored for Direct JSON Injection)
# =========================================================
class Neo4jHandler:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def ensure_indexes(self):
        """Creates the Fulltext Index required for search."""
        query = "CREATE FULLTEXT INDEX grant_keywords IF NOT EXISTS FOR (n:Grant) ON EACH [n.name, n.description]"
        with self.driver.session() as session:
            try:
                session.run(query)
                # Create constraint for SME emails to avoid duplicates
                session.run("CREATE CONSTRAINT sme_email_unique IF NOT EXISTS FOR (u:SME) REQUIRE u.email IS UNIQUE")
                print("✅ NEO4J: Indexes and Constraints verified.")
            except Exception as e:
                print(f"⚠️ NEO4J Index Error: {e}")

    def save_sme_profile(self, sme: dict):
        """Stores or Updates an SME profile in the Graph for future alerts."""
        if not sme.get('email'): return 

        query = """
        MERGE (u:SME {email: $email})
        SET u.size = $sme_size,
            u.sector = $sector_category,
            u.location = $location_state,
            u.project_need = $project_need_description,
            u.last_active = datetime()
        """
        try:
            with self.driver.session() as session:
                session.run(query, 
                            email=sme['email'], 
                            sme_size=sme['sme_size'],
                            sector_category=sme['sector_category'],
                            location_state=sme['location_state'],
                            project_need_description=sme['project_need_description'])
                print(f"👤 NEO4J: Saved Profile for {sme['email']}")
        except Exception as e:
            print(f"⚠️ NEO4J SME Save Error: {e}")

    def find_interested_smes(self, grant_data: dict):
        """
        REVERSE MATCHING: 
        Finds SMEs whose profile matches the NEW grant being added.
        """
        # We find SMEs where:
        # 1. The SME sector is contained in the Grant verticals
        # 2. The SME size is contained in the Grant size eligibility
        query = """
        MATCH (u:SME)
        WHERE 
            ANY(vertical IN $verticals WHERE vertical CONTAINS u.sector OR u.sector CONTAINS vertical)
            AND
            ANY(size IN $sizes WHERE size = u.size)
        RETURN u.email AS email, u.sector AS sector
        """
        
        with self.driver.session() as session:
            result = session.run(query, 
                                 verticals=grant_data.get('verticals', []),
                                 sizes=grant_data.get('size_eligibility', []))
            return [record['email'] for record in result if record['email']]

    def ingest_grant(self, grant_data: dict):
        """Ingests a single clean grant object into Neo4j."""
        
        # Generate an ID if one doesn't exist (using Name hash or random)
        if not grant_data.get('id'):
            grant_data['id'] = f"GRANT_{random.randint(1000,9999)}"
        
        cypher_query = """
        WITH $data AS g
        MERGE (grant:Grant {id: g.id})
        SET grant.name = g.name,
        grant.filename = g.filename, 
        grant.description = g.description,
        grant.funding_type = g.funding_type,
        grant.max_value = g.max_value,
        grant.max_subsidy = g.max_subsidy
        
        // Verticals
        FOREACH (v IN g.verticals | 
            MERGE (vert:Vertical {name: TRIM(v)}) 
            MERGE (grant)-[:TARGETS_VERTICAL]->(vert))
            
        // Technologies
        FOREACH (t IN g.tech_focus | 
            MERGE (tech:Technology {name: TRIM(t)}) 
            MERGE (grant)-[:USES_TECH]->(tech))
            
        // Size
        FOREACH (s IN g.size_eligibility | 
            MERGE (sz:Size {name: TRIM(s)}) 
            MERGE (grant)-[:ELIGIBLE_FOR_SIZE]->(sz))
            
        // Criteria (Must-Have 1)
        FOREACH (ignoreMe IN CASE WHEN g.criterion_1 <> '' THEN [1] ELSE [] END | 
            MERGE (c1:Criterion {description: TRIM(g.criterion_1)}) 
            ON CREATE SET c1.type = 'Must-Have 1'
            MERGE (grant)-[:REQUIRES_CRITERION {type: 'Must-Have 1'}]->(c1))
            
        // Criteria (Must-Have 2)
        FOREACH (ignoreMe IN CASE WHEN g.criterion_2 <> '' THEN [1] ELSE [] END | 
            MERGE (c2:Criterion {description: TRIM(g.criterion_2)}) 
            ON CREATE SET c2.type = 'Must-Have 2'
            MERGE (grant)-[:REQUIRES_CRITERION {type: 'Must-Have 2'}]->(c2))

        // Geography
        FOREACH (r IN g.geo_filter | 
            MERGE (reg:Region {name: TRIM(r)}) 
            MERGE (grant)-[:HAS_GEOGRAPHIC_FILTER]->(reg))
            
        // Country
        FOREACH (c IN g.country | 
            MERGE (cntry:Country {name: TRIM(c)}) 
            MERGE (grant)-[:APPLICABLE_TO_COUNTRY]->(cntry))
        """
        
        with self.driver.session() as session:
            session.run(cypher_query, data=grant_data)
            print(f"✅ NEO4J: Ingested '{grant_data['name']}' ({grant_data['filename']})")
# Initialize Handler
neo4j_handler = Neo4jHandler(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)


# =========================================================
# 4️⃣ EXTRACTION AGENT
# =========================================================

def send_notification_email(to_email: str, grant_name: str, grant_id: str):
    """
    Sends a simple notification email.
    WARNING: For production, configure real SMTP settings.
    """
    sender_email = "kushalbhurve@gmail.com" # REPLACE
    sender_password = "gska xjfc isda burr" # REPLACE
    
    subject = f"New Grant Match: {grant_name}"
    body = f"""
    Hello,
    
    A new government grant has been added to our system that matches your company profile!
    
    Grant Name: {grant_name}
    Grant ID: {grant_id}
    
    Visit the dashboard to check your eligibility.
    """
    
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = to_email

    try:
        # UNCOMMENT BELOW TO ACTUALLY SEND
        # with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        #    server.login(sender_email, sender_password)
        #    server.send_message(msg)
        print(f"📧 EMAIL SENT (Simulated) to {to_email} regarding {grant_name}")
    except Exception as e:
        print(f"❌ EMAIL ERROR: {e}")


@traceable(run_type="chain", name="Extract & Store Pipeline")
async def extract_and_store(file_path: str):
    pdf_filename = os.path.basename(file_path) 
    print(f"🕵️ AGENT: Processing {pdf_filename}...")
    
    # --- FIX 1: Robust PDF Loading ---
    try:
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        if not docs:
            print(f"⚠️ AGENT: PDF {file_path} is empty or unreadable. Skipping.")
            return
            
        # Limit context window to first 15000 chars
        full_text = "\n".join([d.page_content for d in docs])[:15000]
        
        # Check if text was actually extracted (scanned PDFs might return empty strings)
        if len(full_text.strip()) < 50:
            print(f"⚠️ AGENT: PDF {file_path} contains no text (likely scanned image). Skipping.")
            return

    except Exception as e:
        print(f"❌ AGENT: PDF Load Error for {file_path}: {e}")
        return
    
    current_prompt_template = get_current_prompt()

    # 2. Define the Prompt
    prompt = f"""
    {current_prompt_template}

Input Document Text
{full_text}
    """

    # 3. Retry Loop
    MAX_RETRIES = 3
    
    for attempt in range(MAX_RETRIES):
        try:
            response = llm.invoke(prompt)
            content = response.content.strip()

            # --- CHECK 1: ABORT ---
            if "abort" in content.lower() and len(content) < 20:
                print(f"🚫 AGENT: Document {file_path} deemed IRRELEVANT. Skipping.")
                return

            # --- FIX 2: Robust Regex Extraction ---
            # Instead of slicing, we look for the first '{' and last '}'
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                # If no JSON found, raise error to trigger retry
                raise ValueError("No JSON object found in response")

            # --- CHECK 3: PARSE JSON ---
            data = json.loads(json_str)

            # --- CHECK 4: VALIDATE SCHEMA ---
            validated_data = GrantSchema(**data)


            grant_id = f"GRANT_{uuid.uuid4().hex[:8]}"
            validated_data.id = grant_id
            validated_data.filename = pdf_filename

            # 4. Success - Store in Neo4j
            print(f"🧠 AGENT: Successfully Extracted: {validated_data.name}")
            print(f"🆔 Grant ID: {grant_id}")
            neo4j_handler.ingest_grant(validated_data.model_dump())
            
            # --- NEW: TRIGGER NOTIFICATION ---
            try:
                print(f"🔔 NOTIFY: Checking for interested SMEs for {grant_id}...")
                grant_dict = validated_data.model_dump()
                interested_emails = neo4j_handler.find_interested_smes(grant_dict)
                
                if interested_emails:
                    print(f"🔔 NOTIFY: Found {len(interested_emails)} potential matches.")
                    for email in interested_emails:
                        send_notification_email(email, validated_data.name, grant_id)
                else:
                    print("🔔 NOTIFY: No matching subscribers found.")
            except Exception as e:
                print(f"⚠️ NOTIFICATION LOGIC FAILED: {e}")
            # ---------------------------------

            print(f"📚 VECTOR: Chunking and embedding text for {grant_id}...")
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            
            # Add metadata to every chunk
            for doc in docs:
                doc.metadata = {
                    "grant_id": grant_id, 
                    "source": file_path, 
                    "filename": pdf_filename,
                    "name": validated_data.name
                    }
                
            splits = text_splitter.split_documents(docs)
            vectorstore = get_vectorstore()
            vectorstore.add_documents(splits)
            print(f"✅ VECTOR: Added {len(splits)} chunks to ChromaDB.")
            
            return 

        except json.JSONDecodeError:
            print(f"⚠️ AGENT: Attempt {attempt+1}/{MAX_RETRIES} - JSON Decode Error. Content snippet: {content[:50]}...")
            continue 
            
        except ValidationError as e:
            print(f"⚠️ AGENT: Attempt {attempt+1}/{MAX_RETRIES} - Schema Validation Failed: {e}. Retrying...")
            continue 
            
        except Exception as e:
            print(f"❌ AGENT: Unexpected error during extraction: {e}")
            # If it's not a JSON error, it might be an API error, so we might want to wait a bit
            time.sleep(1) 
            continue

    print(f"❌ AGENT: Failed to extract data from {file_path} after {MAX_RETRIES} attempts.")

# =========================================================
# 2️⃣ SCRAPING HELPER FUNCTIONS (NEW)
# =========================================================

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
}

def clean_filename(text):
    """Sanitize text to be a valid filename."""
    clean = re.sub(r'[\\/*?:"<>|]', "", text)
    clean = clean.replace('\n', ' ').replace('\r', '').strip()
    return clean[:80]

def download_pdf(pdf_url, folder_name, filename_hint):
    """Downloads a PDF with SSL verification disabled."""
    try:
        response = requests.get(pdf_url, headers=HEADERS, stream=True, timeout=30, verify=False)
        response.raise_for_status()
        
        server_filename = pdf_url.split('/')[-1]
        
        if re.match(r'^\d+.*\.pdf$', server_filename) or not server_filename.lower().endswith('.pdf'):
            final_name = f"{clean_filename(filename_hint)}.pdf"
        else:
            final_name = server_filename

        save_path = os.path.join(folder_name, final_name)
        
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return final_name
        
    except Exception as e:
        print(f"[ERROR] Failed to download {pdf_url}: {e}")
        return None


def perform_scraping(url: str, output_folder: str):
    """
    Generic scraper that looks for PDF links in the provided URL.
    Returns a list of downloaded filenames.
    """
    downloaded_files = []
    print(f"--- Scraping URL: {url} ---")
    
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    try:
        resp = requests.get(url, headers=HEADERS, verify=False)
        soup = BeautifulSoup(resp.content, 'html.parser')
        
        # 1. Try Table Scraping (Specific logic like MNRE)
        table = soup.find('table')
        if table:
            rows = table.find_all('tr')[1:] 
            for row in rows:
                cols = row.find_all('td')
                if not cols: continue
                
                title_text = "Unknown_Doc"
                if len(cols) > 1:
                     # Try to get text from the second column
                    title_text = cols[1].get_text(strip=True)
                
                link_tag = row.find('a', href=True)
                if link_tag:
                    pdf_link = urljoin(url, link_tag['href'])
                    fname = download_pdf(pdf_link, output_folder, f"Scraped_{title_text}")
                    if fname: downloaded_files.append(fname)

        # 2. If no table yielded results, try General Link Scraping
        if not downloaded_files:
            links = soup.find_all('a', href=True)
            count = 0
            for link in links:
                href = link['href']
                full_url = urljoin(url, href)
                link_text = link.get_text(strip=True)
                
                # Filter for PDFs or download links
                if href.lower().endswith('.pdf') or 'download' in link_text.lower():
                     # Basic keyword filter to avoid junk
                    if any(x in full_url.lower() for x in ['scheme', 'guideline', 'circular', 'brochure', 'report', 'policy']):
                        hint = link_text if len(link_text) > 5 else f"Doc_{count}"
                        fname = download_pdf(full_url, output_folder, hint)
                        if fname: 
                            downloaded_files.append(fname)
                            count += 1
                        
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        raise e

    return downloaded_files


# =========================================================
# 7️⃣ MATCHING LOGIC (FIXED AGGREGATION)
# =========================================================
@traceable(run_type="tool", name="Neo4j Semantic Search")
def find_matching_grants(sme: SMEProfile) -> List[Dict]:
    """
    Robust Semantic Search with Fixed Aggregation Logic.
    """
    session = neo4j_handler.driver.session()
    
    # 1. Sanitize Input
    clean_desc = re.sub(r'[^a-zA-Z0-9\s]', ' ', sme.project_need_description)
    words = clean_desc.split()
    if not words:
        keywords = "generic~"
    else:
        keywords = " OR ".join([f"{w}~" for w in words])
    
    # 2. Cypher Query with Step-by-Step Aggregation
    query = f"""
    CALL db.index.fulltext.queryNodes("grant_keywords", "{keywords}") 
    YIELD node AS g, score
    
    // --- Step A: Calculate Size Score ---
    // We use max() to collapse multiple size matches into one number per grant
    OPTIONAL MATCH (g)-[:ELIGIBLE_FOR_SIZE]->(s)
    WITH g, score, 
         max(CASE WHEN s.name = '{sme.sme_size}' THEN 2.0 ELSE 0.5 END) AS size_score
    
    // --- Step B: Calculate Sector Score ---
    // We use max() to find the BEST sector match among all verticals the grant targets
    OPTIONAL MATCH (g)-[:TARGETS_VERTICAL]->(v)
    WITH g, score, size_score,
         max(CASE 
            WHEN v.name CONTAINS '{sme.sector_category}' THEN 3.0 
            WHEN v.name STARTS WITH 'All' THEN 1.0
            ELSE 0.5 
         END) AS sector_score
         
    // --- Step C: Final Calculation ---
    // Now all variables (score, size_score, sector_score) are unique per 'g'
    WITH g, 
         (score * 5) + coalesce(size_score, 0.5) + coalesce(sector_score, 0.5) AS final_score
    
    // --- Step D: Return Data ---
    RETURN {{
        id: g.id,
        title: g.name,
        funding_type: g.funding_type,
        max_value: g.max_value,
        description: g.description,
        filename: g.filename,
        match_score: final_score,
        target_verticals: [(g)-[:TARGETS_VERTICAL]->(v) | v.name],
        eligibility_criteria: [(g)-[:REQUIRES_CRITERION]->(c) | {{type: c.type, description: c.description}}]
    }} AS grant_data
    ORDER BY final_score DESC
    LIMIT 5
    """
    
    try:
        print(f"🔍 MATCHING: Searching for keywords: {keywords[:50]}...")
        result = session.run(query)
        matches = [record["grant_data"] for record in result]
        
        if not matches:
            print("⚠️ No matches found.")
            
        return matches
    except Exception as e:
        print(f"❌ Match Error: {e}")
        return []
    finally:
        session.close()

@traceable(run_type="chain", name="Generate Checklist")
async def generate_application_checklist(grant_title: str, sme: SMEProfile):
    prompt = f"""
    Create a practical application checklist for grant: "{grant_title}".
    Applicant Profile: {sme.sme_size} {sme.sector_category} company needing {sme.project_need_description}.
    
    Provide:
    1. Pre-qualification check
    2. Required documents
    3. Application steps
    Keep it concise.
    """
    response = await llm.ainvoke(prompt)
    return response.content




# =========================================================
# 4️⃣ RAG SETUP & TOOLS
# =========================================================
DB_DIR = "./chroma_db"

def get_vectorstore():
    return Chroma(
        persist_directory=DB_DIR, 
        embedding_function=OpenAIEmbeddings(
            base_url="https://genailab.tcs.in",
            api_key=os.getenv("OPENAI_API_KEY"),
            model="azure/genailab-maas-text-embedding-3-large",
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
    

@traceable(run_type="chain", name="Prompt Optimization Agent")
async def optimize_prompt_logic(user_feedback: str, document_snippet: str):
    """
    The 'Prompt Engineer' Agent.
    """
    current_rules = get_current_prompt()
    
    meta_prompt = f"""
    You are a Senior Prompt Engineer for an AI extraction system.
    
    CURRENT SITUATION:
    The system uses the following prompt rules to decide if a document is a "Grant" or "Irrelevant".
    
    [CURRENT RULES START]
    {current_rules}
    [CURRENT RULES END]
    
    PROBLEM:
    A user has reported a FALSE POSITIVE. The system extracted data from a document that should have been ignored (aborted), or extracted it incorrectly.
    
    USER FEEDBACK: "{user_feedback}"
    DOCUMENT SNIPPET: "{document_snippet[:500]}..."
    
    TASK:
    Rewrite the [CURRENT RULES] to prevent this mistake in the future. 
    - You MUST add a specific exclusion criteria to the "Relevance Check" section based on the user's feedback.
    - Do NOT remove the core functionality of extracting legitimate grants.
    - Keep the output concise.
    
    Return ONLY the new updated prompt text.
    """
    
    try:
        response = await llm.ainvoke(meta_prompt)
        new_rules = response.content
        update_prompt(new_rules)
        print("🧠 SELF-LEARNING: Extraction rules updated based on user feedback.")
        return True
    except Exception as e:
        print(f"❌ Learning Error: {e}")
        return False


# =========================================================
# 6️⃣ LIFESPAN
# =========================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n🔄 LIFESPAN: Initializing MCP Client...")

    neo4j_handler.ensure_indexes()
    if not os.path.exists(DB_DIR): os.makedirs(DB_DIR)

    yield
    print("🛑 Shutdown")

    mcp_client = MultiServerMCPClient({
        "finance": {
            "transport": "sse",
            "url": "http://localhost:8001/mcp/sse",
        }
    })

    try:
        print("⏳ LIFESPAN: Connecting to Finance MCP Server...")
        # Note: In production, wrap this in try/except for timeout robustness
        try:
            mcp_tools = await mcp_client.get_tools()    
            print(f"✅ LIFESPAN: Loaded {len(mcp_tools)} MCP tools")
        except Exception as e:
             print(f"⚠️ WARN: Could not load MCP tools (check if MCP server is running): {e}")
             mcp_tools = []

        all_tools = mcp_tools
        
        print("📊 LIFESPAN: Compiling LangGraph with Memory...")
        # app_state["graph"] = create_agent_graph(all_tools)
        print("🚀 LIFESPAN: Graph Ready.")
        
        yield
        
    except Exception as e:
        print(f"❌ LIFESPAN ERROR: {e}")
        raise e
    
    print("🛑 LIFESPAN: Application shutdown.")


# =========================================================
# 7️⃣ FASTAPI APP
# =========================================================
app = FastAPI(title="Unified GenAI Platform (HITL Enabled)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

current_dir = os.path.dirname(os.path.abspath(__file__))
static_docs_path = os.path.join(current_dir, SCRAPE_DIR) # SCRAPE_DIR is defined at top of your file

# 2. Create the directory if it doesn't exist yet
if not os.path.exists(static_docs_path):
    os.makedirs(static_docs_path)

# 3. Mount it to the "/documents" route
app.mount("/documents", StaticFiles(directory=static_docs_path), name="documents")

class ChatRequest(BaseModel):
    message: Optional[str] = None
    thread_id: str = "default_session"
    action: Optional[str] = None
    feedback_text: Optional[str] = None 

# --- NEW: Request Model for Scraping ---
class ScrapeRequest(BaseModel):
    urls: List[str]

class GrantQARequest(BaseModel):
    grant_id: str
    question: str
    thread_id: str = "default"

class MatchRequest(BaseModel):
    sme_profile: SMEProfile


# --- NEW: Error Reporting Endpoint ---
@app.post("/report-error")
async def report_error_endpoint(report: ErrorReport):
    return await execute_feedback_loop(report)

@traceable(run_type="chain", name="Feedback Loop")
async def execute_feedback_loop(report: ErrorReport):
    """
    Trigger the Self-Learning Loop.
    1. Retrieve the document text from Vector Store (using grant_id).
    2. Call the Prompt Engineer to update rules.
    3. Delete the bad node from Neo4j (Clean up).
    """
    print(f"⚠️ FEEDBACK: User flagged grant {report.grant_id}. Reason: {report.user_feedback}")
    
    # 1. Get Context
    vs = get_vectorstore()
    retriever = vs.as_retriever(search_kwargs={"k": 20, "filter": {"grant_id": report.grant_id}})
    docs = retriever.invoke("What is this document?")
    
    context_snippet = docs[0].page_content if docs else "No text found."
    
    # 2. Self-Correction
    success = await optimize_prompt_logic(report.user_feedback, context_snippet)
    
    # 3. Cleanup Bad Data
    if success:
        with neo4j_handler.driver.session() as session:
            session.run("MATCH (g:Grant {id: $id}) DETACH DELETE g", id=report.grant_id)
            print(f"🗑️ CLEANUP: Deleted bad grant node {report.grant_id}")
            
    return {"status": "success", "message": "System has learned from your feedback. The bad entry was removed and rules updated."}


# --- MATCH ENDPOINT ---
@app.post("/match-grants")
async def match_grants_endpoint(request: MatchRequest):
    # We wrap the endpoint logic in a traceable function for cleaner hierarchy
    return await execute_match_pipeline(request.sme_profile)

@traceable(run_type="chain", name="Grant Matching Pipeline")
async def execute_match_pipeline(sme_profile: SMEProfile):
    # --- NEW: SAVE PROFILE ---
    if sme_profile.email:
        neo4j_handler.save_sme_profile(sme_profile.model_dump())
    # -------------------------

    matches = find_matching_grants(sme_profile) 
    if not matches: return {"status": "no_match", "matches": []}
    
    checklist = await generate_application_checklist(matches[0]['title'], sme_profile) 
    return {"status": "success", "matches": matches, "top_match_checklist": checklist}


@app.post("/crawl")
async def crawl_endpoint(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """
    1. Runs Scrapy Spider to find URLs.
    2. Extracts unique source URLs.
    3. Runs Scrape + Extraction on each unique URL found.
    """
    print(f"🕷️ CRAWL REQUEST: {request.url}")
    
    # 1. Run Scrapy as Subprocess
    try:
        # NOTE: Assumes 'crawler_spider.py' is in the same folder
        subprocess.run(
            ["scrapy", "runspider", "crawler_spider.py", "-a", f"start_url={request.url}", "-O", "crawled_output.json"], 
            check=True
        )
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Crawler failed: {e}")

    # 2. Process Output
    if not os.path.exists("crawled_output.json"):
        return {"status": "warning", "message": "Crawler finished but no output file found."}

    with open("crawled_output.json", "r") as f:
        try:
            crawled_data = json.load(f)
        except json.JSONDecodeError:
            return {"status": "warning", "message": "Crawler output is empty."}

    # 3. Extract Unique Source URLs (Pages that contain PDFs)
    # The user asked to pass "source_url" to perform_scraping.
    # We will also pass the direct PDF links if available to save time.
    
    unique_sources = list(set([item['source_url'] for item in crawled_data if 'source_url' in item]))
    print(f"✅ Found {len(unique_sources)} unique pages with PDFs.")
    
    files_queued = []
    
    # 4. Trigger Scraping for each Source URL
    for source_url in unique_sources:
        print(f"📥 Triggering Scrape for: {source_url}")
        new_files = perform_scraping(source_url, SCRAPE_DIR)
        
        for f in new_files:
            if f not in files_queued:
                full_path = os.path.join(SCRAPE_DIR, f)
                background_tasks.add_task(extract_and_store, full_path)
                files_queued.append(f)

    return {
        "status": "success", 
        "message": f"Crawled {len(unique_sources)} pages. Queued {len(files_queued)} PDFs for analysis.",
        "pages_found": unique_sources,
        "files_queued": files_queued
    }


# --- THE AUTOMATED ENDPOINT (UPDATED) ---
@app.post("/scrape")
async def scrape_endpoint(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """
    1. Scrapes PDFs from a LIST of URLs.
    2. Automatically schedules them for AI Extraction & Neo4j Ingestion.
    """
    all_files_queued = []
    status_messages = []

    try:
        for url in request.urls:
            print(f"📥 SCRAPE REQUEST: {url}")
            
            # 1. Perform Scraping for this specific URL
            # We wrap this in a try/except so one bad URL doesn't fail the whole batch
            try:
                files = perform_scraping(url, SCRAPE_DIR)
                
                if not files:
                    status_messages.append(f"No PDFs found at {url}")
                    continue
                
                # 2. Queue for Extraction
                for filename in files:
                    # Avoid re-queuing duplicates if multiple sites link to the same file name
                    if filename not in all_files_queued:
                        full_path = os.path.join(SCRAPE_DIR, filename)
                        background_tasks.add_task(extract_and_store, full_path)
                        all_files_queued.append(filename)
                
                status_messages.append(f"Found {len(files)} PDFs at {url}")

            except Exception as e:
                print(f"❌ Error scraping {url}: {e}")
                status_messages.append(f"Error at {url}: {str(e)}")

        if not all_files_queued:
            return {
                "status": "warning", 
                "message": "Process completed but no PDFs were downloaded.",
                "details": status_messages
            }
        
        return {
            "status": "success", 
            "message": f"Downloaded {len(all_files_queued)} unique files across {len(request.urls)} sites. Processing in background.",
            "files_queued": all_files_queued,
            "details": status_messages
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    
@app.post("/ingest")
@traceable(run_type="chain", name="PDF Ingestion Pipeline")
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

@app.post("/grant-qa")
async def grant_qa_endpoint(request: GrantQARequest):
    """
    Specific Q&A on a single Grant using RAG with Metadata Filtering.
    """
    print(f"❓ RAG: Question on Grant {request.grant_id}: {request.question}")
    
    try:
        vectorstore = get_vectorstore()
        
        # 1. Create Filtered Retriever
        # This ensures we ONLY retrieve chunks belonging to this specific Grant ID
        retriever = vectorstore.as_retriever(
            search_kwargs={
                "k": 10,
                "filter": {"grant_id": request.grant_id} 
            }
        )
        
        # 2. Get Context
        docs = retriever.invoke(request.question)
        if not docs:
            return {
                "answer": "I couldn't find any specific details in the document for this grant. It might not have been processed correctly.",
                "sources": []
            }
            
        context_text = "\n\n".join([d.page_content for d in docs])
        
        # 3. Generate Answer
        rag_prompt = f"""
        You are a helpful assistant answering questions about a specific government grant.
        Use the following context to answer the user's question.
        If the answer is not in the context, say "I cannot find that information in the official document."
        
        Context:
        {context_text}
        
        Question: 
        {request.question}
        """
        
        response = llm.invoke(rag_prompt)

        # Return distinct filenames instead of full source paths
        seen_files = set()
        sources = []
        for d in docs:
            fname = d.metadata.get("filename", "unknown.pdf") # <--- GET FILENAME
            if fname not in seen_files:
                sources.append(fname)
                seen_files.add(fname)
                
        return {"answer": response.content, "sources": sources}

    except Exception as e:
        print(f"❌ RAG ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    if not os.path.exists(SCRAPE_DIR): os.makedirs(SCRAPE_DIR)
    uvicorn.run(app, host="0.0.0.0", port=8000)
