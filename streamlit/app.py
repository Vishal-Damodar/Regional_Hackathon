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

# Set page configuration
st.set_page_config(
    page_title="DeepSeek Grant Assistant",
    page_icon="🤖",
    layout="wide"
)

# =========================================================
# SESSION STATE MANAGEMENT
# =========================================================
if "messages" not in st.session_state:
    st.session_state.messages = []

# =========================================================
# SIDEBAR: KNOWLEDGE BUILDER & SETTINGS
# =========================================================
with st.sidebar:
    st.header("🧠 Knowledge Base Builder")
    st.markdown("Add new government schemes to the Neo4j Graph.")
    
    # URL Input for Scraping
    scrape_url_input = st.text_input("Target URL", value="https://mnre.gov.in/en/policies-and-regulations/schemes-and-guidelines/schemes/")
    
    if st.button("🚀 Start Extraction Pipeline"):
        with st.status("Running Pipeline...", expanded=True) as status:
            try:
                st.write("📡 Connecting to Scraper...")
                payload = {"url": scrape_url_input}
                response = requests.post(SCRAPE_URL, json=payload, timeout=120) # Long timeout for scraping
                
                if response.status_code == 200:
                    data = response.json()
                    status.update(label="Pipeline Started!", state="complete", expanded=False)
                    
                    st.success(f"✅ {data.get('message')}")
                    
                    # Show queued files if available
                    files = data.get("files_queued", [])
                    if files:
                        st.markdown("**Queued for AI Analysis:**")
                        for f in files:
                            st.code(f, language="text")
                        st.info("Files are being processed in the background. You can start chatting about them now!")
                    else:
                        st.warning("Scraper finished, but no PDF files were found.")
                        
                else:
                    status.update(label="Failed", state="error")
                    st.error(f"Backend Error: {response.text}")
                    
            except requests.exceptions.ConnectionError:
                status.update(label="Connection Error", state="error")
                st.error("Could not connect to backend.")
            except Exception as e:
                status.update(label="Error", state="error")
                st.error(f"An unexpected error occurred: {str(e)}")

    st.divider()

    # System Utilities
    st.header("System")
    col1, col2 = st.columns(2)
    with col1:
        if st.button("Check Health"):
            try:
                res = requests.get(BASE_URL, timeout=5)
                if res.status_code != 404: # Basic connectivity check
                    st.toast("✅ Backend Online")
                else:
                    st.toast("✅ Backend Reachable")
            except:
                st.toast("❌ Backend Offline")

    with col2:
        if st.button("Clear Chat"):
            st.session_state.messages = []
            st.rerun()

# =========================================================
# MAIN CHAT INTERFACE
# =========================================================
st.title("⚡ Energy Transition Grant Assistant")
st.markdown("""
This AI Agent helps SMEs find grants. 
* **Chat:** Ask questions about eligibility.
* **Scrape:** Use the sidebar to ingest new government scheme URLs.
""")
st.divider()

# 1. Display existing chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# 2. Capture user input
if prompt := st.chat_input("E.g., 'Do I qualify for solar pump subsidies?'"):
    # Add user message to history
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    # Display user message immediately
    with st.chat_message("user"):
        st.markdown(prompt)

    # 3. Generate response from API
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        message_placeholder.markdown("Thinking...")

        try:
            # Call the FastAPI backend
            payload = {
                "message": prompt,
                "thread_id": "streamlit_user_1" # Consistent ID for memory
            }
            response = requests.post(CHAT_URL, json=payload, timeout=60)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if it's a normal response or an approval request (HITL)
                if data.get("status") == "requires_approval":
                     tool_call = data.get("tool_call")
                     ai_response = f"**Approval Needed:** I want to run `{tool_call['name']}` with these arguments:\n```json\n{tool_call['args']}\n```"
                     # Note: Full HITL UI requires more complex state management, 
                     # but this notifies the user for now.
                else:
                    ai_response = data.get("response", "No response received.")

                message_placeholder.markdown(ai_response)
                
                # Add assistant response to history
                st.session_state.messages.append({"role": "assistant", "content": ai_response})
            else:
                error_msg = f"Error {response.status_code}: {response.text}"
                message_placeholder.error(error_msg)
        
        except requests.exceptions.ConnectionError:
            message_placeholder.error("Failed to connect to backend. Is the FastAPI server running?")
        except Exception as e:
            message_placeholder.error(f"An unexpected error occurred: {str(e)}")