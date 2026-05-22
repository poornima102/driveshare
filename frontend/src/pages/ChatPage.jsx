import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getMessages, sendMessage } from '../api/chat'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const ChatPage = () => {
  const { bookingId }          = useParams()
  const { user }               = useAuthStore()
  const [messages, setMessages]   = useState([])
  const [bookingInfo, setBookingInfo] = useState(null)
  const [content,  setContent]    = useState('')
  const [loading,  setLoading]    = useState(true)
  const [sending,  setSending]    = useState(false)
  const bottomRef                 = useRef(null)
  const wsRef                     = useRef(null)
  const messageIdsRef             = useRef(new Set())

  useEffect(() => {
    fetchMessages()
    const ws = connectWebSocket()
    return () => {
      ws?.close()
    }
  }, [bookingId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    try {
      const res = await getMessages(bookingId)
      const incoming = res.data.messages || []
      messageIdsRef.current = new Set(incoming.map(m => m.id))
      setMessages(incoming)
      setBookingInfo(res.data.booking || null)
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const connectWebSocket = () => {
    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws/chat/${bookingId}/`
    console.log('Chat WebSocket connecting:', wsUrl)
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('Chat WebSocket connected:', wsUrl)
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)

        if (messageIdsRef.current.has(data.message_id)) return
        messageIdsRef.current.add(data.message_id)

        setMessages(prev => [...prev, {
          id:          data.message_id,
          sender_id:   data.sender_id,
          sender_name: data.sender_name,
          content:     data.content,
          created_at:  data.created_at,
        }])
      } catch (err) {
        console.error('WebSocket message parse error:', err)
      }
    }

    ws.onerror = (e) => {
      console.log('Chat WebSocket error:', e)
    }

    ws.onclose = (e) => {
      console.log('Chat WebSocket disconnected:', e)
    }

    wsRef.current = ws
    return ws
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!content.trim()) return

    setSending(true)
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          content:    content.trim(),
          sender_id:  user.id,
          booking_id: bookingId,
        }))
        setContent('')
      } else {
        const res = await sendMessage(bookingId, content.trim())

        if (!messageIdsRef.current.has(res.data.id)) {
          messageIdsRef.current.add(res.data.id)
          setMessages(prev => [...prev, res.data])
        }
        setContent('')
      }
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  })

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.created_at).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {})

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading chat...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-8 px-4">
      <div className="mx-auto w-full max-w-4xl bg-slate-900/95 shadow-2xl rounded-[2rem] overflow-hidden border border-slate-700">

        {/* Chat header */}
        <div className="bg-slate-900 px-6 py-5 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-3xl bg-sky-500/15 text-sky-200 flex items-center justify-center text-2xl">
                🚘
              </div>
              <div>
                <p className="text-xl font-semibold text-white">Chat with {bookingInfo?.other_person || 'your host'}</p>
                <p className="text-sm text-slate-300">Ask questions, confirm pickup details and share trip updates.</p>
              </div>
            </div>
            {bookingInfo?.vehicle && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                <span className="bg-slate-800/60 px-3 py-1 rounded-full">{bookingInfo.vehicle}</span>
                <span className="bg-emerald-500/15 text-emerald-200 px-3 py-1 rounded-full">Confirmed booking</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-950/95 min-h-[60vh]">

        {messages.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">💬</p>
            <p className="text-gray-500">No messages yet</p>
            <p className="text-gray-400 text-sm">Start the conversation!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  {formatDate(msgs[0].created_at)}
                </span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {msgs.map((msg) => {
                const isMe = String(msg.sender_id) === String(user?.id)
                return (
                  <div
                    key={msg.id}
                    className={`flex mb-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md flex flex-col ${
                      isMe ? 'items-end' : 'items-start'
                    }`}>
                      {!isMe && (
                        <p className="text-xs text-gray-500 mb-1 ml-1">
                          {msg.sender_name}
                        </p>
                      )}
                      <div className={`px-4 py-2 rounded-2xl ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 shadow rounded-bl-sm'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      <p className={`text-xs text-gray-400 mt-1 ${
                        isMe ? 'mr-1' : 'ml-1'
                      }`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Message input */}
      <div className="bg-slate-950 border-t border-slate-700 px-4 py-3">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-slate-700 rounded-full bg-slate-900 text-white placeholder:text-slate-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={sending || !content.trim()}
            className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition font-medium">
            {sending ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  </div>
  )
}

export default ChatPage