import streamlit as st
import requests
import json

# =========================================================
# CONFIGURATION
# =========================================================
# The URL where your FastAPI backend is running
BASE_URL = "http://localhost:8000"
CHAT_URL = f"{BASE_URL}/chat"
SCRAPE_URL = f"{BASE_URL}/scrape"
QA_URL = f"{BASE_URL}/grant-qa"
MATCH_URL = f"{BASE_URL}/match-grants"

# Set page configuration
st.set_page_config(
    page_title="DeepSeek Grant Assistant",
    page_icon="⚡",
    layout="wide"
)

# =========================================================
# SESSION STATE MANAGEMENT
# =========================================================
if "messages" not in st.session_state:
    st.session_state.messages = []
if "match_results" not in st.session_state:
    st.session_state.match_results = None

# =========================================================
# SIDEBAR: SETTINGS & TOOLS
# =========================================================
with st.sidebar:
    st.title("⚙️ Control Panel")
    
    # --- MODE SELECTION ---
    st.subheader("Mode")
    app_mode = st.radio(
        "Select Function:",
        ["General Chat Agent", "Specific Grant RAG", "🎯 Smart Grant Matcher"],
        captions=["Logic & Tools", "Doc Q&A", "Find Grants for ME"]
    )
    
    st.divider()

    # --- GRANT ID INPUT (Only for RAG Mode) ---
    target_grant_id = None
    if app_mode == "Specific Grant RAG":
        st.info("Enter the ID of the grant you want to analyze.")
        target_grant_id = st.text_input("Target Grant ID", placeholder="GRANT_xxxx")
        st.divider()

    # --- KNOWLEDGE BUILDER (Always Visible) ---
    with st.expander("🧠 Knowledge Base Builder"):
        scrape_url_input = st.text_input("Scrape URL", value="https://mnre.gov.in/en/policies-and-regulations/schemes-and-guidelines/schemes/")
        
        if st.button("🚀 Start Pipeline"):
            with st.status("Running Pipeline...", expanded=True) as status:
                try:
                    st.write("📡 Connecting to Scraper...")
                    payload = {"url": scrape_url_input}
                    response = requests.post(SCRAPE_URL, json=payload, timeout=120)
                    
                    if response.status_code == 200:
                        data = response.json()
                        status.update(label="Pipeline Started!", state="complete", expanded=False)
                        st.success(f"✅ {data.get('message')}")
                        files = data.get("files_queued", [])
                        if files:
                            st.caption("Queued Files:")
                            for f in files:
                                st.code(f, language="text")
                    else:
                        status.update(label="Failed", state="error")
                        st.error(f"Error: {response.text}")
                except Exception as e:
                    status.update(label="Error", state="error")
                    st.error(f"Error: {str(e)}")

    if st.button("Clear Chat / Reset"):
        st.session_state.messages = []
        st.session_state.match_results = None
        st.rerun()

# =========================================================
# MAIN INTERFACE LOGIC
# =========================================================
st.title("⚡ Energy Transition Grant Assistant")

