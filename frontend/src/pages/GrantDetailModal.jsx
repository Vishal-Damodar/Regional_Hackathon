import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GrantDetailModal = ({ grant, onClose }) => {
    // --- Existing State ---
    const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
    const [feedbackReason, setFeedbackReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);

    // --- NEW: Chatbot State ---
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState([
        { role: 'bot', text: `Hello! I can answer questions about the **${grant.title}** grant. What do you need to know?` }
    ]);
    
    // Ref to auto-scroll chat to bottom
    const chatEndRef = useRef(null);

    // Scroll to bottom whenever chatHistory changes
    useEffect(() => {
        if (isChatbotOpen && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isChatbotOpen]);

    // --- Helpers ---
    const getStatusColor = (status) => {
        if (status === 'High Match') return 'bg-green-600';
        if (status === 'Medium Match') return 'bg-yellow-600';
        return 'bg-red-600';
    };

    const handleNotAGrantClick = () => { 
        setIsFeedbackVisible(prev => !prev); 
    };

    const handleSubmitFeedback = () => {
        if (!feedbackReason.trim()) {
            alert("Please provide a reason.");
            return;
        }
        setIsSubmitting(true);
        setTimeout(() => {
            console.log(`Feedback for Grant ${grant.id}: ${feedbackReason}`);
            alert(`Thank you for your feedback! Grant: "${grant.title}" marked as potentially irrelevant.`);
            onClose(); 
        }, 1000);
    };
    
    const handleChatbotToggle = () => { 
        setIsChatbotOpen(prev => !prev); 
    };

    // --- NEW: Chat Message Handler ---
    const handleSendMessage = () => {
        if (!chatInput.trim()) return;

        // 1. Add User Message
        const userMsg = { role: 'user', text: chatInput };
        setChatHistory((prev) => [...prev, userMsg]);
        const currentInput = chatInput; // Store for API call if needed
        setChatInput(""); // Clear input

        // 2. Simulate Bot Response (Replace this with real API call later)
        setTimeout(() => {
            setChatHistory((prev) => [
                ...prev, 
                { role: 'bot', text: `I received your question: "${currentInput}". I am currently a demo bot, but soon I will be connected to AI!` }
            ]);
        }, 1000);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    return (
        // Modal Background Overlay
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm" onClick={onClose}>
            
            {/* Modal Content */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-900 w-11/12 max-w-5xl max-h-[90vh] rounded-xl shadow-2xl p-6 relative flex flex-col" 
                onClick={e => e.stopPropagation()} 
            >
                {/* Close Button */}
                <motion.button 
                    onClick={onClose}
                    initial={{ opacity: 0, rotate: -180, scale: 0.5 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    whileHover={{ rotate: 90, scale: 1.2, transition: { duration: 0.4 } }}
                    className="absolute top-3 right-3 text-white hover:text-red-500 text-3xl font-bold p-1 leading-none z-10 outline-none"
                >
                    &times;
                </motion.button>

                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-6 border-b border-gray-700 pb-2">
                    {grant.title}
                </h2>

                <div className="flex-grow grid md:grid-cols-2 gap-6 overflow-hidden">
                    
                    {/* LEFT SIDE: Document Preview */}
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-white mb-2 border-b border-gray-700 pb-2">Document Preview</h3>
                        <div className="flex-grow bg-gray-700 rounded-lg overflow-hidden border border-gray-600">
                            <iframe 
                                src={`/documents/${grant.document_url}`} 
                                title={`${grant.title} Document`}
                                className="w-full h-full"
                                style={{ border: 'none' }}
                            >
                                <p className="p-4 text-center text-red-400">Your browser does not support iframes.</p>
                            </iframe>
                        </div>
                    </div>
                    
                    {/* RIGHT SIDE: Grant Details */}
                    <div className="flex flex-col overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-neutral-400">
                                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(grant.status)}`}>
                                    {grant.status}
                                </span>
                            </p>

                            <div className="bg-gray-800 p-4 rounded-lg">
                                <h3 className="text-xl font-bold text-green-400 mb-1">Key Information</h3>
                                <ul className="text-neutral-300 space-y-1">
                                    <li><strong>Amount:</strong> {grant.amount}</li>
                                    <li><strong>Sector:</strong> {grant.sector}</li>
                                    <li><strong>Deadline:</strong> {grant.deadline}</li>
                                </ul>
                            </div>

                            <div className="bg-gray-800 p-4 rounded-lg">
                                <h3 className="text-xl font-bold text-white mb-2">Description</h3>
                                <p className="text-neutral-300 text-sm">{grant.description}</p>
                            </div>

                            <div className="bg-gray-800 p-4 rounded-lg">
                                <h3 className="text-xl font-bold text-white mb-2">Eligibility Criteria</h3>
                                <ul className="list-disc list-inside text-neutral-300 text-sm space-y-1">
                                    {grant.eligibility.map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer and Feedback Section */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                    <button
                        onClick={handleNotAGrantClick}
                        className="flex items-center px-4 py-2 text-sm font-medium text-red-400 border border-red-400 rounded-full hover:bg-red-900/50 transition"
                    >
                        <span className="text-lg mr-2">👎</span> <strong>Not a Relevant Grant</strong>
                    </button>

                    {isFeedbackVisible && (
                        <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                            <h4 className="font-semibold text-red-300 mb-2">Why is this not a grant or relevant?</h4>
                            <textarea
                                value={feedbackReason}
                                onChange={(e) => setFeedbackReason(e.target.value)}
                                placeholder="e.g., The document links to a different scheme..."
                                className="w-full p-2 h-20 bg-gray-900 border border-red-700 rounded-lg text-white resize-none focus:ring-red-500 focus:border-red-500"
                            />
                            <button
                                onClick={handleSubmitFeedback}
                                disabled={isSubmitting || !feedbackReason.trim()}
                                className="mt-2 px-4 py-2 text-sm font-medium rounded-full bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-500 transition"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                        </div>
                    )}
                </div>
                
                {/* CHATBOT WINDOW */}
                <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end">
                    <AnimatePresence>
                        {isChatbotOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: 50, scale: 0.9 }} 
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="w-80 h-96 bg-gray-800 border border-cyan-500 rounded-lg shadow-2xl p-4 mb-3 flex flex-col"
                            >
                                <h4 className="text-lg font-bold text-cyan-400 border-b border-gray-700 pb-2 mb-2">Grant Bot</h4>
                                
                                {/* Messages Container */}
                                <div className="flex-grow overflow-y-auto text-sm text-neutral-300 space-y-3 pr-1 custom-scrollbar">
                                    {chatHistory.map((msg, index) => (
                                        <div 
                                            key={index} 
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`p-2 rounded-lg max-w-[85%] break-words ${
                                                msg.role === 'user' 
                                                ? 'bg-cyan-700 text-white rounded-tr-none' 
                                                : 'bg-gray-700 text-gray-200 rounded-tl-none'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Invisible div to scroll to */}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="mt-3 flex gap-2">
                                    <input 
                                        type="text" 
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask a question..." 
                                        className="flex-grow p-2 bg-gray-900 border border-cyan-500/50 rounded text-white text-sm focus:outline-none focus:border-cyan-400 transition-colors"
                                    />
                                    <button 
                                        onClick={handleSendMessage}
                                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 rounded text-lg transition-colors flex items-center justify-center"
                                    >
                                        ➤
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* CHATBOT TOGGLE BUTTON */}
                    <motion.button
                        onClick={handleChatbotToggle}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ 
                            scale: 1, 
                            opacity: 1,
                            rotate: isChatbotOpen ? 45 : 0, 
                            backgroundColor: isChatbotOpen ? '#dc2626' : '#06b6d4',
                            color: isChatbotOpen ? '#ffffff' : '#111827'
                        }}
                        transition={{ 
                            default: { duration: 0.6, ease: "easeInOut" },
                            scale: { duration: 0.8, type: "spring", bounce: 0.5 }
                        }}
                        whileHover={{ scale: 1.1 }}
                        className="w-14 h-14 rounded-full shadow-lg text-xl font-bold flex items-center justify-center outline-none"
                        title={isChatbotOpen ? 'Close Chatbot' : 'Open Chatbot'}
                    >
                        {isChatbotOpen ? '+' : '💬'}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default GrantDetailModal;