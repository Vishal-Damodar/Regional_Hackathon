import React, { useState, useEffect, useRef } from "react";
// Assuming Vortex is imported as VortexContainer in your original code
import { Vortex as VortexContainer } from "../components/ui/vortex";
import { PlaceholdersAndVanishInput } from "../components/ui/placeholders-and-vanish-input";
import { FileUpload } from "../components/ui/file-upload";
import { Modal, ModalBody, ModalContent, useModal } from "../components/ui/animated-modal"; 

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
// --- END: Component for the Modal Content (The Two-Step Upload) ---

// --- START: Upload Button Component (With glow) ---
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
// --- END: Bot Icon Component ---


// --- START: ChatbotPage Component ---
const ChatbotPage = () => {
    const placeholders = [
        "What's the weather like?",
        "Tell me a joke.",
        "What is the meaning of life?",
        "Can you help me with a task?",
        "What is your name?",
    ];

    const [messages, setMessages] = useState([
        { text: "Hi there! I'm your AI assistant. How can I help you today? Try asking me a question or uploading a document for context.", sender: "bot" },
    ]);
    const chatContainerRef = useRef(null);

    const handleChange = () => {};

    const onSubmit = (value) => {
        if (value.trim() === "") return;

        const userMessage = { text: value, sender: "user" };
        setMessages((prevMessages) => [...prevMessages, userMessage]);

        // Simulate bot response
        setTimeout(() => {
            const botResponse = { text: "Got it! Your query has been received. This is a simulated response to: '" + value + "'.", sender: "bot" };
            setMessages((prevMessages) => [...prevMessages, botResponse]);
        }, 1000);
    };

    const handleFileUpload = (file) => {
        const fileMessage = { text: `✅ Document uploaded: ${file.name}. Analyzing content for context...`, sender: "user" };
        setMessages((prevMessages) => [...prevMessages, fileMessage]);
    }
    
    // Auto-scroll to the bottom of the chat when messages change
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        // Set main container to relative for absolute children and overflow-hidden
        <div className="w-full h-screen bg-black relative overflow-hidden">
            
            {/* 1. Subtle Background Pattern Layer (z-0) */}
            <div 
                className="absolute inset-0 z-0 opacity-10"
                style={{
                    // Creates a subtle dotted pattern using CSS gradient
                    backgroundImage: 'radial-gradient(circle at center, #1f2937 1px, transparent 0)',
                    backgroundSize: '20px 20px',
                }}
            ></div>

            <Modal> 
                <ModalBody className="max-w-lg bg-zinc-900 border border-purple-600 rounded-xl shadow-2xl"> 
                    <DocumentUploadContent onFileUpload={handleFileUpload} />
                </ModalBody> 
                
                {/* 2. Vortex Container (z-10) and its content wrapper */}
                <VortexContainer
                    backgroundColor="transparent" 
                    range={16}
                    speed={1.5}
                    hue={270}
                    // containerClassName: ensures the Vortex component's outer div spans full screen
                    containerClassName="absolute inset-0"
                    // className: applies to the content wrapper div (where children go)
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
                                messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${
                                            message.sender === "user" ? "justify-end" : "justify-start"
                                        } mb-6`}
                                    >
                                        {/* BOT Message: Include Icon */}
                                        {message.sender === "bot" && (
                                            <div className="mr-3 mt-1 flex-shrink-0">
                                                <BotIcon />
                                            </div>
                                        )}
                                        
                                        <div
                                            className={`${
                                                message.sender === "user"
                                                    ? "bg-purple-600/90 text-white rounded-tr-md rounded-bl-3xl"
                                                    : "bg-zinc-800/90 text-gray-100 rounded-tl-md rounded-br-3xl"
                                            } py-3 px-5 max-w-md shadow-xl rounded-3xl break-words`}
                                        >
                                            {message.text}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Visual Separator/Hint */}
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