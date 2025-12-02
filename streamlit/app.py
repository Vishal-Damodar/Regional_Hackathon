import streamlit as st
import requests

# =========================================================
# CONFIGURATION
# =========================================================
# The URL where your FastAPI backend is running
API_URL = "http://localhost:8000/chat"
HEALTH_URL = "http://localhost:8000/"

# Set page configuration
st.set_page_config(
    page_title="DeepSeek Chatbot",
    page_icon="🤖",
    layout="centered"
)

# =========================================================
# SESSION STATE MANAGEMENT
# =========================================================
# Initialize chat history if it doesn't exist
if "messages" not in st.session_state:
    st.session_state.messages = []

# =========================================================
# UI LAYOUT
# =========================================================
st.title("🤖 DeepSeek Chatbot")
st.markdown("Powered by TCS GenAILab & FastAPI")

# Sidebar for status check
with st.sidebar:
    st.header("Status")
    if st.button("Check Backend Health"):
        try:
            response = requests.get(HEALTH_URL, timeout=5)
            if response.status_code == 200:
                data = response.json()
                st.success(f"Online: {data.get('status')} ({data.get('model')})")
            else:
                st.error(f"Error: {response.status_code}")
        except requests.exceptions.ConnectionError:
            st.error("Backend is offline. Is uvicorn running?")

    if st.button("Clear Chat History"):
        st.session_state.messages = []
        st.rerun()

# =========================================================
# CHAT INTERFACE
# =========================================================

# 1. Display existing chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# 2. Capture user input
if prompt := st.chat_input("Ask DeepSeek something..."):
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
            payload = {"message": prompt}
            response = requests.post(API_URL, json=payload, timeout=60)
            
            if response.status_code == 200:
                ai_response = response.json().get("response", "No response received.")
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