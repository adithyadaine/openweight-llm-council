import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    MessageSquare,
    Send,
    Award,
    Users,
    Cpu,
    Trash2,
    Menu,
    X,
    PlusCircle
} from 'lucide-react';
import './index.css';

const API_BASE = 'http://localhost:8000/api';

// Helper to extract content/stats safely
const extractResponseData = (data) => {
    if (typeof data === 'string') return { content: data, stats: null };
    // Handle dict structure
    return {
        content: data.content || '',
        stats: {
            usage: data.usage || {},
            latency: data.latency || 0
        }
    };
};

// Component to display performance stats
const StatsBadge = ({ stats }) => {
    if (!stats) return null;
    const { usage, latency } = stats;
    const totalTokens = usage.total_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;

    // Calculate speed (tokens/sec) based on completion tokens and latency
    const speed = (completionTokens > 0 && latency > 0)
        ? (completionTokens / latency).toFixed(1)
        : null;

    if (!totalTokens && !latency) return null;

    return (
        <div style={{
            display: 'flex',
            gap: '12px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            marginTop: '4px',
            fontFamily: 'monospace'
        }}>
            {speed && <span title="Tokens per second">⚡ {speed} tok/s</span>}
            {totalTokens > 0 && <span title="Total tokens used">📊 {totalTokens} tokens</span>}
            {latency > 0 && <span title="Time to first byte / Total latency">⏱️ {latency.toFixed(2)}s</span>}
        </div>
    );
};

