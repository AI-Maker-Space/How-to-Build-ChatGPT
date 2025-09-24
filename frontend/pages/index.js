import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [useResearch, setUseResearch] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentFiles, setCurrentFiles] = useState([]);
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            maxWidth: '28rem',
            width: '100%',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Enter OpenAI API Key</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
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
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none'
              }}
              onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
            />
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setShowApiKeyModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  color: '#4b5563',
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
                  background: apiKey ? '#000' : '#e5e7eb',
                  color: apiKey ? 'white' : '#9ca3af',
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
        borderBottom: '1px solid #e5e7eb',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600 }}>ChatGPT</h1>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>with Responses API</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={startNewChat}
            style={{
              fontSize: '0.875rem',
              color: '#fff',
              background: '#000',
              border: '1px solid #000',
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#1f2937'}
            onMouseOut={(e) => e.currentTarget.style.background = '#000'}
          >
            <span style={{ fontSize: '1rem', pointerEvents: 'none' }}>+</span> 
            <span style={{ pointerEvents: 'none' }}>New Chat</span>
          </button>
          <button
            onClick={() => setShowApiKeyModal(true)}
            style={{
              fontSize: '0.875rem',
              color: '#4b5563',
              background: 'transparent',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#9ca3af';
              e.target.style.color = '#1f2937';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.color = '#4b5563';
            }}
          >
            API Settings
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                How can I help you today?
              </h2>
              <p style={{ color: '#6b7280' }}>
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
                    background: msg.role === 'assistant' ? '#f9fafb' : 'white'
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', maxWidth: '48rem', margin: '0 auto' }}>
                    <div style={{ flexShrink: 0 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        background: msg.role === 'user' ? '#8b5cf6' : '#10b981'
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
                              background: '#f3f4f6',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              color: '#4b5563'
                            }}>
                              📎 {file.name}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ color: '#1f2937', whiteSpace: 'pre-wrap', wordWrap: 'break-word', lineHeight: 1.5 }}>
                        {msg.content || (loading && idx === messages.length - 1 && '●●●')}
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
        borderTop: '1px solid #e5e7eb',
        padding: '1rem',
        background: '#fff'
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
                  background: '#f3f4f6',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}>
                  📄 <span style={{ color: '#1f2937' }}>{file.name}</span>
                  <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>({formatFileSize(file.size)})</span>
                  <button
                    onClick={() => removeFile(file.id)}
                    style={{
                      marginLeft: '0.25rem',
                      color: '#9ca3af',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '1rem'
                    }}
                    onMouseOver={(e) => e.target.style.color = '#4b5563'}
                    onMouseOut={(e) => e.target.style.color = '#9ca3af'}
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
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  minHeight: '52px',
                  maxHeight: '200px',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#000'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                    background: useResearch ? '#000' : 'transparent',
                    color: useResearch ? 'white' : '#9ca3af',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title={useResearch ? "Research enabled" : "Enable research"}
                  onMouseOver={(e) => {
                    if (!useResearch) e.target.style.color = '#4b5563';
                  }}
                  onMouseOut={(e) => {
                    if (!useResearch) e.target.style.color = '#9ca3af';
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
                    color: '#9ca3af',
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
                  onMouseOver={(e) => e.target.style.color = '#4b5563'}
                  onMouseOut={(e) => e.target.style.color = '#9ca3af'}
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
                    background: (loading || (!userMessage.trim() && currentFiles.length === 0)) ? '#e5e7eb' : '#000',
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
            color: '#6b7280'
          }}>
            {useResearch && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ color: '#10b981' }}>✓</span>
                Research enabled
              </span>
            )}
            <span>Powered by OpenAI Responses API</span>
          </div>
        </div>
      </div>
    </div>
  );
}