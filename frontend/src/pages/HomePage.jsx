import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom"; 

// Ensure these imports match your actual file structure
import { BackgroundBeamsWithCollision } from "../components/ui/background-beams-with-collision";
import { TextGenerateEffect } from "../components/ui/text-generate-effect";
import { CardContainer, CardBody, CardItem } from "../components/ui/3dCard"; 

// --- GRANT DISCOVERY MODAL COMPONENT ---
const GrantDiscoveryModal = ({ isOpen, onClose }) => {
    const totalSteps = 7;
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({});
    const [isLoading, setIsLoading] = useState(false); 
    const navigate = useNavigate();

    if (!isOpen) return null;

    const progressPercentage = (currentStep / totalSteps) * 100;

    const questions = [
        { 
            step: 1, 
            label: "What is your Company Size?", 
            key: "SME_Size", 
            type: "radio", 
            // UPDATED: Added "Large" per request
            options: ["Micro", "Small", "Medium", "Large"], 
            info: "Must match your official registration size." 
        },
        { 
            step: 2, 
            label: "Do you have Udyam Registration?", 
            key: "Udyam_Status", 
            type: "radio", 
            options: ["Yes", "No"], 
            info: "This status is critical for many government schemes." 
        },
        { 
            step: 3, 
            label: "What is your primary Sector?", 
            key: "Sector_Category", 
            type: "select", 
            // UPDATED: Expanded options to match Streamlit frontend
            options: ["Manufacturing", "Service", "Trading", "Agriculture", "Textiles", "Renewable Energy"], 
            info: "Select the vertical that best describes your business." 
        },
        { 
            step: 4, 
            label: "What is your Financial Health?", 
            key: "Financial_Performance", 
            type: "radio", 
            // UPDATED: Changed from Yes/No to specific status from Streamlit
            options: ["Profitable", "Loss Making", "New Startup"], 
            info: "Helps determine eligibility based on profitability or startup status." 
        },
        { 
            step: 5, 
            label: "In which State is your primary business located?", 
            key: "Location_State", 
            type: "select", 
            options: ["Telangana", "Assam", "J&K", "Maharashtra", "Tamil Nadu", "Karnataka", "Other"], 
            info: "Must match the Additional Geographic Filter if one is present." 
        },
        { 
            step: 6, 
            label: "What is your Project Budget (in INR Lakhs)?", 
            key: "Project_Value", 
            type: "number", 
            info: "Enter the total estimated cost of your project." 
        },
        { 
            step: 7, 
            label: "Describe your project need in detail", 
            key: "Project_Need", 
            type: "textarea", 
            info: "E.g., 'I need funding to install rooftop solar panels and buy energy efficient machinery.'" 
        },
    ];

    const currentQuestion = questions.find(q => q.step === currentStep);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNext = async () => {
        if (!formData[currentQuestion.key]) {
            alert("Please select or enter a value before proceeding.");
            return;
        }

        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        } else {
            await fetchMatches();
        }
    };

    const fetchMatches = async () => {
        setIsLoading(true);
        try {
            // Construct payload strictly matching the Backend 'SMEProfile' model
            const payload = {
                sme_profile: {
                    sme_size: formData.SME_Size,
                    udyam_status: formData.Udyam_Status === "Yes", 
                    sector_category: formData.Sector_Category,
                    financial_performance: formData.Financial_Performance, 
                    location_state: formData.Location_State,
                    project_value: parseFloat(formData.Project_Value || 0), 
                    project_need_description: formData.Project_Need
                }
            };

            const response = await fetch("http://127.0.0.1:8000/match-grants", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();
            
            onClose();
            navigate('/grants/results', { 
                state: { 
                    grants: data.matches, 
                    checklist: data.top_match_checklist,
                    formData: formData 
                } 
            });

        } catch (error) {
            console.error("Failed to fetch grants:", error);
            alert("Error connecting to AI server. Please ensure backend is running.");
        } finally {
            setIsLoading(false);
            setCurrentStep(1); 
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const renderInput = () => {
        const value = formData[currentQuestion.key] || "";
        switch (currentQuestion.type) {
            case "radio":
                return (
                    <div className="flex flex-col space-y-3 mt-4">
                        {currentQuestion.options.map(option => (
                            <label key={option} className="inline-flex items-center text-white cursor-pointer">
                                <input type="radio" name={currentQuestion.key} value={option} checked={value === option} onChange={handleInputChange} className="form-radio h-5 w-5 text-cyan-500 bg-gray-700 border-gray-600 focus:ring-cyan-500" />
                                <span className="ml-3">{option}</span>
                            </label>
                        ))}
                    </div>
                );
            case "select":
                return (
                    <select name={currentQuestion.key} value={value} onChange={handleInputChange} className="mt-4 w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 transition duration-300">
                        <option value="" disabled>Select an option</option>
                        {currentQuestion.options.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                );
            case "number":
                return (
                    <>
                        <input type="number" name={currentQuestion.key} value={value} onChange={handleInputChange} placeholder="Enter value (e.g., 50)" className="mt-4 w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 transition duration-300" />
                        <p className="text-xs text-neutral-400 mt-2">Enter value in **INR Lakhs** (e.g., 10 for ₹10,00,000).</p>
                    </>
                );
            case "textarea":
                return (
                    <textarea 
                        name={currentQuestion.key} 
                        value={value} 
                        onChange={handleInputChange} 
                        placeholder="I need funding to install rooftop solar panels..." 
                        rows={4}
                        className="mt-4 w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 transition duration-300" 
                    />
                );
            default: return null;
        }
    };

    return (
        <motion.div className="fixed inset-0 z-[100] bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-neutral-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-800" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
                
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
                        <h3 className="text-xl font-bold text-white">Consulting AI Knowledge Graph...</h3>
                        <p className="text-neutral-400 text-sm mt-2">Matching your profile against government schemes.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center pb-4 border-b border-gray-800 mb-4">
                            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Grant Matching Assistant (Step {currentStep}/{totalSteps})</h3>
                            <button onClick={onClose} className="text-white hover:text-cyan-400 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded-full mb-6">
                            <div className="h-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                        <div className="h-48 flex flex-col justify-center">
                            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                                <p className="text-lg font-semibold text-white mb-2">{currentQuestion.label}</p>
                                {renderInput()}
                                <p className="text-xs text-neutral-500 mt-3 italic">**Guidance:** {currentQuestion.info}</p>
                            </motion.div>
                        </div>
                        <div className="flex justify-between mt-6 pt-4 border-t border-gray-800">
                            <button onClick={handleBack} disabled={currentStep === 1} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${currentStep === 1 ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 text-white"}`}>&larr; Back</button>
                            <button onClick={handleNext} className="px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-500 hover:bg-cyan-600 text-black transition">{currentStep === totalSteps ? "Find Matches" : "Next Question →"}</button>
                        </div>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
};

// --- MAIN HOME PAGE COMPONENT ---
const HomePage = () => {
    const navigate = useNavigate(); 
    const [isModalOpen, setIsModalOpen] = useState(false);

    const navigateToChatbot = () => {
        navigate("/chatbot"); 
    };

    const openGrantModal = () => {
        setIsModalOpen(true);
    };

    const closeGrantModal = () => {
        setIsModalOpen(false);
    };

    return (
        <>
            {/* 🌌 Hero Section 🌌 */}
            <div className="h-screen w-full bg-neutral-950 relative flex flex-col items-center justify-center antialiased">
                <BackgroundBeamsWithCollision className="absolute top-0 left-0 w-full h-full z-0" />
                <div className="relative z-10 max-w-4xl mx-auto p-4 flex flex-col items-center justify-center">
                    <h1 className="text-2xl md:text-8xl bg-clip-text text-transparent bg-gradient-to-b from-green-300 to-cyan-500 text-center font-sans font-extrabold tracking-tight">
                        Energy Transition Grant Finder
                    </h1>
                    <TextGenerateEffect words="Unlocking critical funding for SMEs' sustainable future with AI-powered Knowledge Graphs and RAG technology." className="text-center text-sm md:text-xl text-neutral-300 mt-6 max-w-2xl" />
                
                    {/* **START: BUTTONS CONTAINER** */}
                    <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mt-12">
                        {/* 🔎 FIND GRANTS BUTTON 🔎 */}
                        <button 
                            onClick={openGrantModal} 
                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-extrabold rounded-full shadow-lg shadow-green-500/50 hover:from-green-600 hover:to-blue-600 hover:shadow-xl hover:shadow-blue-400/70 hover:translate-y-[-2px] transition duration-500 ease-in-out focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-opacity-75 text-lg flex items-center space-x-2 cursor-pointer"
                        >
                            <span>Find Grants</span>
                            <span role="img" aria-label="magnifying glass">🔎</span>
                        </button>
                    </div>
                </div>
            </div>
            
            {/* **AESTHETIC SEPARATOR 1** */}
            <div className="w-full h-[2px] bg-neutral-950 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-75 animate-pulse"></div>
            </div>
            
            {/* **Service Cards Section** */}
            <div className="w-full bg-neutral-950 flex flex-col items-center justify-center p-8 py-20">
                <h2 className="text-4xl font-bold text-white mb-12">Powered by Advanced AI</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12 w-full max-w-7xl px-4">
                    
                    {/* Card 1: Knowledge Graph & Data Ingestion */}
                    <CardContainer className="inter-var flex justify-center w-full"> 
                        <CardBody className="bg-gray-800 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:border-white/[0.2] border-black/[0.1] w-full md:max-w-md h-auto rounded-xl p-6 border ">
                            <CardItem translateZ="50" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                                🕸️ Dynamic Knowledge Graph
                            </CardItem>
                            <CardItem as="p" translateZ="60" className="text-neutral-300 text-sm max-w-sm mt-2">
                                Our platform stays current. Admins add grant URLs, and our AI instantly converts unstructured web data into a structured Knowledge Graph for accurate matching.
                            </CardItem>
                            <CardItem translateZ="100" className="w-full mt-4">
                                <div className="w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                                    <span role="img" aria-label="database" className="mr-2">🔄</span> Real-time Data Ingestion
                                </div>
                            </CardItem>
                        </CardBody>
                    </CardContainer>

                    {/* Card 2: Feedback Loop (Dislike & Refine) */}
                    <CardContainer className="inter-var flex justify-center w-full">
                        <CardBody className="bg-gray-800 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:border-white/[0.2] border-black/[0.1] w-full md:max-w-md h-auto rounded-xl p-6 border ">
                            <CardItem translateZ="50" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                                🎯 Precision Feedback Loop
                            </CardItem>
                            <CardItem as="p" translateZ="60" className="text-neutral-300 text-sm max-w-sm mt-2">
                                View official PDFs directly. If a grant isn't a fit, dislike it and tell us why. We use your feedback to make the prompt stricter and the matches smarter.
                            </CardItem>
                            <CardItem translateZ="100" className="w-full mt-4">
                                <div className="w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                                    <span role="img" aria-label="thumbs" className="mr-2">👍/👎</span> Adaptive AI Filtering
                                </div>
                            </CardItem>
                        </CardBody>
                    </CardContainer>

                    {/* Card 3: RAG Chatbot */}
                    <CardContainer className="inter-var flex justify-center w-full">
                        <CardBody className="bg-gray-800 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:border-white/[0.2] border-black/[0.1] w-full md:max-w-md h-auto rounded-xl p-6 border ">
                            <CardItem translateZ="50" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                                🤖 RAG-Powered Assistant
                            </CardItem>
                            <CardItem as="p" translateZ="60" className="text-neutral-300 text-sm max-w-sm mt-2">
                                Don't just read requirements—discuss them. Use our Chatbot to query specific grant documents via Retrieval Augmented Generation (RAG) for instant clarity.
                            </CardItem>
                            <CardItem translateZ="100" className="w-full mt-4">
                                <div className="w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                                    <span role="img" aria-label="chat" className="mr-2">💬</span> Contextual Doc Chat
                                </div>
                            </CardItem>
                        </CardBody>
                    </CardContainer>
                </div>
            </div>
            
            {/* 🦶 EXPANDED FOOTER SECTION 🦶 */}
            <footer className="w-full bg-neutral-900 border-t border-neutral-800 pt-16 pb-8 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 border-b border-neutral-700 pb-10">
                        
                        {/* Column 1: Logo/Title and Description */}
                        <div className="col-span-2 lg:col-span-2">
                            <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-4">
                                GrantTech AI
                            </h3>
                            <p className="text-sm text-neutral-400 max-w-xs">
                                Accelerating the energy transition for SMEs by simplifying grant discovery with Knowledge Graphs and RAG technology.
                            </p>
                        </div>

                        {/* Column 2: Quick Links */}
                        <div>
                            <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-neutral-400 hover:text-green-400 transition-colors duration-200 text-sm">Home</a></li>
                                <li><a href="#" className="text-neutral-400 hover:text-green-400 transition-colors duration-200 text-sm">Knowledge Graph</a></li>
                                <li><a href="#" className="text-neutral-400 hover:text-green-400 transition-colors duration-200 text-sm">Pricing</a></li>
                                <li><a onClick={navigateToChatbot} className="text-neutral-400 hover:text-green-400 transition-colors duration-200 text-sm cursor-pointer">Chatbot (AI Assistant)</a></li>
                            </ul>
                        </div>

                        {/* Column 3: Legal & Support */}
                        <div>
                            <h4 className="text-lg font-semibold mb-4 text-white">Support</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-neutral-400 hover:text-green-400 transition-colors duration-200 text-sm">Contact Us</a></li>
                                <li><a href="#" className="text-neutral-400 hover:text-green-400 transition-colors duration-200 text-sm">Grant FAQ</a></li>
                                <li><a href="#" className="text-neutral-400 hover:text-green-400 transition-colors duration-200 text-sm">Privacy Policy</a></li>
                                <li><a href="#" className="text-neutral-400 hover:text-green-400 transition-colors duration-200 text-sm">Terms of Service</a></li>
                            </ul>
                        </div>

                        {/* Column 4: Contact Info (Optional in small screens) */}
                        <div className="col-span-2 md:col-span-1">
                            <h4 className="text-lg font-semibold mb-4 text-white">Get in Touch</h4>
                            <p className="text-neutral-400 text-sm">101 Eco-Friendly Blvd,</p>
                            <p className="text-neutral-400 text-sm">Transition City, Grant Land</p>
                            <p className="mt-4 text-neutral-400 text-sm">Email: <a href="mailto:info@granttech.ai" className="hover:text-green-400">info@granttech.ai</a></p>
                        </div>
                    </div>

                    {/* Copyright Section */}
                    <div className="mt-8 pt-4 flex flex-col md:flex-row justify-between items-center">
                        <p className="text-neutral-500 text-sm">
                            &copy; {new Date().getFullYear()} GrantTech AI. All rights reserved. Accelerating the green economy.
                        </p>
                    </div>
                </div>
            </footer>
            {/* 🦶 END: EXPANDED FOOTER SECTION 🦶 */}

            {/* Render the Modal component */}
            <GrantDiscoveryModal isOpen={isModalOpen} onClose={closeGrantModal} />
        </>
    );
};

export default HomePage;