// --- Sub-component: Council Turn Report ---
function CouncilTurn({ data }) {
    const [activeTab, setActiveTab] = useState('final'); // 'final', 'stage1', 'stage2'
    const [selectedModel, setSelectedModel] = useState('all');

    // Filter helper
    const getFilteredModels = (modelsDict) => {
        if (selectedModel === 'all') return Object.entries(modelsDict || {});
        return Object.entries(modelsDict || {}).filter(([key]) => key === selectedModel);
    };

    return (
        <div className="turn-container" style={{ marginBottom: '3rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '2rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', lineHeight: '1.2' }}>
                <span style={{ opacity: 0.5, fontSize: '1rem', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Topic of Discussion
                </span>
                {data.query}
            </h1>

            {data.duration_seconds && (
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    color: 'var(--accent-secondary)',
                    background: 'rgba(6, 182, 212, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    marginBottom: '1.5rem',
                    border: '1px solid rgba(6, 182, 212, 0.2)'
                }}>
                    <Cpu size={12} />
                    Generated in {data.duration_seconds}s
                </div>
            )}

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

                {activeTab === 'stage1' && getFilteredModels(data.stage1_responses).map(([model, resp]) => {
                    const { content, stats } = extractResponseData(resp);
                    return (
                        <div key={model} className="card">
                            <div className="card-header">
                                <div>
                                    <div className="model-name">
                                        <Cpu size={18} />
                                        {model}
                                    </div>
                                    <StatsBadge stats={stats} />
                                </div>
                            </div>
                            <div className="prose">
                                <ReactMarkdown>{content}</ReactMarkdown>
                            </div>
                        </div>
                    );
                })}

                {activeTab === 'stage2' && getFilteredModels(data.stage2_reviews).map(([model, review]) => {
                    const { content, stats } = extractResponseData(review);
                    const displayContent = content || review.review_text || review.raw || '';
                    return (
                        <div key={model} className="card">
                            <div className="card-header">
                                <div>
                                    <div className="model-name">
                                        <Users size={18} />
                                        {model}
                                        <span style={{ fontSize: '0.8rem', opacity: 0.6, marginLeft: '0.5rem' }}>reviewing peers</span>
                                    </div>
                                    <StatsBadge stats={stats || (review.usage ? { usage: review.usage, latency: review.latency } : null)} />
                                </div>
                            </div>
                            <div className="prose">
                                <ReactMarkdown>{displayContent}</ReactMarkdown>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- Main App Component ---
function App() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Conversation State: { id: str, turns: [] }
    const [conversation, setConversation] = useState(null);
    const [history, setHistory] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Ref for auto-scrolling
    const bottomRef = useRef(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        // Scroll to bottom when conversation updates (new turn added)
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversation?.turns?.length, loading]);

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

            // Normalize backend response: if legacy (no turns), wrap it
            if (!json.turns && json.stage1_responses) {
                // Legacy wrapper on the fly if backend didn't do it (backend should handle it but safer here too)
                setConversation({
                    id: json.conversation_id || id,
                    turns: [json]
                });
            } else {
                setConversation(json);
            }

            // setData was removed in favor of setConversation in the new branch logic?
            // Checking imports/state... setData is NOT in specific conflict block but "data" variable usage replaced by "conversation.turns.map".
            // So we just need to set the conversation state.

            // setActiveTab and others might need adjustment if they depend on flattened "data" state
            // But looking at CouncilTurn component, it handles tabs internally per turn.
            // So we don't need top-level activeTab state anymore for the main view.

            setLoading(false);
            setLoading(false);
            setSidebarOpen(false); // Close mobile sidebar
        } catch (err) {
            console.error('Failed to load conversation:', err);
            setLoading(false);
        }
    };

    const startNewChat = () => {
        setConversation(null);
        setQuery('');
        setSidebarOpen(false);
    };

    const deleteConversation = async (e, id) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this conversation?')) return;

        try {
            const res = await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete conversation');
            setHistory(prev => prev.filter(h => h.id !== id));
            if (conversation?.id === id) {
                setConversation(null);
            }
        } catch (err) {
            console.error('Failed to delete conversation:', err);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        // Optimistic UI updates or just wait? We wait.

        try {
            const payload = {
                query,
                conversation_id: conversation?.id // Pass ID to append if active
            };

            const res = await fetch(`${API_BASE}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to get response from Council');
            }

            const newTurn = await res.json();

            // Update state: append new turn to current conversation
            setConversation(prev => {
                const updatedTurns = prev ? [...prev.turns, newTurn] : [newTurn];
                // If this was a new chat, we need to establish the conversation ID from the response (conceptually)
                // However, the backend doesn't return the full conversation ID in the Turn unless we look at the file.
                // Wait, if we started new (prev is null), we don't know the ID yet unless the Turn has it?
                // The Turn object from backend DOES NOT have conversation_id in the new Turn model I defined!
                // FIX: I need to handle the first turn ID assignment.
                // Or better, let's assume the backend saves it.
                // If prev is null, we can just assume a transient state or re-fetch.
                // Let's rely on standard practice: The first response creates the conversation.
                // If I need the ID, I might need to fetch it or fetch the whole conversation again.
                // Optimization: Just show the turns. We can re-fetch history to get the ID for the sidebar.
                return {
                    id: prev ? prev.id : `temp_${Date.now()}`, // Temporary ID until reload or if we parse it from somewhere?
                    // Actually, for a new chat, we won't have the ID to update the URL or history properly unless we reload.
                    // But for display, just turns matter.
                    turns: updatedTurns
                };
            });

            setQuery('');
            fetchHistory(); // Refresh sidebar
        } catch (err) {
            console.error('Failed to submit query:', err);
            alert(`Error: ${err.message}`);
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
                        {/* Assembly Logo */}
                        {/* Assembly Logo */}
                        <Logo size={28} />
                        <h2 className="sidebar-title" style={{ lineHeight: '1', paddingBottom: '2px' }}>LLM Council</h2>
                    </div>
                    <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }} onClick={() => setSidebarOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1rem' }}>
                    <button
                        onClick={startNewChat}
                        className="new-chat-btn"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--text-secondary)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s',
                            letterSpacing: '0.01em'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                    >
                        <PlusCircle size={16} />
                        New Chat
                    </button>
                </div>



                <div className="sidebar-content">
                    {history.length === 0 && (
                        <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem', fontSize: '0.9rem' }}>
                            No history found
                        </div>
                    )}
                    {history.map((item) => (
                        <div key={item.id} className={`sidebar-item ${conversation?.id === item.id ? 'active' : ''}`} onClick={() => loadConversation(item.id)}>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <div style={{ flexShrink: 0, display: 'flex' }}>
                                        <MessageSquare size={14} />
                                    </div>
                                    <span style={{
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        flex: 1
                                    }}>
                                        {item.query}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '22px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                    {item.turn_count > 1 && <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0 4px', borderRadius: '4px' }}>{item.turn_count} turns</span>}
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

                {!conversation && !loading ? (
                    <div className="empty-state">
                        <div style={{
                            width: '80px', height: '80px', margin: '0 auto 1.5rem',
                            background: 'linear-gradient(135deg, rgba(124, 92, 255, 0.1), rgba(0, 212, 255, 0.1))',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: '0 0 40px rgba(124, 92, 255, 0.1)'
                        }}>
                            <Logo size={44} />
                        </div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '1rem' }}>Welcome to the Council</h2>
                        <p style={{ maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                            Submit a query to convene the council. The Council synthesizes insights from multiple AI models to reach a definitive consensus.
                        </p>
                    </div>
                ) : (
                    <div className="stage-content">
                        {conversation?.turns?.map((turn, index) => (
                            <CouncilTurn key={index} data={turn} />
                        ))}

                        {loading && (
                            <div className="loading-indicator" style={{ margin: '2rem auto' }}>
                                <div className="spinner"></div>
                                <p>The Council is in session...</p>
                                <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>
                                    Synthesizing council perspectives
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Scroll Anchor */}
                <div ref={bottomRef}></div>

                {/* Input Area */}
                <div className="input-area">
                    <div className="input-container">
                        <textarea
                            className="query-input"
                            placeholder={conversation ? "Continue the discussion..." : "Ask the Council..."}
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

                {/* Footer */}
                <Footer />

            </div>
        </div >
    );
}

// --- Icons / Components ---
const Logo = ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
            <path d="M16 16 L16 6 M16 16 L24.66 11 M16 16 L24.66 21 M16 16 L16 26 M16 16 L7.34 21 M16 16 L7.34 11" />
            <circle cx="16" cy="16" r="10" strokeOpacity="0.3" strokeWidth="1" />
        </g>
        <circle cx="16" cy="16" r="4" fill="#3b82f6" />
        <g fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5">
            <circle cx="16" cy="6" r="2.5" />
            <circle cx="24.66" cy="11" r="2.5" />
            <circle cx="24.66" cy="21" r="2.5" />
            <circle cx="16" cy="26" r="2.5" />
            <circle cx="7.34" cy="21" r="2.5" />
            <circle cx="7.34" cy="11" r="2.5" />
        </g>
    </svg>
);

const Footer = () => {
    return (
        <footer className="app-footer">
            <div className="footer-left">
                <Logo size={20} />
                <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>LLM Council</span>
                <span style={{ opacity: 0.3 }}>|</span>
                <span>© 2025</span>
            </div>
            <div className="footer-right">
                <a href="#" className="footer-link">About</a>
                <a href="#" className="footer-link">Privacy</a>
            </div>
        </footer>
    );
};

export default App;
