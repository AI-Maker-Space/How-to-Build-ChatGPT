import { useState, useEffect } from 'react';

// Deep Research Component with status tracking and clarifications
export function DeepResearchPanel({ 
  onStartResearch, 
  apiKey, 
  currentQuery,
  onClarificationAnswer,
  onResearchComplete  // Add callback for when research completes
}) {
  const [showDeepResearch, setShowDeepResearch] = useState(false);
  const [researchMode, setResearchMode] = useState('quick'); // quick, deep
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [useCodeInterpreter, setUseCodeInterpreter] = useState(false);
  const [clarifyFirst, setClarifyFirst] = useState(false);
  const [enrichPrompt, setEnrichPrompt] = useState(true);
  const [activeResearchId, setActiveResearchId] = useState(null);
  const [researchStatus, setResearchStatus] = useState(null);
  const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const [clarificationAnswers, setClarificationAnswers] = useState({});

  // Poll for research status
  useEffect(() => {
    if (!activeResearchId || !apiKey) return;

    const checkStatus = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        const response = await fetch(
          `${base}/api/deep-research/${activeResearchId}/status?api_key=${encodeURIComponent(apiKey)}`
        );
        
        if (response.ok) {
          const status = await response.json();
          setResearchStatus(status);
          
          if (status.status === 'completed' || status.status === 'failed' || status.status === 'not_found') {
            setActiveResearchId(null); // Stop polling
            if (status.status === 'not_found') {
              console.log('Research task not found - may have expired due to server restart');
            } else if (status.status === 'completed' && status.output_text) {
              // Notify parent component that research is complete
              if (onResearchComplete) {
                onResearchComplete({
                  id: activeResearchId,
                  query: status.query,
                  output_text: status.output_text,
                  sources: status.sources || [],
                  duration: status.duration_seconds
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking research status:', error);
      }
    };

    const interval = setInterval(checkStatus, 5000); // Poll every 5 seconds
    checkStatus(); // Initial check

    return () => clearInterval(interval);
  }, [activeResearchId, apiKey]);

  const handleStartResearch = async () => {
    if (!currentQuery || !apiKey) return;

    const researchConfig = {
      query: currentQuery,
      api_key: apiKey,
      model: researchMode === 'deep' ? 'o3-deep-research' : 'o4-mini-deep-research',
      use_web_search: useWebSearch,
      use_code_interpreter: useCodeInterpreter,
      clarify_first: clarifyFirst,
      enrich_prompt: enrichPrompt,
      background: true
    };

    const result = await onStartResearch(researchConfig);
    
    if (result.id) {
      setActiveResearchId(result.id);
      setResearchStatus(result);
      
      if (result.clarification_questions) {
        setClarificationQuestions(result.clarification_questions);
      }
    }
  };

  const handleClarificationSubmit = () => {
    // Send clarification answers and restart research
    const answersText = Object.values(clarificationAnswers).join('\n');
    onClarificationAnswer(answersText);
    setClarificationQuestions([]);
    setClarificationAnswers({});
  };

  return (
    <>
      {/* Deep Research Toggle Button */}
      <button
        onClick={() => setShowDeepResearch(!showDeepResearch)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0.75rem',
          background: showDeepResearch ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
          color: showDeepResearch ? 'white' : '#8e8ea0',
          border: '1px solid',
          borderColor: showDeepResearch ? 'transparent' : 'rgba(255,255,255,0.2)',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
          transition: 'all 0.3s'
        }}
        onMouseOver={(e) => {
          if (!showDeepResearch) {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.color = '#ececf1';
          }
        }}
        onMouseOut={(e) => {
          if (!showDeepResearch) {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.color = '#8e8ea0';
          }
        }}
      >
        🧪 Deep Research
        {activeResearchId && (
          <span style={{
            width: '8px',
            height: '8px',
            background: '#10a37f',
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }} />
        )}
      </button>

      {/* Deep Research Panel */}
      {showDeepResearch && (
        <div style={{
          position: 'fixed',
          top: '60px',
          right: '1rem',
          width: '320px',
          background: '#2a2b32',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '0.75rem',
          padding: '1rem',
          zIndex: 40,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
        }}>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: 600, 
            marginBottom: '1rem',
            color: '#ececf1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            Deep Research Settings
            <button
              onClick={() => setShowDeepResearch(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8e8ea0',
                cursor: 'pointer',
                fontSize: '1.25rem'
              }}
            >
              ×
            </button>
          </h3>

          {/* Research Mode */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#c5c5d2', display: 'block', marginBottom: '0.5rem' }}>
              Research Mode
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setResearchMode('quick')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: researchMode === 'quick' ? '#10a37f' : '#40414f',
                  color: researchMode === 'quick' ? 'white' : '#c5c5d2',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Quick (o4-mini)
              </button>
              <button
                onClick={() => setResearchMode('deep')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: researchMode === 'deep' ? '#10a37f' : '#40414f',
                  color: researchMode === 'deep' ? 'white' : '#c5c5d2',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Deep (o3)
              </button>
            </div>
          </div>

          {/* Research Tools */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#c5c5d2', display: 'block', marginBottom: '0.5rem' }}>
              Research Tools
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#ececf1' }}>
                <input
                  type="checkbox"
                  checked={useWebSearch}
                  onChange={(e) => setUseWebSearch(e.target.checked)}
                  style={{ accentColor: '#10a37f' }}
                />
                Web Search
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#ececf1' }}>
                <input
                  type="checkbox"
                  checked={useCodeInterpreter}
                  onChange={(e) => setUseCodeInterpreter(e.target.checked)}
                  style={{ accentColor: '#10a37f' }}
                />
                Code Interpreter
              </label>
            </div>
          </div>

          {/* Processing Options */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#c5c5d2', display: 'block', marginBottom: '0.5rem' }}>
              Processing
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#ececf1' }}>
                <input
                  type="checkbox"
                  checked={clarifyFirst}
                  onChange={(e) => setClarifyFirst(e.target.checked)}
                  style={{ accentColor: '#10a37f' }}
                />
                Ask Clarifying Questions
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#ececf1' }}>
                <input
                  type="checkbox"
                  checked={enrichPrompt}
                  onChange={(e) => setEnrichPrompt(e.target.checked)}
                  style={{ accentColor: '#10a37f' }}
                />
                Enrich Prompt
              </label>
            </div>
          </div>

          {/* Research Status */}
          {researchStatus && (
            <div style={{
              padding: '0.75rem',
              background: '#40414f',
              borderRadius: '0.5rem',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#c5c5d2', marginBottom: '0.25rem' }}>
                Status: <span style={{ 
                  color: researchStatus.status === 'completed' ? '#10a37f' : 
                         researchStatus.status === 'failed' ? '#ef4444' :
                         researchStatus.status === 'not_found' ? '#8e8ea0' :
                         '#f59e0b' 
                }}>
                  {researchStatus.status === 'not_found' ? 'Expired' : researchStatus.status}
                </span>
              </div>
              {researchStatus.duration_seconds && (
                <div style={{ fontSize: '0.75rem', color: '#8e8ea0' }}>
                  Duration: {Math.round(researchStatus.duration_seconds)}s
                </div>
              )}
              {researchStatus.status === 'not_found' && (
                <div style={{ fontSize: '0.75rem', color: '#8e8ea0', marginTop: '0.25rem' }}>
                  Research expired (server restarted)
                </div>
              )}
            </div>
          )}
          
          {/* Research Output */}
          {researchStatus && researchStatus.status === 'completed' && researchStatus.output_text && (
            <div style={{
              padding: '1rem',
              background: '#343541',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              border: '1px solid #10a37f'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.75rem' 
              }}>
                <div style={{ fontSize: '0.875rem', color: '#10a37f', fontWeight: 'bold' }}>
                  Research Results:
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(researchStatus.output_text);
                    // Simple feedback - you could add a toast notification here
                    const btn = event.target;
                    const originalText = btn.textContent;
                    btn.textContent = '✓ Copied!';
                    setTimeout(() => { btn.textContent = originalText; }, 2000);
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    background: '#2d2d30',
                    color: '#8e8ea0',
                    border: '1px solid #565869',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  📋 Copy
                </button>
              </div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#ececf1', 
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {researchStatus.output_text}
              </div>
              {/* Sources if available */}
              {researchStatus.sources && researchStatus.sources.length > 0 && (
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #565869' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8e8ea0', marginBottom: '0.5rem' }}>
                    Sources:
                  </div>
                  {researchStatus.sources.map((source, idx) => (
                    <div key={idx} style={{ marginBottom: '0.25rem' }}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', color: '#10a37f', textDecoration: 'none' }}
                      >
                        {source.title || source.url}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Clarification Questions */}
          {clarificationQuestions.length > 0 && (
            <div style={{
              padding: '0.75rem',
              background: '#40414f',
              borderRadius: '0.5rem',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#c5c5d2', marginBottom: '0.5rem' }}>
                Please answer these questions to improve research:
              </div>
              {clarificationQuestions.map((question, idx) => (
                <div key={idx} style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#ececf1', display: 'block', marginBottom: '0.25rem' }}>
                    {question}
                  </label>
                  <textarea
                    value={clarificationAnswers[idx] || ''}
                    onChange={(e) => setClarificationAnswers({ 
                      ...clarificationAnswers, 
                      [idx]: e.target.value 
                    })}
                    style={{
                      width: '100%',
                      padding: '0.375rem',
                      background: '#2a2b32',
                      color: '#ececf1',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      resize: 'none',
                      minHeight: '40px'
                    }}
                  />
                </div>
              ))}
              <button
                onClick={handleClarificationSubmit}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  background: '#10a37f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  width: '100%'
                }}
              >
                Submit Answers
              </button>
            </div>
          )}

          {/* Start Research Button */}
          <button
            onClick={handleStartResearch}
            disabled={!currentQuery || activeResearchId !== null}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: (!currentQuery || activeResearchId) ? '#2e3039' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: (!currentQuery || activeResearchId) ? '#6e6e80' : 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: (!currentQuery || activeResearchId) ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600
            }}
          >
            {activeResearchId ? 'Research in Progress...' : 'Start Deep Research'}
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  );
}

// Research Results Display Component
export function ResearchResults({ results, sources }) {
  const [showSources, setShowSources] = useState(false);

  if (!results) return null;

  return (
    <div style={{
      marginTop: '1rem',
      padding: '1rem',
      background: 'rgba(102, 126, 234, 0.1)',
      border: '1px solid rgba(102, 126, 234, 0.3)',
      borderRadius: '0.5rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.5rem'
      }}>
        <h4 style={{ 
          fontSize: '0.875rem', 
          fontWeight: 600,
          color: '#ececf1',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          🧪 Deep Research Results
        </h4>
        {sources && sources.length > 0 && (
          <button
            onClick={() => setShowSources(!showSources)}
            style={{
              fontSize: '0.75rem',
              color: '#667eea',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {showSources ? 'Hide' : 'Show'} Sources ({sources.length})
          </button>
        )}
      </div>

      <div style={{ 
        fontSize: '0.875rem', 
        color: '#c5c5d2',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap'
      }}>
        {results}
      </div>

      {showSources && sources && sources.length > 0 && (
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h5 style={{ fontSize: '0.75rem', color: '#8e8ea0', marginBottom: '0.5rem' }}>
            Sources:
          </h5>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {sources.map((source, idx) => (
              <li key={idx} style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                {source.url ? (
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      color: '#667eea',
                      textDecoration: 'none'
                    }}
                    onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                  >
                    {source.title || source.url}
                  </a>
                ) : (
                  <span style={{ color: '#c5c5d2' }}>{source.title || 'Unknown Source'}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
