import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown'; // <<-- New Import
// Assuming Vortex is imported as VortexContainer in your original code
import { Vortex as VortexContainer } from "../components/ui/vortex";
import { PlaceholdersAndVanishInput } from "../components/ui/placeholders-and-vanish-input";
import { FileUpload } from "../components/ui/file-upload";
import { Modal, ModalBody, ModalContent, useModal } from "../components/ui/animated-modal"; 

// --- API CONFIGURATION ---
const API_URL = "http://localhost:8000/chat";

// --- START: Component for Rendering Markdown ---
const MarkdownMessage = ({ content, sender }) => {
    const isUser = sender === "user";
    
    return (
        // The container div defines the bubble shape and color
        <div
            className={`${
                isUser
                    ? "bg-purple-600/90 text-white rounded-tr-md rounded-bl-3xl"
                    : "bg-zinc-800/90 text-gray-100 rounded-tl-md rounded-br-3xl"
            } py-3 px-5 max-w-md shadow-xl rounded-3xl break-words whitespace-pre-wrap`}
        >
            <ReactMarkdown
                // Customize HTML rendering for a consistent look
                components={{
                    h3: ({ node, ...props }) => (
                        <h3 className="text-lg font-semibold text-purple-300 mt-2 mb-1" {...props} />
                    ),
                    strong: ({ node, ...props }) => <strong className="font-extrabold text-white" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-0" {...props} />, // Ensure paragraphs don't add extra margins
                    // Add more component overrides as needed (e.g., ul, li)
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

// --- START: Component for the Modal Content (The Two-Step Upload) ---
const DocumentUploadContent = ({ onFileUpload }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const { setOpen } = useModal(); 

    const handleFileSelect = (newFiles) => {
        setSelectedFile(newFiles.length > 0 ? newFiles[0] : null);
    };
    
    const handleFinalUpload = () => {
        if (selectedFile) {
            console.log("Finalizing upload for:", selectedFile.name);
            onFileUpload(selectedFile); 
            setSelectedFile(null);
            setOpen(false); // Close the modal
        }
    };

    return (
        <ModalContent className="p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Upload Document 📁</h3>
            <p className="text-gray-400 mb-6">Select or drag a file to upload for context:</p>
            
            <FileUpload onChange={handleFileSelect} />

            <button
                onClick={handleFinalUpload}
                disabled={!selectedFile}
                className={`mt-6 w-full py-3 text-lg font-semibold rounded-lg transition transform active:scale-95 ${
                    selectedFile ? 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/50' : 'bg-gray-700 cursor-not-allowed text-gray-400'
                }`}
            >
                {selectedFile ? `Upload & Analyze ${selectedFile.name}` : 'Select File First'}
            </button>
        
            <button
                onClick={() => setOpen(false)}
                className="mt-3 w-full py-3 text-sm bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition"
            >
                Cancel
            </button>
        </ModalContent>
    );
};
// --- END: Component for the Modal Content ---

// --- START: Upload Button Component ---
const UploadButton = () => {
    const { setOpen } = useModal(); 
    
    const handleUploadClick = () => {
        setOpen(true); // Manually open the modal
    };

    return (
        <div className="relative flex-shrink-0">
            {/* Pulsating glow ring for aesthetic appeal */}
            <span className="absolute inset-0 z-0 bg-purple-500 rounded-full opacity-50 blur-sm animate-ping-slow"></span>
            
            <button
                onClick={handleUploadClick}
                className="relative z-10 p-3 h-12 w-12 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition duration-200 flex items-center justify-center shadow-[0_4px_14px_0_rgb(109,40,217,50%)]"
                title="Upload Document for Context"
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
// --- END: Upload Button Component ---

// --- START: Bot Icon Component ---
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
    // ... (placeholders, useState, useRef remain the same) ...

    const placeholders = [
        "What's the weather like?",
        "Check inventory for Laptop",
        "What is the stock price of AAPL?",
        "Drug interactions for Aspirin?",
        "Tell me about parking permits.",
    ];

    const [messages, setMessages] = useState([
        { text: "Hi there! I'm your AI assistant. I can help with Inventory, Public Policy, Financial Markets, and Healthcare queries.", sender: "bot" },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef(null);

    const handleChange = () => {};

    // --- MAIN API INTEGRATION ---
    const onSubmit = async (value) => {
        if (value.trim() === "") return;

        // 1. Add User Message immediately
        const userMessage = { text: value, sender: "user" };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setIsLoading(true);

        try {
            // 2. Call FastAPI Backend
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: value,
                    user_context: "general" // Default context
                }),
            });

            if (!response.ok) {
                throw new Error("Server error");
            }

            const data = await response.json();

            // 3. Add Bot Response
            const botResponse = { 
                text: data.response, 
                sender: "bot",
                // Optional: You can display which tool was used if you want
                // toolUsed: data.used_tool 
            };
            setMessages((prevMessages) => [...prevMessages, botResponse]);

        } catch (error) {
            console.error("API Error:", error);
            const errorMessage = { text: "⚠️ Error connecting to the Orchestrator. Is the backend running?", sender: "bot" };
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- FILE UPLOAD INTEGRATION ---
    const handleFileUpload = async (file) => {
        // Since the backend provided currently only accepts text messages via /chat,
        // we will simulate the file upload visual, but send a text prompt to the backend
        // to acknowledge the context.
        
        const fileMessage = { text: `✅ Document uploaded: ${file.name}.`, sender: "user" };
        setMessages((prevMessages) => [...prevMessages, fileMessage]);
        setIsLoading(true);

        try {
            // Send a "system-like" message to the bot so it knows context was added
            const prompt = `I have just uploaded a document named "${file.name}". Please acknowledge this and be ready to answer questions about it.`;
            
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: prompt, user_context: "general" }),
            });

            const data = await response.json();
            
            setMessages((prevMessages) => [...prevMessages, { text: data.response, sender: "bot" }]);

        } catch (error) {
            setMessages((prevMessages) => [...prevMessages, { text: "Error analyzing file context.", sender: "bot" }]);
        } finally {
            setIsLoading(false);
        }
    }
    
    // Auto-scroll to the bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    return (
        <div className="w-full h-screen bg-black relative overflow-hidden">
            
            {/* 1. Subtle Background Pattern Layer */}
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
                                    <p className="text-gray-400 text-lg italic animate-pulse">
                                        ✨ Waiting for your genius query...
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {messages.map((message, index) => (
                                        <div
                                            key={index}
                                            className={`flex ${
                                                message.sender === "user" ? "justify-end" : "justify-start"
                                            } mb-6`}
                                        >
                                            {message.sender === "bot" && (
                                                <div className="mr-3 mt-1 flex-shrink-0">
                                                    <BotIcon />
                                                </div>
                                            )}
                                            
                                            {/* RENDER THE MARKDOWN HERE */}
                                            <MarkdownMessage content={message.text} sender={message.sender} />
                                            
                                        </div>
                                    ))}
                                    {/* Loading Indicator */}
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

                        {/* Visual Separator */}
                        <div className="w-full h-px mt-6 mb-4 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>


                        {/* Input Bar and Upload Button */}
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