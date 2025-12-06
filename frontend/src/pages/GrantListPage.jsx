import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GrantDetailModal from './GrantDetailModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Dummy data for fallback
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
    
    // Extract data
    const { formData, grants, checklist } = location.state || {};
    const displayGrants = (grants && grants.length > 0) ? grants : DUMMY_GRANTS;

    const [selectedGrant, setSelectedGrant] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Color logic for match scores
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

    const handleCopyStrategy = () => {
        if (checklist) {
            navigator.clipboard.writeText(checklist);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // --- STRICT STYLING FOR MARKDOWN ---
    const MarkdownComponents = {
        // Headers (h1, h2, h3): Force Yellow (#FACC15)
        h1: ({node, ...props}) => <div className="text-yellow-400 font-bold text-xl mt-6 mb-2" {...props} />,
        h2: ({node, ...props}) => <div className="text-yellow-400 font-bold text-lg mt-5 mb-2" {...props} />,
        h3: ({node, ...props}) => <div className="text-yellow-400 font-bold text-md mt-4 mb-1" {...props} />,
        
        // Bold Text: Force Yellow
        strong: ({node, ...props}) => <span className="text-yellow-400 font-bold" {...props} />,
        
        // Lists: Force Cyan bullets
        ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2 mb-4 text-cyan-400 marker:text-cyan-400" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-2 mb-4 text-yellow-400 marker:text-yellow-400" {...props} />,
        
        // List Items: Text is White/Gray
        li: ({node, ...props}) => <li className="text-gray-200 pl-1" {...props} />,

        // Paragraphs: Light Gray
        p: ({node, ...props}) => <p className="text-gray-300 mb-3 leading-relaxed text-sm" {...props} />,
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 pt-10 font-sans selection:bg-purple-500 selection:text-white">
            <div className="max-w-7xl mx-auto">
                
                {/* NAVIGATION BUTTON */}
                <div className="mb-8">
                    <button 
                        onClick={() => navigate('/')} 
                        className="flex items-center gap-2 px-6 py-2 rounded-full border border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/30 transition-colors text-sm font-medium"
                    >
                        <span>&larr;</span> Back to Home
                    </button>
                </div>

                {/* TITLE HEADER */}
                <div className="flex items-center gap-3 mb-10">
                    <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-cyan-400 tracking-tight">
                        Eligible Grant Matches
                    </h1>
                </div>
                
                {/* FILTERS SECTION (Slate Blue BG) */}
                <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 p-6 mb-8 shadow-xl">
                    <h2 className="text-white font-semibold text-lg mb-4">Your Profile Filters:</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {formData ? Object.entries(formData).map(([key, value]) => (
                            <div key={key} className="bg-[#0f172a] p-4 rounded-lg border border-slate-700">
                                <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                                    {key.replace(/_/g, ' ')}
                                </span>
                                <span className="block text-green-400 font-bold text-lg truncate">
                                    {value.toString()}
                                </span>
                            </div>
                        )) : <p className="text-gray-400">No filters applied.</p>}
                    </div>
                </div>

                {/* GRANTS LIST (Slate Blue BG Cards) */}
                <div className="space-y-4 mb-12">
                    {displayGrants.map(grant => {
                        const statusObj = getMatchStatus(grant.match_score || 0);
                        return (
                            <div 
                                key={grant.id}
                                onClick={() => handleGrantClick(grant)}
                                className="group relative bg-[#1e293b] p-6 rounded-xl border border-slate-700 hover:border-cyan-500 transition-all duration-200 cursor-pointer shadow-lg"
                            >
                                <div className="flex flex-col md:flex-row gap-4 justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                                            {grant.title}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm mb-3">
                                            <span className="text-green-400 font-bold">{grant.max_value || "Amount Varies"}</span>
                                            <span className="text-slate-600">|</span>
                                            <span className="text-slate-300">{grant.target_verticals?.toString() || "General"}</span>
                                        </div>
                                        <p className="text-slate-400 text-sm line-clamp-2">{grant.description}</p>
                                    </div>
                                    <div className="flex flex-col items-end min-w-[140px]">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${statusObj.color}`}>
                                            {statusObj.label} ({grant.match_score})
                                        </span>
                                        <span className="text-xs text-slate-500 mt-auto pt-4">Source: {grant.filename}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* AI STRATEGY SECTION (UPDATED: Matches Slate Blue BG) */}
                {checklist && (
                    <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 shadow-xl mt-12 overflow-hidden">
                        {/* Header of Strategy Card */}
                        <div className="p-6 flex justify-between items-center border-b border-slate-700/50">
                            <div className="flex items-center gap-4">
                                <div className="bg-cyan-900/50 p-2 rounded-lg text-cyan-400 border border-cyan-500/30">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white">AI Application Strategy</h3>
                                    <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Tailored Roadmap</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleCopyStrategy}
                                className="px-4 py-2 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded text-xs text-gray-300 transition"
                            >
                                {copied ? "Copied!" : "Copy Strategy"}
                            </button>
                        </div>
                        
                        {/* Body of Strategy Card */}
                        <div className="p-8">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={MarkdownComponents}
                            >
                                {checklist}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Modal */}
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