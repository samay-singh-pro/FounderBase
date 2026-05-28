import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { 
  Sparkles, Send, Loader2, Lightbulb, FileEdit, 
  Copy, Check, ChevronDown, ChevronUp 
} from 'lucide-react'
import { aiService, type ChatMessage, type CurrentDraft } from '@/services/ai.service'

interface AIWritingAssistantProps {
  currentDraft: CurrentDraft
}

export default function AIWritingAssistant({ 
  currentDraft
}: AIWritingAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I'm here to help you create an awesome post. Tell me about your idea, or ask me to help refine what you're working on!"
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    
    // Add user message
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage }
    ]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const response = await aiService.chat({
        message: userMessage,
        conversation_history: messages,
        current_draft: currentDraft
      })

      if (response.success) {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: response.message }
        ])
      } else {
        setMessages([
          ...newMessages,
          { 
            role: 'assistant', 
content: `❌ ${response.error || 'Sorry, I encountered an error. Please try again.'}` 
          }
        ])
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        { 
          role: 'assistant', 
          content: '❌ Failed to get response. Please try again.' 
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = async (action: 'refine' | 'titles' | 'improve') => {
    if (isLoading) return

    setIsLoading(true)
    let response: any = null

    try {
      if (action === 'refine') {
        setMessages([...messages, { role: 'user', content: 'Please analyze and refine my idea' }])
        
        response = await aiService.refineIdea({
          title: currentDraft.title,
          description: currentDraft.description || '',
          category: currentDraft.category,
          type: currentDraft.type
        })
        
        if (response.success) {
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: response.feedback }
          ])
        } else {
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `❌ ${response.error}` }
          ])
        }
      } else if (action === 'titles') {
        if (!currentDraft.description || currentDraft.description.length < 10) {
          setMessages([
            ...messages,
            { role: 'assistant', content: '❌ Please write a description first (at least 10 characters) so I can suggest titles.' }
          ])
          setIsLoading(false)
          return
        }
        
        setMessages([...messages, { role: 'user', content: 'Suggest some titles for my post' }])
        
        response = await aiService.suggestTitles({
          description: currentDraft.description,
          category: currentDraft.category,
          type: currentDraft.type
        })
        
        if (response.success && response.titles.length > 0) {
          const titlesText = '**Here are some title suggestions:**\n\n' + 
            response.titles.map((title: string, i: number) => `${i + 1}. ${title}`).join('\n')
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: titlesText }
          ])
        } else {
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `❌ ${response.error}` }
          ])
        }
      } else if (action === 'improve') {
        if (!currentDraft.description || currentDraft.description.length < 20) {
          setMessages([
            ...messages,
            { role: 'assistant', content: '❌ Please write a description first (at least 20 characters) so I can improve it.' }
          ])
          setIsLoading(false)
          return
        }
        
        setMessages([...messages, { role: 'user', content: 'Improve my description' }])
        
        response = await aiService.improveDescription({
          description: currentDraft.description,
          type: currentDraft.type,
          category: currentDraft.category
        })
        
        if (response.success) {
          let resultText = '**Improved Description:**\n\n' + response.improved
          
          if (response.suggestions && response.suggestions.length > 0) {
            resultText += '\n\n**Suggestions:**\n' + 
              response.suggestions.map((s: string) => `• ${s}`).join('\n')
          }
          
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: resultText }
          ])
        } else {
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `❌ ${response.error}` }
          ])
        }
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '❌ Failed to process request. Please try again.' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card className="h-full flex flex-col border-2 border-blue-200 dark:border-blue-800">
      <CardHeader className="flex-none pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg">AI Writing Assistant</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="flex-1 flex flex-col p-4 pt-3 gap-3 min-h-0 overflow-hidden">
          {/* Quick Actions */}
          <div className="flex-none flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction('refine')}
              disabled={isLoading || !currentDraft.description}
              className="text-xs rounded-full"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Refine Idea
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction('titles')}
              disabled={isLoading || !currentDraft.description}
              className="text-xs rounded-full"
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              Suggest Titles
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction('improve')}
              disabled={isLoading || !currentDraft.description}
              className="text-xs rounded-full"
            >
              <FileEdit className="h-3 w-3 mr-1" />
              Improve Description
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 min-h-0 pr-1">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyMessage(msg.content, index)}
                        className="h-6 px-2 text-xs"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-none flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything about your post..."
              className="min-h-[44px] max-h-24 resize-none"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              size="sm"
              className="h-11 px-3 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Context Indicator */}
          <div className="flex-none text-xs text-slate-500 dark:text-slate-400 text-center py-1">
            AI knows your current draft context
          </div>
        </CardContent>
      )}
    </Card>
  )
}
