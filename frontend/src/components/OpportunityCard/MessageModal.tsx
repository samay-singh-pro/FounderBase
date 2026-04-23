import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Send, Loader2 } from 'lucide-react'
import { messageApi } from '@/lib/api'

interface MessageModalProps {
  isOpen: boolean
  recipientId: string
  recipientUsername: string
  onClose: () => void
}

export function MessageModal({ isOpen, recipientId, recipientUsername, onClose }: MessageModalProps) {
  const navigate = useNavigate()
  const [messageRequest, setMessageRequest] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSend = async () => {
    if (!messageRequest.trim()) {
      setError('Please write a message')
      return
    }
    
    setIsSendingMessage(true)
    setError('')
    
    try {
      await messageApi.startConversation(recipientId, messageRequest.trim())
      
      setMessageRequest('')
      onClose()
      navigate('/messages')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send message. Please try again.')
    } finally {
      setIsSendingMessage(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              Send Message Request
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Introduce yourself to <span className="font-semibold">{recipientUsername}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div>
            <Label htmlFor="message-request" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Your message
            </Label>
            <Textarea
              id="message-request"
              placeholder="Hi! I saw your post and would love to connect..."
              value={messageRequest}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setMessageRequest(e.target.value)
                  setError('')
                }
              }}
              rows={4}
              className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
              disabled={isSendingMessage}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                They'll receive this as a message request
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {messageRequest.length}/500
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                onClose()
                setMessageRequest('')
              }}
              disabled={isSendingMessage}
              className="flex-1 rounded-full border-slate-300 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSendingMessage || !messageRequest.trim()}
              className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSendingMessage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
