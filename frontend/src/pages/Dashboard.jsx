import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
    const [url, setUrl] = useState('');
    const [file, setFile] = useState(null); // New state for file
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const navigate = useNavigate();

    // --- Utility Function for Simulation ---
    const simulateBackendWorkflow = async (source) => {
        setLoading(true);
        setStatus(`Attempting to scrape and process content from: ${source}`);

        // 1. Simulate PDF Discovery
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatus('Found 5 PDF documents on the webpage(s).');

        // 2. Simulate PDF Parsing and Knowledge Graph Generation
        await new Promise(resolve => setTimeout(resolve, 2500));
        setStatus('PDFs parsed. Knowledge Graph nodes and edges successfully generated and updated in the backend.');

        // 3. Final Confirmation
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStatus('Knowledge Graph Update Complete! New grant data is now available for matching.');
        setLoading(false);
    };
    // ----------------------------------------

    const handleScrape = async (e) => {
        e.preventDefault();
        if (!url) {
            alert('Please enter a valid URL.');
            return;
        }

        setUrl(''); // Clear the URL input
        await simulateBackendWorkflow(url);
    };

    const handleFileScrape = async (e) => {
        e.preventDefault();
        if (!file) {
            alert('Please select a .txt file.');
            return;
        }

        // --- File Reading and Processing (Client-Side) ---
        const reader = new FileReader();
        reader.onload = async (event) => {
            const fileContent = event.target.result;
            const urls = fileContent.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            if (urls.length === 0) {
                alert("The file does not contain any URLs.");
                setFile(null); // Clear file state
                return;
            }

            // In a real application, you would send this 'urls' array to your backend.
            const sourceDescription = `${urls.length} URLs from uploaded file`;
            
            // Clear the file state before starting the simulation
            setFile(null); 
            await simulateBackendWorkflow(sourceDescription);
        };
        
        reader.onerror = () => {
            alert('Error reading file.');
            setFile(null);
        };
        
        reader.readAsText(file); // Start reading the file
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
                                disabled={loading || !!file} // Disable if loading or a file is selected
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
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">...</svg> 
                                    <span>Processing... (Generating KG)</span>
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
                                accept=".txt" // Only accept .txt files
                                onChange={(e) => {
                                    setFile(e.target.files[0] || null);
                                    setUrl(''); // Ensure URL field is cleared when file is selected
                                }}
                                className="w-full p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-red-500 focus:ring-red-500 transition duration-300"
                                disabled={loading || !!url} // Disable if loading or URL is entered
                            />
                            {file && (
                                <p className="mt-2 text-sm text-neutral-400">Selected file: **{file.name}**</p>
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
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">...</svg> 
                                    <span>Processing... (Generating KG)</span>
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
                        <div className={`mt-6 p-4 rounded-lg text-sm ${loading ? 'bg-blue-900/50 text-cyan-300' : 'bg-green-900/50 text-green-300'}`}>
                            **Current Status:** {status}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;