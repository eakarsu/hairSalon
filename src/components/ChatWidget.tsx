'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Fab,
  Zoom,
  Avatar,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  Chat,
  Close,
  Send,
  SmartToy,
  Person,
} from '@mui/icons-material';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  salonId: string;
  salonName?: string;
  primaryColor?: string;
}

export default function ChatWidget({
  salonId,
  salonName = 'Nail Salon',
  primaryColor = '#e91e63',
}: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0 && open) {
      // Add welcome message
      setMessages([
        {
          role: 'assistant',
          content: `Hi there! Welcome to ${salonName}. I'm here to help you with booking appointments, answering questions about our services, or anything else you need. How can I assist you today?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [open, salonName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          sessionId,
          message: userMessage.content,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "I'm sorry, I'm having trouble connecting right now. Please try again or call us directly.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm sorry, something went wrong. Please try again later.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat FAB Button */}
      <Zoom in={!open}>
        <Fab
          color="primary"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: primaryColor,
            '&:hover': {
              bgcolor: primaryColor,
              filter: 'brightness(0.9)',
            },
            zIndex: 1000,
          }}
        >
          <Badge
            badgeContent={messages.length === 0 ? '!' : null}
            color="error"
          >
            <Chat />
          </Badge>
        </Fab>
      </Zoom>

      {/* Chat Window */}
      <Zoom in={open}>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: { xs: 'calc(100% - 48px)', sm: 380 },
            maxWidth: 380,
            height: { xs: 'calc(100% - 100px)', sm: 500 },
            maxHeight: 500,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: primaryColor,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}>
                <SmartToy />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {salonName}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  AI Assistant
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{ color: 'white' }}
            >
              <Close />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              bgcolor: '#f5f5f5',
            }}
          >
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2,
                }}
              >
                {msg.role === 'assistant' && (
                  <Avatar
                    sx={{
                      bgcolor: primaryColor,
                      width: 28,
                      height: 28,
                      mr: 1,
                    }}
                  >
                    <SmartToy sx={{ fontSize: 16 }} />
                  </Avatar>
                )}
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: '75%',
                    bgcolor: msg.role === 'user' ? primaryColor : 'white',
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                    borderRadius: 2,
                    borderTopLeftRadius: msg.role === 'assistant' ? 0 : 2,
                    borderTopRightRadius: msg.role === 'user' ? 0 : 2,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Typography>
                </Paper>
                {msg.role === 'user' && (
                  <Avatar
                    sx={{
                      bgcolor: 'grey.400',
                      width: 28,
                      height: 28,
                      ml: 1,
                    }}
                  >
                    <Person sx={{ fontSize: 16 }} />
                  </Avatar>
                )}
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: primaryColor, width: 28, height: 28 }}>
                  <SmartToy sx={{ fontSize: 16 }} />
                </Avatar>
                <Paper sx={{ p: 1.5, bgcolor: 'white' }}>
                  <CircularProgress size={16} />
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'white',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                  },
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                sx={{ bgcolor: primaryColor, color: 'white', '&:hover': { bgcolor: primaryColor } }}
              >
                <Send />
              </IconButton>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1, textAlign: 'center' }}
            >
              Powered by AI
            </Typography>
          </Box>
        </Paper>
      </Zoom>
    </>
  );
}