# ---------------------------------------------------------
# VIEW 1: SMART GRANT MATCHER
# ---------------------------------------------------------
if app_mode == "🎯 Smart Grant Matcher":
    st.markdown("### 🏢 Find the Perfect Grant for your Business")
    st.markdown("Fill out your profile below to perform a **Semantic Search** across the Knowledge Graph.")
    
    with st.form("sme_profile_form"):
        col1, col2 = st.columns(2)
        with col1:
            sme_size = st.selectbox("Company Size", ["Micro", "Small", "Medium"])
            sector = st.selectbox("Sector", ["Manufacturing", "Service", "Trading", "Agriculture", "Textiles", "Renewable Energy"])
            location = st.text_input("State Location", "Karnataka")
        
        with col2:
            budget = st.number_input("Project Budget (₹)", min_value=0.0, value=1000000.0, step=100000.0, format="%.2f")
            udyam = st.checkbox("Udyam Registered?", value=True)
            financials = st.selectbox("Financial Health", ["Profitable", "Loss Making", "New Startup"])

        project_desc = st.text_area("Project Description (What do you need money for?)", 
                                  value="I need funding to install rooftop solar panels and buy energy efficient machinery.")
        
        submitted = st.form_submit_button("🔍 Find Matching Grants")

    if submitted:
        with st.spinner("🧠 AI is analyzing your profile against the Graph Database..."):
            try:
                payload = {
                    "sme_profile": {
                        "sme_size": sme_size,
                        "udyam_status": udyam,
                        "sector_category": sector,
                        "financial_performance": financials,
                        "location_state": location,
                        "project_value": budget,
                        "project_need_description": project_desc
                    }
                }
                response = requests.post(MATCH_URL, json=payload, timeout=60)
                if response.status_code == 200:
                    st.session_state.match_results = response.json()
                else:
                    st.error(f"Matching Error: {response.text}")
            except Exception as e:
                st.error(f"Connection Error: {e}")

    # --- DISPLAY MATCH RESULTS ---
    if st.session_state.match_results:
        res = st.session_state.match_results
        
        if res.get("status") == "no_match":
            st.warning("No direct matches found. Try broadening your description or checking your eligibility.")
        
        else:
            matches = res.get("matches", [])
            checklist = res.get("top_match_checklist")
            
            st.divider()
            st.subheader(f"✅ Found {len(matches)} Matches")
            
            # Top Match Highlight
            if matches:
                top = matches[0]
                st.success(f"🏆 **Top Recommendation:** {top['title']}")
                
                with st.expander("📋 **AI-Generated Application Checklist** (For Top Match)", expanded=True):
                    st.markdown(checklist)

            # List all matches
            for i, grant in enumerate(matches):
                with st.container(border=True):
                    c1, c2 = st.columns([3, 1])
                    with c1:
                        st.markdown(f"#### {i+1}. {grant['title']}")
                        st.markdown(f"_{grant.get('description', 'No description available')}_")
                        st.caption(f"**Sectors:** {', '.join(grant.get('target_verticals', []))}")
                    with c2:
                        st.metric("Match Score", f"{grant.get('match_score', 0):.2f}")
                        st.caption(f"**Max:** {grant.get('max_value')}")
                        st.caption(f"🆔 `{grant.get('id')}`")
                        
                        # --- NEW: Display Source File ---
                        if grant.get('filename'):
                            st.caption(f"📄 `{grant.get('filename')}`")
                    
                    with st.expander("View Eligibility Criteria"):
                        for c in grant.get('eligibility_criteria', []):
                            st.write(f"- **{c.get('type')}:** {c.get('description')}")


# ---------------------------------------------------------
# VIEW 2: CHAT INTERFACES (General & RAG)
# ---------------------------------------------------------
else:
    if app_mode == "General Chat Agent":
        st.caption("🤖 **Mode:** General Agent (Can use tools, check inventory, logic)")
    else:
        st.caption(f"📄 **Mode:** RAG Q&A (Restricted to Grant ID: `{target_grant_id if target_grant_id else 'None'}`)")

    # 1. Display Chat History
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # 2. Capture User Input
    if prompt := st.chat_input("Ask a question..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # 3. Generate Response
        with st.chat_message("assistant"):
            message_placeholder = st.empty()
            message_placeholder.markdown("Thinking...")

            try:
                # --- PATH A: SPECIFIC GRANT RAG ---
                if app_mode == "Specific Grant RAG":
                    if not target_grant_id:
                        error_msg = "⚠️ Please enter a **Grant ID** in the sidebar to use Q&A mode."
                        message_placeholder.error(error_msg)
                        st.session_state.messages.append({"role": "assistant", "content": error_msg})
                        st.stop()

                    payload = {"grant_id": target_grant_id, "question": prompt}
                    response = requests.post(QA_URL, json=payload, timeout=60)
                    
                    if response.status_code == 200:
                        data = response.json()
                        answer = data.get("answer", "No answer found.")
                        sources = data.get("sources", [])
                        
                        # Format output with sources
                        final_response = f"{answer}\n\n---\n**Sources:**\n" + "\n".join([f"- `{s}`" for s in sources])
                        message_placeholder.markdown(final_response)
                        st.session_state.messages.append({"role": "assistant", "content": final_response})
                    else:
                        message_placeholder.error(f"RAG Error: {response.text}")

                # --- PATH B: GENERAL AGENT ---
                else:
                    payload = {"message": prompt, "thread_id": "streamlit_user_1"}
                    response = requests.post(CHAT_URL, json=payload, timeout=60)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("status") == "requires_approval":
                             tool_call = data.get("tool_call")
                             ai_response = f"**Approval Needed:** I want to run `{tool_call['name']}` with args:\n```json\n{tool_call['args']}\n```"
                        else:
                            ai_response = data.get("response", "No response received.")

                        message_placeholder.markdown(ai_response)
                        st.session_state.messages.append({"role": "assistant", "content": ai_response})
                    else:
                        message_placeholder.error(f"Agent Error: {response.text}")

            except Exception as e:
                message_placeholder.error(f"Error: {str(e)}")