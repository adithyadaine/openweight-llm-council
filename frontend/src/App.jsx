import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    MessageSquare,
    Send,
    Award,
    Users,
    Cpu,
    Trash2,
    Menu,
    X
} from 'lucide-react';
import './index.css';

const API_BASE = 'http://localhost:8000/api';

function App() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('final'); // 'final', 'stage1', 'stage2'
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState('all');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch(`${API_BASE}/conversations`);
            const json = await res.json();
            setHistory(json);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    const loadConversation = async (id) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/conversations/${id}`);
            const json = await res.json();
            setData(json);
            setActiveTab('final');
            setSelectedModel('all');
            setLoading(false);
            setSidebarOpen(false); // Close mobile sidebar automatically
        } catch (err) {
            console.error('Failed to load conversation:', err);
            setLoading(false);
        }
    };

    const deleteConversation = async (e, id) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this conversation?')) return;

        try {
            await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
            setHistory(prev => prev.filter(h => h.id !== id));
            if (data?.conversation_id === id) {
                setData(null);
            }
        } catch (err) {
            console.error('Failed to delete conversation:', err);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setData(null);

        try {
            const res = await fetch(`${API_BASE}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const json = await res.json();
            setData(json);
            setActiveTab('final');
            setSelectedModel('all');
            setQuery('');
            fetchHistory();
        } catch (err) {
            console.error('Failed to submit query:', err);
            alert('Error submitting query. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Filter helper
    const getFilteredModels = (modelsDict) => {
        if (selectedModel === 'all') return Object.entries(modelsDict);
        return Object.entries(modelsDict).filter(([key]) => key === selectedModel);
    };

    return (
        <div className="app-layout">
            {/* Floating Sidebar */}
            {!sidebarOpen && (
                <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)}>
                    <Menu size={24} />
                </button>
            )}

            <div className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Professional Quorum Logo: Abstract Hex-Q */}
                        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="logo-gradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#3b82f6" />
                                    <stop offset="1" stopColor="#06b6d4" />
                                </linearGradient>
                            </defs>
                            {/* Outer Hexagon */}
                            <path d="M16 2 L28.12 9 V23 L16 30 L3.88 23 V9 L16 2Z" stroke="url(#logo-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {/* Inner Core */}
                            <circle cx="16" cy="16" r="5" fill="var(--accent-primary)" />
                            {/* Tech accents */}
                            <path d="M16 2 V6 M28.12 9 L24.66 11 M28.12 23 L24.66 21 M16 30 V26 M3.88 23 L7.34 21 M3.88 9 L7.34 11" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeOpacity="0.5" />
                        </svg>
                        <h2 className="sidebar-title" style={{ lineHeight: '1', paddingBottom: '2px' }}>Quorum</h2>
                    </div>
                    <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setSidebarOpen(false)}>
                        <X size={20} />
                    </button>
                </div>
                <div className="sidebar-content">
                    {history.length === 0 && (
                        <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem', fontSize: '0.9rem' }}>
                            No history found
                        </div>
                    )}
                    {history.map((item) => (
                        <div key={item.id} className={`sidebar-item ${data?.conversation_id === item.id ? 'active' : ''}`} onClick={() => loadConversation(item.id)}>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <MessageSquare size={14} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.query}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '22px' }}>
                                    {new Date(item.timestamp).toLocaleDateString()}
                                </div>
                            </div>
                            <button
                                className="delete-btn"
                                onClick={(e) => deleteConversation(e, item.id)}
                                title="Delete conversation"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Stage */}
            <div className="main-stage" style={{ marginLeft: sidebarOpen ? '320px' : '0' }}>

                {loading ? (
                    <div className="loading-indicator">
                        <div className="spinner"></div>
                        <p>Quorum is in session...</p>
                        <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>
                            Synthesizing council perspectives
                        </div>
                    </div>
                ) : !data ? (
                    <div className="empty-state">
                        <div style={{
                            width: '80px', height: '80px', margin: '0 auto 1.5rem',
                            background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.1), rgba(0, 212, 255, 0.1))',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: '0 0 40px rgba(124, 92, 255, 0.1)'
                        }}>
                            <svg width="44" height="44" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="logo-gradient-lg" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#3b82f6" />
                                        <stop offset="1" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                                <path d="M16 2 L28.12 9 V23 L16 30 L3.88 23 V9 L16 2Z" stroke="url(#logo-gradient-lg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="16" cy="16" r="5" fill="var(--accent-primary)" />
                                <path d="M16 2 V6 M28.12 9 L24.66 11 M28.12 23 L24.66 21 M16 30 V26 M3.88 23 L7.34 21 M3.88 9 L7.34 11" stroke="url(#logo-gradient-lg)" strokeWidth="1" strokeOpacity="0.5" />
                            </svg>
                        </div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '1rem' }}>Welcome to Quorum</h2>
                        <p style={{ maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                            Submit a query to convene the council. Quorum synthesizes insights from multiple AI models to reach a definitive consensus.
                        </p>
                    </div>
                ) : (
                    <div className="stage-content">
                        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', lineHeight: '1.2' }}>
                            <span style={{ opacity: 0.5, fontSize: '1rem', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Topic of Discussion
                            </span>
                            {data.query}
                        </h1>

                        <div className="tab-group">
                            <button
                                className={`tab ${activeTab === 'final' ? 'active' : ''}`}
                                onClick={() => setActiveTab('final')}
                            >
                                <Award size={16} />
                                Consensus
                            </button>
                            <button
                                className={`tab ${activeTab === 'stage1' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('stage1'); setSelectedModel('all'); }}
                            >
                                <MessageSquare size={16} />
                                Perspectives
                                <span className="tab-badge">{Object.keys(data.stage1_responses || {}).length}</span>
                            </button>
                            <button
                                className={`tab ${activeTab === 'stage2' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('stage2'); setSelectedModel('all'); }}
                            >
                                <Users size={16} />
                                Peer Reviews
                                <span className="tab-badge">{Object.keys(data.stage2_reviews || {}).length}</span>
                            </button>
                        </div>

                        {/* Model Filter Tabs (only for stages) */}
                        {activeTab !== 'final' && (
                            <div className="nav-chips">
                                <button
                                    className={`nav-chip ${selectedModel === 'all' ? 'active' : ''}`}
                                    onClick={() => setSelectedModel('all')}
                                >
                                    All Models
                                </button>
                                {Object.keys(activeTab === 'stage1' ? data.stage1_responses : data.stage2_reviews).map(model => (
                                    <button
                                        key={model}
                                        className={`nav-chip ${selectedModel === model ? 'active' : ''}`}
                                        onClick={() => setSelectedModel(model)}
                                    >
                                        {model}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="response-container">
                            {activeTab === 'final' && (
                                <div className="card chairman-glow">
                                    <div className="card-header">
                                        <div className="model-name">
                                            <Award size={20} color="var(--accent-primary)" />
                                            The Chairman
                                            <span className="model-tag">Consensus</span>
                                        </div>
                                    </div>
                                    <div className="prose">
                                        <ReactMarkdown>{data.stage3_final_response}</ReactMarkdown>
                                        {data.stage3_most_valuable_models && (
                                            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
                                                    <Award size={16} color="#fbbf24" />
                                                    Most Valuable Contribution
                                                </h4>
                                                <ReactMarkdown>{data.stage3_most_valuable_models}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'stage1' && getFilteredModels(data.stage1_responses).map(([model, resp]) => (
                                <div key={model} className="card">
                                    <div className="card-header">
                                        <div className="model-name">
                                            <Cpu size={18} />
                                            {model}
                                        </div>
                                    </div>
                                    <div className="prose">
                                        <ReactMarkdown>{resp}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}

                            {activeTab === 'stage2' && getFilteredModels(data.stage2_reviews).map(([model, review]) => (
                                <div key={model} className="card">
                                    <div className="card-header">
                                        <div className="model-name">
                                            <Users size={18} />
                                            {model}
                                            <span style={{ fontSize: '0.8rem', opacity: 0.6, marginLeft: '0.5rem' }}>reviewing peers</span>
                                        </div>
                                    </div>
                                    <div className="prose">
                                        <ReactMarkdown>{review.review_text || review.raw}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="input-area">
                    <div className="input-container">
                        <textarea
                            className="query-input"
                            placeholder="Ask Prism..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        <button
                            className="send-btn"
                            onClick={() => handleSubmit()}
                            disabled={loading || !query.trim()}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default App;
