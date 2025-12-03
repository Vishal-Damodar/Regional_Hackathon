import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import { Vortex as VortexContainer } from "../components/ui/vortex";
import { PlaceholdersAndVanishInput } from "../components/ui/placeholders-and-vanish-input";
import { FileUpload } from "../components/ui/file-upload";
import { Modal, ModalBody, ModalContent, useModal } from "../components/ui/animated-modal";

// --- API CONFIGURATION ---
const BASE_URL = "http://localhost:8000";
const CHAT_URL = `${BASE_URL}/chat`;
const INGEST_URL = `${BASE_URL}/ingest`;

// --- HELPER: Generate Random Session ID ---
const generateThreadId = () => "session_" + Math.random().toString(36).substr(2, 9);

// --- COMPONENT: Standard Markdown Message ---
const MarkdownMessage = ({ content, sender }) => {
    const isUser = sender === "user";
    return (
        <div
            className={`${
                isUser
                    ? "bg-purple-600/90 text-white rounded-tr-md rounded-bl-3xl"
                    : "bg-zinc-800/90 text-gray-100 rounded-tl-md rounded-br-3xl"
            } py-3 px-5 max-w-md shadow-xl rounded-3xl break-words whitespace-pre-wrap`}
        >
            <ReactMarkdown
                components={{
                    h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-purple-300 mt-2 mb-1" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-extrabold text-white" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-0" {...props} />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

// --- COMPONENT: Tool Approval Request (Human-in-the-Loop) ---
const ToolApprovalMessage = ({ toolCall, onApprove, onReject }) => {
    const [feedback, setFeedback] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);

    return (
        <div className="bg-zinc-900/90 border border-yellow-500/50 text-gray-100 rounded-xl p-4 max-w-md shadow-2xl">
            <div className="flex items-center gap-2 mb-2 text-yellow-400 font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Approval Required
            </div>
            
            <p className="text-sm text-gray-300 mb-3">
                I want to execute: <span className="font-mono text-purple-300 bg-black/50 px-1 rounded">{toolCall.name}</span>
            </p>
            <div className="text-xs font-mono bg-black/50 p-2 rounded mb-4 text-gray-400 overflow-x-auto">
                {JSON.stringify(toolCall.args)}
            </div>

            {!isRejecting ? (
                <div className="flex gap-3">
                    <button 
                        onClick={onApprove}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold transition"
                    >
                        Approve ✅
                    </button>
                    <button 
                        onClick={() => setIsRejecting(true)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-semibold transition"
                    >
                        Reject ❌
                    </button>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-top-2">
                    <input 
                        type="text" 
                        placeholder="Why? (e.g., 'Check news first')" 
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 mb-2"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onReject(feedback)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-semibold"
                        >
                            Send Feedback
                        </button>
                        <button 
                            onClick={() => setIsRejecting(false)}
                            className="px-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENT: File Upload Modal Content ---
const DocumentUploadContent = ({ onFileUpload }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const { setOpen } = useModal(); 

    const handleFileSelect = (newFiles) => {
        setSelectedFile(newFiles.length > 0 ? newFiles[0] : null);
    };
    
    const handleFinalUpload = () => {
        if (selectedFile) {
            onFileUpload(selectedFile); 
            setSelectedFile(null);
            setOpen(false); 
        }
    };

    return (
        <ModalContent className="p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Upload Document 📁</h3>
            <p className="text-gray-400 mb-6">Select a PDF to add to the bot's knowledge base (RAG).</p>
            <FileUpload onChange={handleFileSelect} />
            <button
                onClick={handleFinalUpload}
                disabled={!selectedFile}
                className={`mt-6 w-full py-3 text-lg font-semibold rounded-lg transition transform active:scale-95 ${
                    selectedFile ? 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/50' : 'bg-gray-700 cursor-not-allowed text-gray-400'
                }`}
            >
                {selectedFile ? `Ingest ${selectedFile.name}` : 'Select File First'}
            </button>
        </ModalContent>
    );
};

// --- COMPONENT: Upload Button ---
const UploadButton = () => {
    const { setOpen } = useModal(); 
    return (
        <div className="relative flex-shrink-0">
            <span className="absolute inset-0 z-0 bg-purple-500 rounded-full opacity-50 blur-sm animate-ping-slow"></span>
            <button
                onClick={() => setOpen(true)}
                className="relative z-10 p-3 h-12 w-12 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition duration-200 flex items-center justify-center shadow-[0_4px_14px_0_rgb(109,40,217,50%)]"
                title="Upload Document"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
                    <path d="M12 11l0 6" />
                    <path d="M9 14l3 3l3 -3" />
                </svg>
            </button>
        </div>
    );
};

const BotIcon = () => (
    <div className="h-10 w-10 bg-purple-700 rounded-full flex items-center justify-center shadow-lg border-2 border-purple-500 flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-white">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M6 12h12" />
            <path d="M12 21a9 9 0 1 0 0 -18a9 9 0 0 0 0 18z" />
            <path d="M9 10l.01 0" />
            <path d="M15 10l.01 0" />
            <path d="M9 15h6" />
        </svg>
    </div>
);

const ChatbotPage = () => {
    const placeholders = ["What's the weather?", "Check inventory for Laptop", "Stock price of AAPL?", "Drug interactions?", "Parking rules?"];
    
    // Use Ref for Thread ID to persist across renders without triggering re-renders
    const threadId = useRef(generateThreadId());

    const [messages, setMessages] = useState([
        { text: "Hi! I'm your AI assistant with RAG & HITL capabilities. How can I help?", sender: "bot", type: "text" },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef(null);

    const handleChange = () => {};

    // --- GENERIC API HANDLER ---
    const sendChatRequest = async (payload) => {
        setIsLoading(true);
        try {
            const response = await fetch(CHAT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...payload,
                    thread_id: threadId.current 
                }),
            });

            if (!response.ok) throw new Error("Server error");
            const data = await response.json();

            // Handle "Requires Approval" State
            if (data.status === "requires_approval") {
                setMessages((prev) => [...prev, {
                    text: data.response, // "I want to run..."
                    sender: "bot",
                    type: "approval",
                    tool_call: data.tool_call
                }]);
            } else {
                // Handle Standard Response
                setMessages((prev) => [...prev, { 
                    text: data.response, 
                    sender: "bot", 
                    type: "text" 
                }]);
            }

        } catch (error) {
            console.error("API Error:", error);
            setMessages((prev) => [...prev, { text: "⚠️ Error connecting to backend.", sender: "bot", type: "text" }]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- USER SUBMIT ---
    const onSubmit = async (value) => {
        if (value.trim() === "") return;
        setMessages((prev) => [...prev, { text: value, sender: "user", type: "text" }]);
        await sendChatRequest({ message: value });
    };

    // --- HITL ACTIONS ---
    const handleApprove = async () => {
        // Remove the approval UI and show a generic "Approved" message
        setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], type: "text", text: "✅ Action Approved. Executing..." };
            return newMsgs;
        });
        
        await sendChatRequest({ action: "resume" });
    };

    const handleReject = async (feedbackText) => {
        setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], type: "text", text: `❌ Action Rejected: ${feedbackText}` };
            return newMsgs;
        });

        await sendChatRequest({ 
            action: "feedback", 
            feedback_text: feedbackText || "Don't do that." 
        });
    };

    // --- FILE UPLOAD (RAG INGESTION) ---
    const handleFileUpload = async (file) => {
        setMessages((prev) => [...prev, { text: `📤 Uploading ${file.name}...`, sender: "user", type: "text" }]);
        setIsLoading(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(INGEST_URL, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");
            const data = await response.json();

            setMessages((prev) => [...prev, { 
                text: `✅ Document Ingested! Added ${data.chunks_added} chunks to knowledge base.`, 
                sender: "bot", 
                type: "text" 
            }]);

        } catch (error) {
            setMessages((prev) => [...prev, { text: "❌ Upload failed.", sender: "bot", type: "text" }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    return (
        <div className="w-full h-screen bg-black relative overflow-hidden">
            <div 
                className="absolute inset-0 z-0 opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(circle at center, #1f2937 1px, transparent 0)',
                    backgroundSize: '20px 20px',
                }}
            ></div>

            <Modal> 
                <ModalBody className="max-w-lg bg-zinc-900 border border-purple-600 rounded-xl shadow-2xl"> 
                    <DocumentUploadContent onFileUpload={handleFileUpload} />
                </ModalBody> 
                
                <VortexContainer
                    backgroundColor="transparent" 
                    range={16}
                    speed={1.5}
                    hue={270}
                    containerClassName="absolute inset-0"
                    className="flex items-center flex-col justify-end px-4 py-10 h-full min-h-[calc(100vh)] pt-16" 
                >
                    <div className="flex-grow w-full max-w-4xl mx-auto flex flex-col justify-end">
                        
                        {/* Chat Messages Area */}
                        <div 
                            ref={chatContainerRef}
                            className="flex-grow w-full max-h-[80vh] rounded-xl bg-black/50 border border-purple-900/50 backdrop-blur-xl p-6 overflow-y-auto custom-scrollbar shadow-2xl transition duration-500 ease-in-out"
                        >
                            {messages.length === 0 ? (
                                <div className="flex justify-center items-center h-full">
                                    <p className="text-gray-400 text-lg italic animate-pulse">✨ Waiting for your genius query...</p>
                                </div>
                            ) : (
                                <>
                                    {messages.map((message, index) => (
                                        <div
                                            key={index}
                                            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} mb-6`}
                                        >
                                            {message.sender === "bot" && (
                                                <div className="mr-3 mt-1 flex-shrink-0"><BotIcon /></div>
                                            )}
                                            
                                            {/* CONDITIONAL RENDERING BASED ON MESSAGE TYPE */}
                                            {message.type === "approval" ? (
                                                <ToolApprovalMessage 
                                                    toolCall={message.tool_call} 
                                                    onApprove={handleApprove}
                                                    onReject={handleReject}
                                                />
                                            ) : (
                                                <MarkdownMessage content={message.text} sender={message.sender} />
                                            )}
                                        </div>
                                    ))}
                                    
                                    {isLoading && (
                                        <div className="flex justify-start mb-6 animate-pulse">
                                            <div className="mr-3 mt-1 flex-shrink-0"><BotIcon /></div>
                                            <div className="bg-zinc-800/50 text-gray-400 rounded-tl-md rounded-br-3xl py-3 px-5 max-w-md rounded-3xl italic">
                                                Thinking...
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="w-full h-px mt-6 mb-4 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>

                        <div className="w-full flex items-center space-x-4 justify-center">
                            <UploadButton />
                            <div className="flex-grow max-w-xl">
                                <PlaceholdersAndVanishInput
                                    placeholders={placeholders}
                                    onChange={handleChange}
                                    onSubmit={onSubmit}
                                />
                            </div>
                        </div>

                    </div>
                </VortexContainer>
            </Modal>
        </div>
    );
};

export default ChatbotPage;