import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const DUMMY_GRANTS = [
    {
        id: 1,
        title: "Solar Rooftop Subsidy Scheme (Phase II)",
        status: "High Match",
        amount: "Up to ₹10 Lakhs",
        sector: "Manufacturing, Service",
        deadline: "31st Dec 2025",
    },
    {
        id: 2,
        title: "Energy Efficiency Modernization Fund",
        status: "Medium Match",
        amount: "Up to ₹50 Lakhs",
        sector: "Manufacturing",
        deadline: "30th Nov 2025",
    },
    {
        id: 3,
        title: "MSME Green Technology Adoption Grant",
        status: "High Match",
        amount: "Up to ₹25 Lakhs",
        sector: "Service, Trading",
        deadline: "15th Jan 2026",
    },
    {
        id: 4,
        title: "State Geothermal Project Incentive (Telangana)",
        status: "Low Match",
        amount: "Up to ₹5 Crores",
        sector: "Manufacturing",
        deadline: "Open",
    },
];

const GrantListPage = () => {
    // Get the data passed during navigation from the modal
    const location = useLocation();
    const navigate = useNavigate();
    const { formData } = location.state || { formData: {} };

    // Placeholder function for clicking a grant (simulates going to details page)
    const handleGrantClick = (grant) => {
        alert(`Navigating to details for: ${grant.title}`);
        // In a real app, you would navigate( /grants/${grant.id} )
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
                    <div className="grid grid-cols-2 gap-2 text-sm text-neutral-300">
                        {Object.entries(formData).map(([key, value]) => (
                            <p key={key} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                                <span className="font-medium text-neutral-400 italic">{key.replace(/_/g, ' ')}:</span>
                                <span className="font-bold text-green-400">{value}</span>
                            </p>
                        ))}
                        {Object.keys(formData).length === 0 && <p className="col-span-2 text-center text-neutral-500">No profile data received.</p>}
                    </div>
                </div>

                {/* Grants List */}
                <div className="space-y-6">
                    {DUMMY_GRANTS.map(grant => (
                        <div 
                            key={grant.id}
                            onClick={() => handleGrantClick(grant)}
                            className="bg-gray-800 p-6 rounded-xl border border-gray-700 transition duration-300 hover:bg-gray-700/70 hover:border-green-500 cursor-pointer shadow-lg flex justify-between items-center"
                        >
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-1">{grant.title}</h3>
                                <p className="text-neutral-400 text-sm">
                                    <span className="font-semibold text-green-400">{grant.amount}</span> - Sectors: {grant.sector}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${grant.status === 'High Match' ? 'bg-green-600 text-white' : grant.status === 'Medium Match' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'}`}>
                                    {grant.status}
                                </span>
                                <p className="text-sm text-neutral-300 mt-1">
                                    Deadline: <span className="font-medium">{grant.deadline}</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GrantListPage;