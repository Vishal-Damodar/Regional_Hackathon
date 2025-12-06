import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GrantDetailModal from './GrantDetailModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Use a fallback in case API fails or returns empty to keep UI functional
const DUMMY_GRANTS = [
    {
        id: "dummy_1",
        title: "Example: Solar Rooftop Subsidy (Demo Data)",
        match_score: 15,
        max_value: "Up to ₹10 Lakhs",
        target_verticals: ["Manufacturing", "Service"],
        description: "This is a placeholder. Please ensure the backend is running to see real AI matches.",
        eligibility_criteria: [{ description: "Must be MSME", type: "Must-Have 1" }],
        filename: "example.pdf"
    }
];

const GrantListPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Extract real data from navigation state passed from HomePage
    const { formData, grants, checklist } = location.state || {};
    
    // If we have API grants, use them, otherwise use fallback
    const displayGrants = (grants && grants.length > 0) ? grants : DUMMY_GRANTS;

    const [selectedGrant, setSelectedGrant] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Helper to determine status color based on Match Score from Backend
    const getMatchStatus = (score) => {
        if (score >= 15) return { label: "High Match", color: "bg-green-600" };
        if (score >= 10) return { label: "Medium Match", color: "bg-yellow-600" };
        return { label: "Low Match", color: "bg-red-600" };
    };

    const handleGrantClick = (grant) => {
        setSelectedGrant(grant);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedGrant(null);
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8 pt-20">
            <div className="max-w-6xl mx-auto">
                <button 
                    onClick={() => navigate('/')} 
                    className="mb-6 px-4 py-2 text-sm text-cyan-400 border border-cyan-400 rounded-full hover:bg-cyan-900/50 transition"
                >
                    &larr; Back to Home
                </button>

                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-8">
                    🔍 Eligible Grant Matches
                </h1>
                
                {/* User's Filter Data Summary */}
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl mb-10 border border-cyan-700/50">
                    <h2 className="text-lg font-semibold text-white mb-2">Your Profile Filters:</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-neutral-300">
                        {formData ? Object.entries(formData).map(([key, value]) => (
                            <p key={key} className="flex flex-col bg-gray-700/50 p-2 rounded">
                                <span className="font-medium text-neutral-400 italic text-xs uppercase">{key.replace(/_/g, ' ')}</span>
                                <span className="font-bold text-green-400 truncate">{value.toString()}</span>
                            </p>
                        )) : <p>No filter data provided.</p>}
                    </div>
                </div>
 
                {/* AI Checklist Suggestion (If available from backend) */}
                {/* {checklist && (
    <div className="bg-neutral-900 border-l-4 border-purple-500 p-6 rounded-r-lg mb-8 shadow-lg">
        <h3 className="text-xl font-bold text-white mb-2">🤖 AI Application Strategy</h3> */}
        
        {/* 1. 'prose' and 'prose-invert' automatically style h1, p, ul, li tags 
           2. Removed 'whitespace-pre-line' as the Markdown parser handles spacing 
        */}
        {/* <div className="prose prose-invert prose-sm text-neutral-300 max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {checklist}
            </ReactMarkdown>
        </div>
    </div> */}
 

                {/* Grants List */}
                <div className="space-y-6">
                    {displayGrants.map(grant => {
                        // Safe extraction of fields from backend response
                        const statusObj = getMatchStatus(grant.match_score || 0);
                        const sectors = Array.isArray(grant.target_verticals) ? grant.target_verticals.join(", ") : grant.target_verticals;
                        
                        return (
                            <div 
                                key={grant.id}
                                onClick={() => handleGrantClick(grant)}
                                className="bg-gray-800 p-6 rounded-xl border border-gray-700 transition duration-300 hover:bg-gray-700/70 hover:border-green-500 cursor-pointer shadow-lg flex flex-col md:flex-row justify-between md:items-center gap-4"
                            >
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-white mb-2">{grant.title}</h3>
                                    <p className="text-neutral-400 text-sm mb-2">
                                        <span className="font-semibold text-green-400 text-lg mr-2">{grant.max_value || "Amount Varies"}</span> 
                                        <span className="text-neutral-500">|</span> 
                                        <span className="ml-2 text-cyan-200">Focus: {sectors || "General"}</span>
                                    </p>
                                    <p className="text-neutral-500 text-sm line-clamp-2">{grant.description}</p>
                                </div>
                                <div className="text-left md:text-right min-w-[150px]">
                                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${statusObj.color} text-white`}>
                                        {statusObj.label} ({grant.match_score?.toFixed(1) || 0})
                                    </span>
                                    <p className="text-xs text-neutral-500 mt-2">
                                        Source: {grant.filename}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* The Modal Component - Pass specific backend fields */}
            {isModalOpen && selectedGrant && (
                <GrantDetailModal 
                    grant={selectedGrant} 
                    onClose={handleCloseModal} 
                />
            )}
        </div>
    );
};

export default GrantListPage;