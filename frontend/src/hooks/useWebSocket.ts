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

const MAX_RECONNECT_ATTEMPTS = 5

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onMessage, onConnect, onDisconnect, onError } = options
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const shouldReconnectRef = useRef(true)
  const isConnectingRef = useRef(false)
  const token = useAuthStore((state) => state.accessToken)

  const connect = useCallback(() => {
    if (!token) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    if (isConnectingRef.current) return

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    try {
      isConnectingRef.current = true
      shouldReconnectRef.current = true

      const ws = new WebSocket(`ws://localhost:8000/api/v1/messages/ws?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        isConnectingRef.current = false
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
        onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          onMessage?.(message)
        } catch {
          // Ignore malformed messages
        }
      }

      ws.onerror = (error) => {
        isConnectingRef.current = false
        setConnectionError('Connection error')
        onError?.(error)
      }

      ws.onclose = () => {
        isConnectingRef.current = false
        setIsConnected(false)
        onDisconnect?.()

        if (shouldReconnectRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay) as unknown as number
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionError('Unable to connect to server')
        }
      }
    } catch {
      isConnectingRef.current = false
      setConnectionError('Failed to create connection')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return false
    wsRef.current.send(JSON.stringify({
      type: 'message',
      conversation_id: conversationId,
      content
    }))
    return true
  }, [])

  useEffect(() => {
    if (!token) return

    connect()

    return () => {
      shouldReconnectRef.current = false
      isConnectingRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        // Only close if the connection is open or connecting
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close()
        }
        wsRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return {
    isConnected,
    connectionError,
    sendMessage,
  }
}
