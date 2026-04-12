import { useState } from 'react'
import { ConversationList } from './Messages/ConversationList'
import { ChatThread } from './Messages/ChatThread'
import { NewChatModal } from './Messages/NewChatModal'
import { MessageSquare } from 'lucide-react'

// Mock data - will be replaced with API calls later
const mockConversations = [
  {
    id: '1',
    username: 'Sarah Chen',
    lastMessage: 'That sounds great! When can we discuss this further?',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: '2',
    username: 'Mike Johnson',
    lastMessage: 'Thanks for the opportunity details!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: '3',
    username: 'Emma Wilson',
    lastMessage: 'Looking forward to collaborating with you',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    unreadCount: 1,
    isOnline: true,
  },
]

// Mock followers for new chat
const mockFollowers = [
  { id: '4', username: 'John Doe', isOnline: true },
  { id: '5', username: 'Jane Smith', isOnline: false },
  { id: '6', username: 'Robert Brown', isOnline: true },
  { id: '7', username: 'Lisa Anderson', isOnline: false },
]

const mockMessages: Record<string, any[]> = {
  '1': [
    {
      id: 'm1',
      content: 'Hi! I saw your post about the tech opportunity. Very interesting!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      isSent: false,
      isDelivered: true,
      isRead: true,
    },
    {
      id: 'm2',
      content: 'Thanks! Would you like to know more details?',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      isSent: true,
      isDelivered: true,
      isRead: true,
    },
    {
      id: 'm3',
      content: 'Yes, please! Especially about the tech stack and timeline.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      isSent: false,
      isDelivered: true,
      isRead: true,
    },
    {
      id: 'm4',
      content: 'We\'re using React, TypeScript, and FastAPI. Looking to start in 2 weeks.',
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      isSent: true,
      isDelivered: true,
      isRead: false,
    },
    {
      id: 'm5',
      content: 'That sounds great! When can we discuss this further?',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      isSent: false,
      isDelivered: true,
      isRead: false,
    },
  ],
  '2': [
    {
      id: 'm1',
      content: 'Hey! I noticed you\'re working on similar projects.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      isSent: false,
      isDelivered: true,
      isRead: true,
    },
    {
      id: 'm2',
      content: 'Thanks for the opportunity details!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      isSent: false,
      isDelivered: true,
      isRead: true,
    },
  ],
  '3': [
    {
      id: 'm1',
      content: 'Looking forward to collaborating with you',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      isSent: false,
      isDelivered: true,
      isRead: true,
    },
  ],
}

export default function MessagesPage() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    mockConversations[0]?.id || null
  )
  const [conversationMessages, setConversationMessages] = useState(mockMessages)
  const [showNewChatModal, setShowNewChatModal] = useState(false)

  const handleSendMessage = (message: string) => {
    if (!activeConversationId) return

    const newMessage = {
      id: `m${Date.now()}`,
      content: message,
      timestamp: new Date().toISOString(),
      isSent: true,
      isDelivered: false,
      isRead: false,
    }

    setConversationMessages(prev => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), newMessage],
    }))

    // Simulate delivery after 1 second
    setTimeout(() => {
      setConversationMessages(prev => ({
        ...prev,
        [activeConversationId]: prev[activeConversationId].map(msg =>
          msg.id === newMessage.id ? { ...msg, isDelivered: true } : msg
        ),
      }))
    }, 1000)
  }

  const handleNewChat = (userId: string, username: string) => {
    // Create new conversation or navigate to existing one
    const existingConv = mockConversations.find(c => c.id === userId)
    if (existingConv) {
      setActiveConversationId(existingConv.id)
    } else {
      // In real app, this would create a new conversation
      setActiveConversationId(userId)
      console.log('Starting new chat with:', username)
    }
  }

  const activeConversation = mockConversations.find(
    conv => conv.id === activeConversationId
  )

  return (
    <div className="h-[calc(100vh-65px)] bg-slate-50 dark:bg-slate-950">
      <div className="h-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] h-full">
          {/* Conversations List - Hidden on mobile when chat is active */}
          <div className={`${activeConversationId ? 'hidden md:block' : 'block'}`}>
            <ConversationList
              conversations={mockConversations}
              activeConversationId={activeConversationId}
              onSelectConversation={setActiveConversationId}
              onNewChat={() => setShowNewChatModal(true)}
            />
          </div>

          {/* Chat Thread */}
          <div className={`${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-col`}>
            {activeConversation && activeConversationId ? (
              <ChatThread
                username={activeConversation.username}
                messages={conversationMessages[activeConversationId] || []}
                onSendMessage={handleSendMessage}
                onBack={() => setActiveConversationId(null)}
                showBackButton={true}
                isOnline={activeConversation.isOnline}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                <MessageSquare className="h-20 w-20 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={handleNewChat}
        followers={mockFollowers}
      />
    </div>
  )
}
