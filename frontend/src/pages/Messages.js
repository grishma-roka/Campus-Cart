import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      console.log('💬 Fetching conversations...');
      const response = await axios.get('/chat/conversations');
      setConversations(response.data);
      console.log(`✅ Found ${response.data.length} conversations`);
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      console.log(`💬 Fetching messages for conversation ${conversationId}...`);
      const response = await axios.get(`/chat/messages/${conversationId}`);
      setMessages(response.data);
      console.log(`✅ Found ${response.data.length} messages`);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
    }
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await axios.post('/chat/send', {
        receiver_id: selectedConversation.other_user_id,
        message: newMessage,
        item_id: selectedConversation.item_id || null,
        borrow_request_id: selectedConversation.borrow_request_id || null
      });

      setNewMessage('');
      fetchMessages(selectedConversation.id);
      fetchConversations(); // Refresh conversations to update last message
    } catch (error) {
      alert('Failed to send message: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading messages...</div>;
  }

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
                  backgroundColor: selectedConversation?.id === conversation.id ? '#e3f2fd' : '#fff'
                }}
                onClick={() => handleConversationSelect(conversation)}
              >
                <div style={styles.conversationHeader}>
                  <h4>{conversation.other_user_name}</h4>
                  <span style={styles.conversationTime}>
                    {new Date(conversation.last_message_time).toLocaleDateString()}
                  </span>
                </div>
                <p style={styles.lastMessage}>{conversation.last_message}</p>
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
                <h3>{selectedConversation.other_user_name}</h3>
                {selectedConversation.item_title && (
                  <p style={styles.itemContext}>Regarding: {selectedConversation.item_title}</p>
                )}
              </div>

              <div style={styles.messagesList}>
                {messages.length === 0 ? (
                  <div style={styles.emptyMessages}>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(message => (
                    <div 
                      key={message.id}
                      style={{
                        ...styles.messageItem,
                        alignSelf: message.sender_id === user.id ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div style={{
                        ...styles.messageContent,
                        backgroundColor: message.sender_id === user.id ? '#2196f3' : '#f5f5f5',
                        color: message.sender_id === user.id ? '#fff' : '#333'
                      }}>
                        <p style={styles.messageText}>{message.message}</p>
                        <span style={styles.messageTime}>
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} style={styles.messageForm}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  style={styles.messageInput}
                />
                <button type="submit" style={styles.sendButton}>
                  Send
                </button>
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
    backgroundColor: '#f44336',
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
  messageForm: {
    display: 'flex',
    padding: '1rem',
    borderTop: '1px solid #e9ecef',
    gap: '0.5rem'
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
    backgroundColor: '#2196f3',
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
  }
};