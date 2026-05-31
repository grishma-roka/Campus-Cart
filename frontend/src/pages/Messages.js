import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import io from 'socket.io-client';
import { Image, Send, Image as ImageIcon } from 'lucide-react';
import InlineImageComparison from '../components/InlineImageComparison';

export default function Messages() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const backendUrl = 'http://localhost:5000';
  const [sending, setSending] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [imageUploadType, setImageUploadType] = useState(null);
  
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(axios.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000');
    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation?.id) {
      if (socketRef.current) {
        socketRef.current.emit('join_conversation', selectedConversation.id);
        socketRef.current.off('receive_message');
        socketRef.current.on('receive_message', (msg) => {
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          fetchConversations();
        });
      }
      fetchMessages(selectedConversation.id);
    }
    return () => {
      if (socketRef.current) socketRef.current.off('receive_message');
    };
  }, [selectedConversation]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id.toString() === conversationId);
      if (conv && (!selectedConversation || selectedConversation.id !== conv.id)) {
        setSelectedConversation(conv);
      }
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get('/chat/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(`/chat/messages/${conversationId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
    }
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewImg(ev.target.result);
      reader.readAsDataURL(e.target.files[0]);
    } else {
      setPreviewImg(null);
      setImageUploadType(null);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !fileInputRef.current?.files[0]) || !selectedConversation) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('conversation_id', selectedConversation.id);
      
      if (newMessage.trim()) {
        formData.append('message', newMessage.trim());
        formData.append('message_type', 'text');
      }

      if (fileInputRef.current?.files[0]) {
        formData.append('image', fileInputRef.current.files[0]);
        formData.append('message_type', 'image');
        if (imageUploadType) {
          formData.append('image_type', imageUploadType);
        }
      }

      await axios.post('/chat/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setNewMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setPreviewImg(null);
      setImageUploadType(null);
      
      fetchMessages(selectedConversation.id);
      fetchConversations();
    } catch (error) {
      alert('Failed to send message: ' + (error.response?.data?.error || error.message));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading messages...</div>;
  }

  const hasBeforeImage = messages.some(m => m.image_type === 'before');
  const hasAfterImage = messages.some(m => m.image_type === 'after');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Messages</h1>
        <p>Chat with buyers, sellers, and other users</p>
      </div>

      <div style={styles.chatContainer}>
        {/* Conversations List */}
        <div style={styles.conversationsList}>
          <h3>Conversations</h3>
          {conversations.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No conversations yet</p>
              <p>Start chatting when you buy, sell, or borrow items!</p>
            </div>
          ) : (
            conversations.map(conversation => (
              <div 
                key={conversation.id}
                style={{
                  ...styles.conversationItem,
                  backgroundColor: selectedConversation?.id === conversation.id ? '#EAF4FE' : '#fff'
                }}
                onClick={() => handleConversationSelect(conversation)}
              >
                <div style={styles.conversationHeader}>
                  <h4>{conversation.other_user_name}</h4>
                  <span style={styles.conversationTime}>
                    {new Date(conversation.last_message_time || conversation.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p style={styles.lastMessage}>{conversation.last_message_type === 'image' ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ImageIcon size={14} color="#F88000" /> Image</span> : conversation.last_message || 'Start chatting...'}</p>
                {conversation.item_title && (
                  <p style={styles.itemTitle}>Item: {conversation.item_title}</p>
                )}
                {conversation.unread_count > 0 && (
                  <span style={styles.unreadBadge}>{conversation.unread_count}</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Messages Area */}
        <div style={styles.messagesArea}>
          {selectedConversation ? (
            <>
              <div style={styles.messagesHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>{selectedConversation.other_user_name}</h3>
                    {selectedConversation.item_title && (
                      <p style={styles.itemContext}>Regarding: {selectedConversation.item_title}</p>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.messagesList}>
                {messages.length === 0 ? (
                  <div style={styles.emptyMessages}>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(message => {
                    const mine = message.sender_id === user.id;
                    return (
                      <div 
                        key={message.id}
                        style={{
                          ...styles.messageItem,
                          alignSelf: mine ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          ...styles.messageContent,
                          backgroundColor: mine ? '#F88000' : '#FFFFFF',
                          color: mine ? '#fff' : '#000',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
                        }}>
                          {message.image_url && (
                            <div style={{marginBottom: message.message ? '8px' : '0'}}>
                              {message.image_type && (
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: mine ? '#fff' : '#666', textTransform: 'capitalize' }}>
                                  {message.image_type} Image
                                </div>
                              )}
                              {(() => {
                                const src = message.image_url.startsWith('http') ? message.image_url
                                  : message.image_url.startsWith('/uploads/') ? `${backendUrl}${message.image_url}`
                                  : `${backendUrl}/uploads/${message.image_url}`;
                                return (
                                  <a href={src} target="_blank" rel="noreferrer">
                                    <img src={src} alt="Shared" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                                  </a>
                                );
                              })()}
                            </div>
                          )}
                          {message.message && <p style={styles.messageText}>{message.message}</p>}
                          <div style={{...styles.messageTime, textAlign: mine ? 'right' : 'left'}}>
                            {new Date(message.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                
                {(hasBeforeImage && hasAfterImage) && (
                   <InlineImageComparison messages={messages} />
                )}

                <div ref={bottomRef} />
              </div>

              {previewImg && (
                <div style={styles.previewContainer}>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                     <span style={{fontSize: '0.8rem', fontWeight: 'bold', color: '#666'}}>
                       {imageUploadType === 'before' ? 'Before Image' : imageUploadType === 'after' ? 'After Image' : 'Attached Image'}
                     </span>
                     <img src={previewImg} alt="Preview" style={{ height: '60px', borderRadius: '4px', marginTop: '4px' }} />
                  </div>
                  <button type="button" onClick={() => { setPreviewImg(null); fileInputRef.current.value = ''; setImageUploadType(null); }} style={styles.removePreviewBtn}>✕</button>
                </div>
              )}

              <form onSubmit={handleSendMessage} style={{...styles.messageForm, flexDirection: 'column', alignItems: 'stretch'}}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                   <button type="button" onClick={() => { setImageUploadType('before'); fileInputRef.current?.click(); }} style={styles.actionBtn}>Before Product Image</button>
                   <button type="button" onClick={() => { setImageUploadType('after'); fileInputRef.current?.click(); }} style={styles.actionBtn}>After Product Image</button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    type="button"
                    onClick={() => { setImageUploadType(null); fileInputRef.current?.click(); }} 
                    style={{ ...styles.imageUploadBtn, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Attach Image"
                  >
                  <Image size={20} />
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  style={styles.messageInput}
                />
                <button type="submit" style={{ ...styles.sendButton, display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={sending || (!newMessage.trim() && !fileInputRef.current?.files?.[0])}>
                  {sending ? '...' : <Send size={18} />}
                </button>
                </div>
              </form>
            </>
          ) : (
            <div style={styles.noConversationSelected}>
              <h3>Select a conversation to start chatting</h3>
              <p>Choose a conversation from the left to view and send messages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: '#f8f9fa'
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '1.2rem'
  },
  chatContainer: {
    display: 'flex',
    height: '600px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  conversationsList: {
    width: '350px',
    borderRight: '1px solid #e9ecef',
    padding: '1rem',
    overflowY: 'auto'
  },
  conversationItem: {
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '0.5rem',
    cursor: 'pointer',
    border: '1px solid #e9ecef',
    position: 'relative',
    transition: 'background-color 0.3s ease'
  },
  conversationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  conversationTime: {
    fontSize: '0.8rem',
    color: '#666'
  },
  lastMessage: {
    color: '#666',
    fontSize: '0.9rem',
    margin: '0.25rem 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  itemTitle: {
    color: '#2196f3',
    fontSize: '0.8rem',
    margin: '0.25rem 0',
    fontStyle: 'italic'
  },
  unreadBadge: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    backgroundColor: '#F88000',
    color: '#fff',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    fontWeight: 'bold'
  },
  messagesArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  messagesHeader: {
    padding: '1rem',
    borderBottom: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa'
  },
  itemContext: {
    color: '#666',
    fontSize: '0.9rem',
    margin: '0.5rem 0 0 0',
    fontStyle: 'italic'
  },
  messagesList: {
    flex: 1,
    padding: '1rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  messageItem: {
    display: 'flex',
    maxWidth: '70%'
  },
  messageContent: {
    padding: '0.75rem 1rem',
    borderRadius: '18px',
    maxWidth: '100%'
  },
  messageText: {
    margin: '0 0 0.25rem 0',
    wordWrap: 'break-word'
  },
  messageTime: {
    fontSize: '0.7rem',
    opacity: 0.7
  },
  previewContainer: {
    padding: '8px 16px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e9ecef',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px'
  },
  removePreviewBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    fontWeight: 'bold'
  },
  messageForm: {
    display: 'flex',
    padding: '1rem',
    borderTop: '1px solid #e9ecef',
    gap: '0.5rem',
    alignItems: 'center'
  },
  imageUploadBtn: {
    padding: '0.75rem',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  messageInput: {
    flex: 1,
    padding: '0.75rem',
    border: '2px solid #e9ecef',
    borderRadius: '25px',
    fontSize: '1rem',
    outline: 'none'
  },
  sendButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#F88000',
    color: '#fff',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem'
  },
  noConversationSelected: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#666'
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem',
    color: '#666'
  },
  emptyMessages: {
    textAlign: 'center',
    padding: '2rem',
    color: '#666'
  },
  actionBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#eaf4fe',
    color: '#2196f3',
    border: '1px solid #2196f3',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold'
  },
  actionBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#eaf4fe',
    color: '#2196f3',
    border: '1px solid #2196f3',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold'
  }
};