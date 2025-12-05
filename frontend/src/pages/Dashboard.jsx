import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
    const [url, setUrl] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const navigate = useNavigate();

    // Configuration - Ensure this matches your FastAPI port
    const API_BASE_URL = "http://localhost:8000";

    // --- Real Backend Interaction ---
    const triggerScrape = async (targetUrl) => {
        try {
            const response = await fetch(`${API_BASE_URL}/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: targetUrl }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to connect to backend');
            }

            const data = await response.json();
            return data; // Returns { status, message, files_queued }

        } catch (error) {
            console.error("Scrape Error:", error);
            throw error;
        }
    };

    const handleScrape = async (e) => {
        e.preventDefault();
        if (!url) {
            alert('Please enter a valid URL.');
            return;
        }

        setLoading(true);
        setStatus(`Sending request to backend for: ${url}...`);

        try {
            const data = await triggerScrape(url);
            
            if (data.status === 'success') {
                setStatus(`✅ Success: ${data.message} (${data.files_queued.length} PDFs queued)`);
            } else {
                setStatus(`⚠️ Warning: ${data.message}`);
            }
            
            setUrl(''); // Clear input on success
        } catch (error) {
            setStatus(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleFileScrape = async (e) => {
        e.preventDefault();
        if (!file) {
            alert('Please select a .txt file.');
            return;
        }

        setLoading(true);
        setStatus('Reading file...');

        const reader = new FileReader();
        
        reader.onload = async (event) => {
            const fileContent = event.target.result;
            // Split by newline and filter empty lines
            const urls = fileContent.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            if (urls.length === 0) {
                alert("The file does not contain any URLs.");
                setLoading(false);
                setFile(null);
                return;
            }

            setStatus(`Found ${urls.length} URLs. Starting batch processing...`);

            let successCount = 0;
            let failCount = 0;

            // Iterate through URLs and call API for each
            for (let i = 0; i < urls.length; i++) {
                const currentUrl = urls[i];
                setStatus(`Processing (${i + 1}/${urls.length}): ${currentUrl}`);

                try {
                    await triggerScrape(currentUrl);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to scrape ${currentUrl}`, error);
                    failCount++;
                }
            }

            setStatus(`🎉 Batch Complete! Successfully triggered ${successCount} jobs. Failed: ${failCount}. Check backend console for extraction progress.`);
            setLoading(false);
            setFile(null);
        };
        
        reader.onerror = () => {
            alert('Error reading file.');
            setLoading(false);
            setFile(null);
        };
        
        reader.readAsText(file);
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
                    This administrative page allows you to input a source URL or upload a file of URLs. Our backend AI will scrape the site(s), automatically discover and ingest PDFs, extract structured grant data, and update the **Grant Knowledge Graph** used for matching.
                </p>

                {/* Scrape Form Container */}
                <div className="bg-neutral-900 p-8 rounded-xl shadow-2xl border border-gray-800">
                    <h2 className="text-2xl font-bold text-white mb-6">Source Data Ingestion</h2>
                    
                    {/* --- 1. Single URL Scrape Form --- */}
                    <form onSubmit={handleScrape} className="space-y-6">
                        <div>
                            <label htmlFor="url-input" className="block text-sm font-medium text-neutral-300 mb-2">
                                Webpage URL to Scrape (e.g., Ministry of MSME Grant Portal)
                            </label>
                            <input
                                id="url-input"
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example-government-grants.in/scheme-details"
                                required
                                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-red-500 focus:ring-red-500 transition duration-300"
                                disabled={loading || !!file} 
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !!file}
                            className={`w-full py-3 rounded-lg text-lg font-bold transition duration-300 flex items-center justify-center space-x-2 ${
                                (loading || !!file) 
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-red-500/30'
                            }`}
                        >
                            {loading && !file ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Initiating Backend Pipeline...</span>
                                </>
                            ) : (
                                <>
                                    <span>Scrape Single URL & Generate Knowledge Graph</span>
                                    <span role="img" aria-label="database">⚙️</span>
                                </>
                            )}
                        </button>
                    </form>
                    
                    {/* --- Separator and File Upload --- */}
                    <div className="my-8 flex items-center">
                        <div className="flex-grow border-t border-gray-700"></div>
                        <span className="flex-shrink mx-4 text-neutral-400 font-medium">OR</span>
                        <div className="flex-grow border-t border-gray-700"></div>
                    </div>
                    
                    {/* --- 2. File Upload Scrape Form --- */}
                    <form onSubmit={handleFileScrape} className="space-y-6">
                        <div>
                            <label htmlFor="file-upload" className="block text-sm font-medium text-neutral-300 mb-2">
                                Upload a **.txt file** with one URL per line
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                accept=".txt"
                                onChange={(e) => {
                                    setFile(e.target.files[0] || null);
                                    setUrl(''); 
                                }}
                                className="w-full p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-red-500 focus:ring-red-500 transition duration-300"
                                disabled={loading || !!url} 
                            />
                            {file && (
                                <p className="mt-2 text-sm text-neutral-400">Selected file: <strong>{file.name}</strong></p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !file || !!url}
                            className={`w-full py-3 rounded-lg text-lg font-bold transition duration-300 flex items-center justify-center space-x-2 ${
                                (loading || !file || !!url)
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-red-500/30'
                            }`}
                        >
                            {loading && file ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Processing Batch...</span>
                                </>
                            ) : (
                                <>
                                    <span>Process URLs from File & Generate Knowledge Graph</span>
                                    <span role="img" aria-label="file">📄</span>
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