import React, { useState } from "react";
// 🚨 Ensure you have framer-motion installed: npm install framer-motion
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom"; 

import { BackgroundBeamsWithCollision } from "../components/ui/background-beams-with-collision";
import { TextGenerateEffect } from "../components/ui/text-generate-effect";
import { CardContainer, CardBody, CardItem } from "../components/ui/3dCard"; 
import { ParallaxScroll } from "../components/ui/parallax-scroll"; 

// --- DUMMY IMAGES ARRAY (SUSTAINABILITY THEME) ---
const DUMMY_IMAGES = [
    "https://images.unsplash.com/photo-1542838132-7236d892697b?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Solar panels
    "https://images.unsplash.com/photo-1624329241512-581d4b684534?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Wind turbines
    "https://images.unsplash.com/photo-1528659891807-6c2af05367b7?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Clean factory/SME
    "https://images.unsplash.com/photo-1621255554157-9a4c82c2a297?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Energy efficiency data
    "https://images.unsplash.com/photo-1616422332159-86b2458a2d04?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Green energy grid
    "https://images.unsplash.com/photo-1555445025-b44c204ae459?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Sustainability in an office
    "https://images.unsplash.com/photo-1579848520265-f935391c4915?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Eco-friendly shipping/logistics
    "https://images.unsplash.com/photo-1617094894375-a0d0a52f482d?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Green city
    "https://images.unsplash.com/photo-1563297010-82d2c125749f?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Digital sustainability dashboard
    "https://images.unsplash.com/photo-1620885231713-d343c3f20f01?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Electric vehicle charging
    "https://images.unsplash.com/photo-1631481180235-9856f7e41113?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Recycling/Circular economy
    "https://images.unsplash.com/photo-1596706915357-9d7a964e525a?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Smart energy monitor
    "https://images.unsplash.com/photo-1592661884485-802c3855c824?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Sustainable agriculture
    "https://images.unsplash.com/photo-1600863836371-3323a6341f23?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Geothermal energy
    "https://images.unsplash.com/photo-1582719478297-a4b087a32b90?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Clean water technology
];
// ---------------------------------

// --- NEW MODAL COMPONENT (FOR GRANT DISCOVERY) ---

