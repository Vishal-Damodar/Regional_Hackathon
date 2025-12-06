import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
    const [textInput, setTextInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const navigate = useNavigate();

    const API_BASE_URL = "http://localhost:8000";

    // --- Backend Interaction ---
    const triggerScrape = async (urlList) => {
        try {
            const response = await fetch(`${API_BASE_URL}/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // ✅ FIX: Sending 'urls' (plural) as a List, matching 'class ScrapeRequest(BaseModel): urls: List[str]'
                body: JSON.stringify({ urls: urlList }), 
            });

            if (!response.ok) {
                const errorData = await response.json();
                
                // Error handling to show exact validation message from backend
                let errorMessage = 'Failed to connect to backend';
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (typeof errorData.detail === 'object') {
                    errorMessage = JSON.stringify(errorData.detail);
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data; 

        } catch (error) {
            console.error("Scrape Error:", error);
            throw error;
        }
    };

    const handleManualScrape = async (e) => {
        e.preventDefault();
        
        // 1. Convert textarea content to Array of strings
        const urlsToScrape = textInput
            .split('\n')
            .map(u => u.trim())
            .filter(u => u.length > 0);

        if (urlsToScrape.length === 0) {
            alert('Please enter at least one valid URL.');
            return;
        }

        setLoading(true);
        setStatus(`Sending batch request for ${urlsToScrape.length} URL(s)...`);

        try {
            // 2. Send the whole list in one request
            const data = await triggerScrape(urlsToScrape);
            
            if (data.status === 'success') {
                setStatus(`✅ Success: ${data.message}`);
                setTextInput(''); // Clear input on success
            } else {
                setStatus(`⚠️ Warning: ${data.message}`);
            }
        } catch (error) {
            setStatus(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8 pt-20">
            <div className="max-w-4xl mx-auto">
                <button 
                    onClick={() => navigate('/')} 
                    className="mb-6 px-4 py-2 text-sm text-cyan-400 border border-cyan-400 rounded-full hover:bg-cyan-900/50 transition"
                >
                    &larr; Back to Home
                </button>

                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-8">
                    Knowledge Graph Management Dashboard
                </h1>

                <p className="text-neutral-400 mb-10">
                    Input source URLs (one per line). Our backend AI will scrape the sites, automatically ingest PDFs, and update the **Grant Knowledge Graph**.
                </p>

                {/* Scrape Form Container */}
                <div className="bg-neutral-900 p-8 rounded-xl shadow-2xl border border-gray-800">
                    <h2 className="text-2xl font-bold text-white mb-6">Source Data Ingestion</h2>
                    
                    <form onSubmit={handleManualScrape} className="space-y-6">
                        <div>
                            <label htmlFor="url-input" className="block text-sm font-medium text-neutral-300 mb-2">
                                Webpage URLs to Scrape (One per line)
                            </label>
                            <textarea
                                id="url-input"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="https://site1.com/grants&#10;https://site2.com/schemes"
                                required
                                rows={6}
                                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-red-500 focus:ring-red-500 transition duration-300 font-mono text-sm"
                                disabled={loading} 
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-lg text-lg font-bold transition duration-300 flex items-center justify-center space-x-2 ${
                                loading 
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-red-500/30'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Processing Batch...</span>
                                </>
                            ) : (
                                <>
                                    <span>Start Scraping Pipeline</span>
                                    <span role="img" aria-label="database">⚙️</span>
                                </>
                            )}
                        </button>
                    </form>
                    
                    {/* Status Log */}
                    {status && (
                        <div className={`mt-6 p-4 rounded-lg text-sm border ${
                            status.includes('Error') || status.includes('Failed') 
                                ? 'bg-red-900/50 text-red-200 border-red-800' 
                                : status.includes('Warning') 
                                    ? 'bg-yellow-900/50 text-yellow-200 border-yellow-800'
                                    : 'bg-green-900/50 text-green-300 border-green-800'
                        }`}>
                            <strong>Status:</strong> {status}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;