import { useState, useEffect, useRef } from 'react';
import { DeepResearchPanel, ResearchResults } from '../components/DeepResearch';

export default function Home() {
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [useResearch, setUseResearch] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentFiles, setCurrentFiles] = useState([]);
  const [deepResearchResults, setDeepResearchResults] = useState({});
  const [pendingDeepResearch, setPendingDeepResearch] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    // Check for API key in localStorage
    const storedApiKey = localStorage.getItem('openai_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      setShowApiKeyModal(true);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [userMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);

      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        const res = await fetch(`${base}/api/upload-file`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentFiles(prev => [...prev, {
            id: data.file_id,
            name: data.filename,
            type: data.file_type || 'document',
            size: data.size
          }]);
        } else {
          const error = await res.json();
          alert(`Error uploading ${file.name}: ${error.detail}`);
        }
      } catch (error) {
        alert(`Error uploading ${file.name}: ${error.message}`);
      }
    }

    // Reset the input
    event.target.value = '';
  };

  const removeFile = async (fileId) => {
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const formData = new FormData();
      formData.append('api_key', apiKey);
      
      await fetch(`${base}/api/files/${fileId}`, {
        method: 'DELETE',
        body: formData
      });
      setCurrentFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Error removing file:', error);
    }
  };

  const handleDeepResearch = async (config) => {
    try {
      setPendingDeepResearch(true);
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const res = await fetch(`${base}/api/deep-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        const result = await res.json();
        setDeepResearchResults(prev => ({
          ...prev,
          [result.id]: result
        }));
        
        // Add a message indicating research started
        const researchMessage = {
          role: 'assistant',
          content: `🧪 Deep Research started (ID: ${result.id})\n\nResearching: "${config.query}"\nModel: ${config.model}\nTools: ${config.use_web_search ? '🔍 Web Search' : ''} ${config.use_code_interpreter ? '🧮 Code Interpreter' : ''}\n\nThis may take several minutes. Results will appear when complete.`,
          isDeepResearch: true,
          researchId: result.id,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, researchMessage]);
        
        return result;
      }
    } catch (error) {
      console.error('Deep research error:', error);
      alert('Failed to start deep research: ' + error.message);
    } finally {
      setPendingDeepResearch(false);
    }
  };

  const handleClarificationAnswer = (answers) => {
    // Add clarification answers to the message
    const clarificationMessage = {
      role: 'user',
      content: `Clarification answers:\n${answers}`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, clarificationMessage]);
  };

  const sendMessage = async () => {
    if (!userMessage.trim() && currentFiles.length === 0) return;
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    const messageContent = userMessage.trim();
    const attachedFiles = [...currentFiles];

    // Add the user's message with file info
    const newUserMessage = {
      role: 'user',
      content: messageContent,
      files: attachedFiles,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMessage, { role: 'assistant', content: '', timestamp: new Date().toISOString() }]);
    setUserMessage('');
    setCurrentFiles([]);
    setLoading(true);

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: messageContent,
          model: 'gpt-5',
          api_key: apiKey,
          file_ids: attachedFiles.map(f => f.id),
          use_research: useResearch,
          reasoning_effort: 'medium'
        })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantMessage = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          assistantMessage += decoder.decode(value);
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: assistantMessage
            };
            return updated;
          });
        }
      }
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `Error: ${error.message}`
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const saveApiKey = () => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
      setShowApiKeyModal(false);
    }
  };

  const startNewChat = async () => {
    // Clear the conversation
    setMessages([]);
    setCurrentFiles([]);
    setUploadedFiles([]);
    
    // Clear the session on the backend
    if (apiKey) {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        const formData = new FormData();
        formData.append('api_key', apiKey);
        
        const response = await fetch(`${base}/api/clear-session`, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Session cleared:', result);
        }
      } catch (error) {
        console.error('Error clearing session:', error);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#343541', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#2a2b32',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            maxWidth: '28rem',
            width: '100%',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#ececf1' }}>Enter OpenAI API Key</h2>
            <p style={{ color: '#c5c5d2', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Your API key is stored locally and never sent to our servers.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #565869',
                borderRadius: '0.375rem',
                outline: 'none',
                background: '#40414f',
                color: '#ececf1'
              }}
              onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
            />
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setShowApiKeyModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  color: '#c5c5d2',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveApiKey}
                disabled={!apiKey}
                style={{
                  padding: '0.5rem 1rem',
                  background: apiKey ? '#10a37f' : '#2e3039',
                  color: apiKey ? 'white' : '#6e6e80',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: apiKey ? 'pointer' : 'not-allowed'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#343541'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#ececf1' }}>ChatGPT</h1>
          <span style={{ fontSize: '0.875rem', color: '#8e8ea0' }}>with Deep Research</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DeepResearchPanel 
            onStartResearch={handleDeepResearch}
            apiKey={apiKey}
            currentQuery={userMessage}
            onResearchComplete={(result) => {
              // Add the completed research to the chat
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `🎯 Deep Research Complete!\n\nQuery: ${result.query}\nDuration: ${Math.round(result.duration || 0)}s\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${result.output_text}${
                  result.sources && result.sources.length > 0 
                    ? '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSources:\n' + result.sources.map((s, i) => `${i + 1}. ${s.title || 'Web page'}: ${s.url}`).join('\n')
                    : ''
                }`,
                timestamp: new Date().toISOString(),
                isDeepResearch: true,
                researchId: result.id
              }]);
            }}
            onClarificationAnswer={handleClarificationAnswer}
          />
          <button
            onClick={startNewChat}
            style={{
              fontSize: '0.875rem',
              color: '#ececf1',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: '1rem', pointerEvents: 'none' }}>+</span> 
            <span style={{ pointerEvents: 'none' }}>New Chat</span>
          </button>
          <button
            onClick={() => setShowApiKeyModal(true)}
            style={{
              fontSize: '0.875rem',
              color: '#8e8ea0',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.3)';
              e.target.style.color = '#ececf1';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.2)';
              e.target.style.color = '#8e8ea0';
            }}
          >
            API Settings
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#343541' }}>
        <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1rem' }}>
          {messages.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              textAlign: 'center',
              padding: '2rem'
            }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 400, marginBottom: '0.5rem', color: '#ececf1' }}>
                Where should we begin?
              </h2>
              <p style={{ color: '#8e8ea0', fontSize: '0.875rem' }}>
                Start a conversation or upload a file to begin
              </p>
            </div>
          ) : (
            <div style={{ paddingBottom: '8rem' }}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1.5rem 1rem',
                    background: msg.role === 'assistant' ? '#444654' : '#343541'
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', maxWidth: '48rem', margin: '0 auto' }}>
                    <div style={{ flexShrink: 0 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        background: msg.role === 'user' ? '#5436da' : '#10a37f'
                      }}>
                        {msg.role === 'user' ? 'U' : 'AI'}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {msg.files && msg.files.length > 0 && (
                        <div style={{ marginBottom: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {msg.files.map((file, fileIdx) => (
                            <div key={fileIdx} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem 0.5rem',
                              background: 'rgba(255,255,255,0.1)',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              color: '#c5c5d2'
                            }}>
                              📎 {file.name}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ color: '#ececf1', whiteSpace: 'pre-wrap', wordWrap: 'break-word', lineHeight: 1.5 }}>
                        {msg.content || (loading && idx === messages.length - 1 && '●●●')}
                        {msg.isDeepResearch && msg.researchId && deepResearchResults[msg.researchId] && 
                         deepResearchResults[msg.researchId].status === 'completed' && (
                          <ResearchResults 
                            results={deepResearchResults[msg.researchId].output_text}
                            sources={deepResearchResults[msg.researchId].sources}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '1rem',
        background: '#343541'
      }}>
        <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
          {/* File attachments display */}
          {currentFiles.length > 0 && (
            <div style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {currentFiles.map(file => (
                <div key={file.id} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}>
                  📄 <span style={{ color: '#ececf1' }}>{file.name}</span>
                  <span style={{ color: '#8e8ea0', fontSize: '0.75rem' }}>({formatFileSize(file.size)})</span>
                  <button
                    onClick={() => removeFile(file.id)}
                    style={{
                      marginLeft: '0.25rem',
                      color: '#8e8ea0',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '1rem'
                    }}
                    onMouseOver={(e) => e.target.style.color = '#ececf1'}
                    onMouseOut={(e) => e.target.style.color = '#8e8ea0'}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={textareaRef}
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message ChatGPT..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: '7rem',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '0.75rem',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  minHeight: '52px',
                  maxHeight: '200px',
                  boxSizing: 'border-box',
                  background: '#40414f',
                  color: '#ececf1'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                rows="1"
              />
              
              {/* Action buttons inside textarea */}
              <div style={{
                position: 'absolute',
                bottom: '0.5rem',
                right: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                {/* Research Toggle */}
                <button
                  onClick={() => setUseResearch(!useResearch)}
                  style={{
                    padding: '0.375rem',
                    borderRadius: '0.25rem',
                    background: useResearch ? '#10a37f' : 'transparent',
                    color: useResearch ? 'white' : '#8e8ea0',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title={useResearch ? "Research enabled" : "Enable research"}
                  onMouseOver={(e) => {
                    if (!useResearch) e.target.style.color = '#c5c5d2';
                  }}
                  onMouseOut={(e) => {
                    if (!useResearch) e.target.style.color = '#8e8ea0';
                  }}
                >
                  🔍
                </button>

                {/* File Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '0.375rem',
                    color: '#8e8ea0',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s'
                  }}
                  title="Add photos & files"
                  onMouseOver={(e) => e.target.style.color = '#c5c5d2'}
                  onMouseOut={(e) => e.target.style.color = '#8e8ea0'}
                >
                  📎
                </button>

                {/* Send button */}
                <button
                  onClick={sendMessage}
                  disabled={loading || (!userMessage.trim() && currentFiles.length === 0)}
                  style={{
                    padding: '0.375rem',
                    borderRadius: '0.25rem',
                    background: (loading || (!userMessage.trim() && currentFiles.length === 0)) ? '#2e3039' : '#10a37f',
                    color: 'white',
                    border: 'none',
                    cursor: (loading || (!userMessage.trim() && currentFiles.length === 0)) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'opacity 0.2s'
                  }}
                >
                  ➤
                </button>
              </div>
            </div>
          </div>

          {/* Feature indicators */}
          <div style={{
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.75rem',
            color: '#8e8ea0'
          }}>
            {useResearch && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ color: '#10a37f' }}>✓</span>
                Research enabled
              </span>
            )}
            {pendingDeepResearch && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b' }}>
                <span style={{ animation: 'pulse 2s infinite' }}>⏳</span>
                Deep Research running...
              </span>
            )}
            <span>Powered by OpenAI Responses API & Deep Research</span>
          </div>
        </div>
      </div>
    </div>
  );
}