const GrantDiscoveryModal = ({ isOpen, onClose }) => {
    // 6 Steps for the questionnaire
    const totalSteps = 6;
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({});
    const navigate = useNavigate(); // Initialize useNavigate here

    if (!isOpen) return null;

    const progressPercentage = (currentStep / totalSteps) * 100;
    const isLastStep = currentStep === totalSteps;

    const questions = [
        {
            step: 1,
            label: "What is your SME Size?",
            key: "SME_Size",
            type: "radio",
            options: ["Micro", "Small", "Medium"],
            info: "Must be an exact match with Grant's SME Size Eligibility.",
        },
        {
            step: 2,
            label: "Do you have Udyam Registration?",
            key: "Udyam_Status",
            type: "radio",
            options: ["Yes", "No"],
            info: "This status is critical for many government schemes.",
        },
        {
            step: 3,
            label: "What is your primary Sector Category?",
            key: "Sector_Category",
            type: "radio",
            options: ["Manufacturing", "Service", "Trading"],
            info: "Helps overlap your business with Target Vertical(s).",
        },
        {
            step: 4,
            label: "Do you satisfy all financial performance criteria (e.g., Cash Profit, Non-Default status)?",
            key: "Financial_Performance",
            type: "radio",
            options: ["Yes", "No"],
            info: "Must satisfy the conditions in Must-Have Criterion 2.",
        },
        {
            step: 5,
            label: "In which State is your primary business located?",
            key: "Location_State",
            type: "select",
            options: ["Telangana", "Assam", "J&K", "Maharashtra", "Tamil Nadu", "Karnataka", "Other"],
            info: "Must match the Additional Geographic Filter if one is present.",
        },
        {
            step: 6,
            label: "What is the estimated value of your energy transition project (in INR Lakhs)?",
            key: "Project_Value",
            type: "number",
            info: "Must be less than or equal to the Maximum Project Value (INR).",
        },
    ];

    const currentQuestion = questions.find(q => q.step === currentStep);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNext = () => {
        if (!formData[currentQuestion.key]) {
            alert("Please select or enter a value before proceeding.");
            return;
        }

        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        } else if (currentStep === totalSteps) {
            // --- FINAL SUBMISSION LOGIC ---
            
            // Navigate to the results page, passing the form data in state
            navigate('/grants/results', { state: { formData } });
            
            onClose(); // Close the modal
            setCurrentStep(1); // Reset step for next time
            // Data is kept in the navigated state, no need to clear local formData immediately
            // setFormData({}); 
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const renderInput = () => {
        const value = formData[currentQuestion.key] || "";
        switch (currentQuestion.type) {
            case "radio":
                return (
                    <div className="flex flex-col space-y-3 mt-4">
                        {currentQuestion.options.map(option => (
                            <label key={option} className="inline-flex items-center text-white cursor-pointer">
                                <input
                                    type="radio"
                                    name={currentQuestion.key}
                                    value={option}
                                    checked={value === option}
                                    onChange={handleInputChange}
                                    className="form-radio h-5 w-5 text-cyan-500 bg-gray-700 border-gray-600 focus:ring-cyan-500"
                                />
                                <span className="ml-3">{option}</span>
                            </label>
                        ))}
                    </div>
                );
            case "select":
                return (
                    <select
                        name={currentQuestion.key}
                        value={value}
                        onChange={handleInputChange}
                        className="mt-4 w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 transition duration-300"
                    >
                        <option value="" disabled>Select a State</option>
                        {currentQuestion.options.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                );
            case "number":
                return (
                    <>
                    <input
                        type="number"
                        name={currentQuestion.key}
                        value={value}
                        onChange={handleInputChange}
                        placeholder="Enter Project Value (e.g., 50)"
                        className="mt-4 w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500 transition duration-300"
                    />
                    <p className="text-xs text-neutral-400 mt-2">Enter value in **INR Lakhs** (e.g., 50 for ₹50,00,000).</p>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <motion.div
            className="fixed inset-0 z-[100] bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-neutral-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-800"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                {/* Modal Header */}
                <div className="flex justify-between items-center pb-4 border-b border-gray-800 mb-4">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                        Grant Matching Assistant (Step {currentStep}/{totalSteps})
                    </h3>
                    <button onClick={onClose} className="text-white hover:text-cyan-400 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-700 rounded-full mb-6">
                    <div
                        className="h-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>

                {/* Question Area */}
                <div className="h-48 flex flex-col justify-center">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <p className="text-lg font-semibold text-white mb-2">{currentQuestion.label}</p>
                        {renderInput()}
                        <p className="text-xs text-neutral-500 mt-3 italic">**Guidance:** {currentQuestion.info}</p>
                    </motion.div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-6 pt-4 border-t border-gray-800">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                            currentStep === 1
                                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                : "bg-purple-600 hover:bg-purple-700 text-white"
                        }`}
                    >
                        &larr; Back
                    </button>
                    <button
                        onClick={handleNext}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-500 hover:bg-cyan-600 text-black transition"
                    >
                        {isLastStep ? "Match Grants" : "Next Question →"}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// --- MAIN HOME PAGE COMPONENT ---
const HomePage = () => {
    const navigate = useNavigate(); 
    const [isModalOpen, setIsModalOpen] = useState(false); // State for the new modal

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
                    <TextGenerateEffect words="Unlocking critical funding for SMEs' sustainable future with AI-powered matching and compliance assistance." className="text-center text-sm md:text-xl text-neutral-300 mt-6 max-w-2xl" />
                
                    {/* **START: BUTTONS CONTAINER** */}
                    <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 mt-12">
                        
                        {/* 🔎 FIND GRANTS BUTTON 🔎 */}
                        <button 
                            onClick={openGrantModal} 
                            className="
                                px-8 
                                py-3 
                                bg-gradient-to-r 
                                from-green-500 
                                to-blue-500 
                                text-white 
                                font-extrabold 
                                rounded-full 
                                shadow-lg 
                                shadow-green-500/50 
                                hover:from-green-600 
                                hover:to-blue-600 
                                hover:shadow-xl 
                                hover:shadow-blue-400/70 
                                hover:translate-y-[-2px] 
                                transition 
                                duration-500 
                                ease-in-out 
                                focus:outline-none 
                                focus:ring-4 
                                focus:ring-green-500 
                                focus:ring-opacity-75
                                text-lg
                                flex items-center space-x-2
                                cursor-pointer
                            "
                        >
                            <span>Find Grants</span>
                            <span role="img" aria-label="magnifying glass">🔎</span>
                        </button>

                        {/* 🤖 CHATBOT BUTTON */}
                        <button 
                            onClick={navigateToChatbot} // Calls navigate("/chatbot")
                            className="
                                px-8 
                                py-3 
                                bg-gradient-to-r 
                                from-purple-600 
                                to-cyan-500 
                                text-white 
                                font-extrabold 
                                rounded-full 
                                shadow-lg 
                                shadow-purple-500/50 
                                hover:from-purple-700 
                                hover:to-cyan-600 
                                hover:shadow-xl 
                                hover:shadow-cyan-400/70 
                                hover:translate-y-[-2px] 
                                transition 
                                duration-500 
                                ease-in-out 
                                focus:outline-none 
                                focus:ring-4 
                                focus:ring-purple-500 
                                focus:ring-opacity-75
                                text-lg
                                flex items-center space-x-2
                                cursor-pointer
                            "
                        >
                            <span>Ask Our AI</span>
                            <span role="img" aria-label="robot">🤖</span>
                        </button>
                    </div>
                    {/* **END: BUTTONS CONTAINER** */}
                </div>
            </div>
            
            {/* **AESTHETIC SEPARATOR 1** */}
            <div className="w-full h-[2px] bg-neutral-950 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-75 animate-pulse"></div>
            </div>
            
            {/* **Service Cards Section** */}
            <div className="w-full bg-neutral-950 flex flex-col items-center justify-center p-8 py-20">
                <h2 className="text-4xl font-bold text-white mb-12">How We Help SMEs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12 w-full max-w-7xl px-4">
                    
                    {/* Card 1: AI-Powered Matching */}
                    <CardContainer className="inter-var flex justify-center w-full"> 
                        <CardBody className="bg-gray-800 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:border-white/[0.2] border-black/[0.1] w-full md:max-w-md h-auto rounded-xl p-6 border ">
                            <CardItem translateZ="50" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                                🧠 AI-Powered Matching
                            </CardItem>
                            <CardItem as="p" translateZ="60" className="text-neutral-300 text-sm max-w-sm mt-2">
                                Instantly match your SME profile against complex eligibility criteria for national and state-level energy transition grants. Never miss a funding opportunity.
                            </CardItem>
                            <CardItem translateZ="100" className="w-full mt-4">
                                <div className="w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                                    <span role="img" aria-label="brain">💡</span> Automated Eligibility Check
                                </div>
                            </CardItem>
                            <div className="flex justify-between items-center mt-6">
                                <CardItem translateZ={20} as="button" className="px-4 py-2 rounded-xl text-xs font-normal text-cyan-400">
                                    Learn More →
                                </CardItem>
                                <CardItem translateZ={20} as="button" onClick={openGrantModal} className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold">
                                    Start Match
                                </CardItem>
                            </div>
                        </CardBody>
                    </CardContainer>

                    {/* Card 2: Application Workflow */}
                    <CardContainer className="inter-var flex justify-center w-full">
                        <CardBody className="bg-gray-800 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:border-white/[0.2] border-black/[0.1] w-full md:max-w-md h-auto rounded-xl p-6 border ">
                            <CardItem translateZ="50" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                                📝 Workflow Automation
                            </CardItem>
                            <CardItem as="p" translateZ="60" className="text-neutral-300 text-sm max-w-sm mt-2">
                                Streamline the entire application process. Our platform helps you gather documentation and pre-fill forms, integrating with official portals.
                            </CardItem>
                            <CardItem translateZ="100" className="w-full mt-4">
                                <div className="w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                                    <span role="img" aria-label="clipboard">📋</span> Document Checklist & Submission Tracking
                                </div>
                            </CardItem>
                            <div className="flex justify-between items-center mt-6">
                                <CardItem translateZ={20} as="button" className="px-4 py-2 rounded-xl text-xs font-normal text-cyan-400">
                                    See Demo →
                                </CardItem>
                                <CardItem translateZ={20} as="button" className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold">
                                    Get Started
                                </CardItem>
                            </div>
                        </CardBody>
                    </CardContainer>

                    {/* Card 3: Impact Analytics */}
                    <CardContainer className="inter-var flex justify-center w-full">
                        <CardBody className="bg-gray-800 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:border-white/[0.2] border-black/[0.1] w-full md:max-w-md h-auto rounded-xl p-6 border ">
                            <CardItem translateZ="50" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                                📊 Impact & Reporting
                            </CardItem>
                            <CardItem as="p" translateZ="60" className="text-neutral-300 text-sm max-w-sm mt-2">
                                Track the financial and environmental impact of your funded projects. Automated reporting simplifies compliance with grant-specific requirements.
                            </CardItem>
                            <CardItem translateZ="100" className="w-full mt-4">
                                <div className="w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                                    <span role="img" aria-label="chart">📈</span> Real-time KPI Dashboard
                                </div>
                            </CardItem>
                            <div className="flex justify-between items-center mt-6">
                                <CardItem translateZ={20} as="button" className="px-4 py-2 rounded-xl text-xs font-normal text-cyan-400">
                                    View Analytics →
                                </CardItem>
                                <CardItem translateZ={20} as="button" className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold">
                                    Sign up
                                </CardItem>
                            </div>
                        </CardBody>
                    </CardContainer>
                </div>
            </div>
            
            {/* **AESTHETIC SEPARATOR 2** */}
            <div className="w-full h-[2px] bg-neutral-950 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-75 animate-pulse"></div>
            </div>
            
            {/* 🖼️ PARALLAX SCROLL SECTION 🖼️ */}
            <div className="w-full bg-neutral-950 flex flex-col items-center justify-center py-20">
                <h2 className="text-4xl font-bold text-white mb-12">Success Stories in Energy Transition</h2>
                <ParallaxScroll images={DUMMY_IMAGES} className="w-full" />
                
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
                                Accelerating the energy transition for Small and Medium Enterprises by simplifying grant discovery and access.
                            </p>
                        </div>

                        {/* Column 2: Quick Links */}
                        <div>
                            <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-neutral-400 hover:text-green-400 transition-colors duration-200 text-sm">Home</a></li>
                                <li><a href="#" className="text-neutral-400 hover:text-green-400 transition-colors duration-200 text-sm">Case Studies</a></li>
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
                        {/* Social Icons (unchanged) */}
                        <div className="flex space-x-4 mt-4 md:mt-0">
                            <a href="#" className="text-neutral-500 hover:text-green-400 transition-colors duration-200">
                                <span className="sr-only">Twitter</span>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.84.37-1.74.62-2.67.75.96-.58 1.7-1.5 2.04-2.63-.9.53-1.89.92-2.93 1.12-2.12-2.27-5.92-.1-5.92 3.1 0 .24 0 .47.07.69C8.02 9.09 4.3 7.02 1.8 3.86.3 6.32 1.04 8.28 2.76 9.39c-.77 0-1.49-.23-2.13-.59v.03c0 2.37 1.69 4.34 3.93 4.79-.41.11-.84.17-1.28.17-.31 0-.6-.03-.89-.08.62 1.95 2.42 3.36 4.56 3.4.15 0 .3 0 .44-.01-1.68 1.32-3.8 2.09-6.07 2.09-.39 0-.77 0-1.15-.05 2.17 1.4 4.75 2.22 7.55 2.22 9.05 0 14.01-7.5 14.01-14.01 0-.21 0-.41-.01-.61.96-.69 1.79-1.54 2.45-2.51z"></path></svg>
                            </a>
                            <a href="#" className="text-neutral-500 hover:text-green-400 transition-colors duration-200">
                                <span className="sr-only">LinkedIn</span>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zM8 19h-3v-11h3v11zM6.5 6.7c-.96 0-1.7-.75-1.7-1.7s.75-1.7 1.7-1.7 1.7.75 1.7 1.7-.75 1.7-1.7 1.7zM20 19h-3v-5.69c0-1.7-.6-2.85-2.2-2.85-1.2 0-1.9.8-2.2 1.5-.1.2-.1.5-.1.8v6.24h-3s.04-10.97 0-11h3v1.39c.57-.86 1.46-1.92 3.4-1.92 2.45 0 4.3 1.6 4.3 5v6.52z"></path></svg>
                            </a>
                        </div>
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