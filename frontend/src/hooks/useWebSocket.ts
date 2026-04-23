import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'

export interface WebSocketMessage {
  type: 'connection' | 'message' | 'typing' | 'error' | 'online_status'
  [key: string]: any
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onMessage, onConnect, onDisconnect, onError } = options
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const shouldReconnectRef = useRef(true)
  const isConnectingRef = useRef(false) // Prevent duplicate connection attempts
  const token = useAuthStore((state) => state.accessToken)

  const connect = useCallback(() => {
    if (!token) {
      console.log('No token available, skipping WebSocket connection')
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    if (isConnectingRef.current) {
      console.log('WebSocket connection already in progress')
      return
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    try {
      isConnectingRef.current = true
      shouldReconnectRef.current = true // Enable reconnection for this connection attempt
      
      // Connect to WebSocket
      const wsUrl = `ws://localhost:8000/api/v1/messages/ws?token=${token}`
      console.log('Connecting to WebSocket:', wsUrl)
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        isConnectingRef.current = false
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
        onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('WebSocket message received:', message)
          onMessage?.(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        isConnectingRef.current = false
        setConnectionError('Connection error')
        onError?.(error)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        isConnectingRef.current = false
        setIsConnected(false)
        onDisconnect?.()

        // Only attempt to reconnect if shouldReconnect is true (not intentionally closed)
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay) as unknown as number
        } else if (!shouldReconnectRef.current) {
          console.log('WebSocket closed intentionally, not reconnecting')
        } else {
          console.error('Max reconnection attempts reached')
          setConnectionError('Unable to connect to server')
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      isConnectingRef.current = false
      setConnectionError('Failed to create connection')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false // Disable reconnection when intentionally disconnecting
    isConnectingRef.current = false
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
  }, [])

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    } else {
      console.error('WebSocket is not connected')
      return false
    }
  }, [])

  const sendMessage = useCallback((conversationId: string, content: string) => {
    return send({
      type: 'message',
      conversation_id: conversationId,
      content
    })
  }, [send])

  const sendTypingIndicator = useCallback((conversationId: string, recipientId: string, isTyping: boolean) => {
    return send({
      type: 'typing',
      conversation_id: conversationId,
      recipient_id: recipientId,
      is_typing: isTyping
    })
  }, [send])

  const markMessageRead = useCallback((messageId: string) => {
    return send({
      type: 'mark_read',
      message_id: messageId
    })
  }, [send])

  // Connect on mount
  useEffect(() => {
    if (!token) {
      console.log('No token available for WebSocket')
      return
    }

    connect()

    // Cleanup on unmount only
    return () => {
      shouldReconnectRef.current = false // Disable reconnection on unmount
      isConnectingRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return {
    isConnected,
    connectionError,
    send,
    sendMessage,
    sendTypingIndicator,
    markMessageRead,
    reconnect: connect,
    disconnect
  }
}
