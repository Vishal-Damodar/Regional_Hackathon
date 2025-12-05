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

# =========================================================
# SIDEBAR: SETTINGS & TOOLS
# =========================================================
with st.sidebar:
    st.title("⚙️ Control Panel")
    
    # --- MODE SELECTION ---
    st.subheader("Mode")
    chat_mode = st.radio(
        "Select Interaction Type:",
        ["General Agent", "Specific Grant Q&A"],
        captions=["Graph-based reasoning", "Deep dive into one document"]
    )
    
    # --- GRANT ID INPUT (Only for Q&A Mode) ---
    target_grant_id = None
    if chat_mode == "Specific Grant Q&A":
        st.info("Enter the ID of the grant you want to analyze (e.g., from Neo4j).")
        target_grant_id = st.text_input("Target Grant ID", placeholder="GRANT_xxxx")
    
    st.divider()

    # --- KNOWLEDGE BUILDER ---
    st.subheader("🧠 Knowledge Builder")
    scrape_url_input = st.text_input("Scrape URL", value="https://mnre.gov.in/en/policies-and-regulations/schemes-and-guidelines/schemes/")
    
    if st.button("🚀 Start Extraction Pipeline"):
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
                        st.markdown("**Queued for AI Analysis:**")
                        for f in files:
                            st.code(f, language="text")
                    else:
                        st.warning("No PDFs found.")
                else:
                    status.update(label="Failed", state="error")
                    st.error(f"Backend Error: {response.text}")
            except Exception as e:
                status.update(label="Error", state="error")
                st.error(f"Error: {str(e)}")

    st.divider()
    if st.button("Clear Chat History"):
        st.session_state.messages = []
        st.rerun()

# =========================================================
# MAIN CHAT INTERFACE
# =========================================================
st.title("⚡ Energy Transition Grant Assistant")

if chat_mode == "General Agent":
    st.caption("🤖 **Mode:** General Agent (Can use tools, check inventory, logic)")
else:
    st.caption(f"📄 **Mode:** RAG Q&A (Restricted to Grant ID: `{target_grant_id if target_grant_id else 'None'}`)")

st.divider()

# 1. Display Chat History
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# 2. Capture User Input
if prompt := st.chat_input("Ask a question..."):
    # Add user message to history
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # 3. Generate Response
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        message_placeholder.markdown("Thinking...")

        try:
            # --- PATH A: SPECIFIC GRANT Q&A (RAG) ---
            if chat_mode == "Specific Grant Q&A":
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

            # --- PATH B: GENERAL AGENT (LANGGRAPH) ---
            else:
                payload = {
                    "message": prompt,
                    "thread_id": "streamlit_user_1"
                }
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

        except requests.exceptions.ConnectionError:
            message_placeholder.error("Failed to connect to backend. Is the FastAPI server running?")
        except Exception as e:
            message_placeholder.error(f"An unexpected error occurred: {str(e)}")