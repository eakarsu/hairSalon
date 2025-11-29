'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import {
  SmartToy,
  Schedule,
  Recommend,
  Chat,
  TrendingUp,
  Warning,
  Campaign,
  ContentCopy,
  Check,
} from '@mui/icons-material';

interface AITool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  endpoint: string;
}

const aiTools: AITool[] = [
  {
    id: 'reschedule',
    name: 'AI Rescheduler',
    description: 'Get intelligent reschedule suggestions based on client preferences',
    icon: <Schedule />,
    color: '#2196f3',
    endpoint: '/api/ai/reschedule',
  },
  {
    id: 'recommend',
    name: 'Service Recommender',
    description: 'AI-powered service recommendations for clients',
    icon: <Recommend />,
    color: '#4caf50',
    endpoint: '/api/ai/service-recommend',
  },
  {
    id: 'noshow',
    name: 'No-Show Predictor',
    description: 'Predict no-show risk for upcoming appointments',
    icon: <Warning />,
    color: '#ff9800',
    endpoint: '/api/ai/noshow-predict',
  },
  {
    id: 'staff',
    name: 'Staff Insights',
    description: 'Analyze technician performance with AI',
    icon: <TrendingUp />,
    color: '#9c27b0',
    endpoint: '/api/ai/staff-insights',
  },
  {
    id: 'marketing',
    name: 'Marketing Generator',
    description: 'Create social media posts and email campaigns',
    icon: <Campaign />,
    color: '#e91e63',
    endpoint: '/api/ai/marketing',
  },
  {
    id: 'chat',
    name: 'AI Chat Assistant',
    description: 'Test the customer-facing chat assistant',
    icon: <Chat />,
    color: '#00bcd4',
    endpoint: '/api/ai/chat',
  },
];

export default function AIToolsPage() {
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Marketing tool state
  const [contentType, setContentType] = useState('social_post');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('friendly');

  // Chat tool state
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);

  const handleToolClick = (tool: AITool) => {
    setSelectedTool(tool);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    setSelectedTool(null);
    setResult(null);
    setError(null);
  };

  const handleMarketingGenerate = async () => {
    if (!topic) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          topic,
          tone,
          targetAudience: 'salon clients',
          keyPoints: [],
          callToAction: 'Book your appointment today!',
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data.content);
      } else {
        setError(data.error || 'Failed to generate content');
      }
    } catch (err) {
      setError('Failed to connect to AI service');
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatMessage) return;

    setLoading(true);
    setError(null);

    const newHistory = [...chatHistory, { role: 'user', content: chatMessage }];
    setChatHistory(newHistory);
    setChatMessage('');

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: 'demo',
          message: chatMessage,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setChatHistory([...newHistory, { role: 'assistant', content: data.response }]);
      } else {
        setError(data.error || 'Failed to get response');
      }
    } catch (err) {
      setError('Failed to connect to AI service');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <SmartToy sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            AI Tools
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Leverage AI to enhance your salon operations
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {aiTools.map((tool) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tool.id}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => handleToolClick(tool)}
            >
              <CardContent>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: `${tool.color}15`,
                    color: tool.color,
                    mb: 2,
                  }}
                >
                  {tool.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {tool.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tool.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" sx={{ color: tool.color }}>
                  Try Now
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Marketing Generator Dialog */}
      <Dialog
        open={selectedTool?.id === 'marketing'}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Campaign sx={{ color: '#e91e63' }} />
            AI Marketing Generator
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Content Type</InputLabel>
                <Select
                  value={contentType}
                  label="Content Type"
                  onChange={(e) => setContentType(e.target.value)}
                >
                  <MenuItem value="social_post">Social Media Post</MenuItem>
                  <MenuItem value="email_campaign">Email Campaign</MenuItem>
                  <MenuItem value="promo_sms">Promo SMS</MenuItem>
                  <MenuItem value="newsletter">Newsletter</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Tone</InputLabel>
                <Select
                  value={tone}
                  label="Tone"
                  onChange={(e) => setTone(e.target.value)}
                >
                  <MenuItem value="friendly">Friendly</MenuItem>
                  <MenuItem value="professional">Professional</MenuItem>
                  <MenuItem value="playful">Playful</MenuItem>
                  <MenuItem value="luxurious">Luxurious</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Topic / Theme"
                placeholder="e.g., Valentine's Day special, New gel polish colors, Summer nail trends"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Chip label="Generated Content" size="small" color="success" />
                <Button
                  size="small"
                  startIcon={copied ? <Check /> : <ContentCopy />}
                  onClick={handleCopy}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </Box>
              <Typography
                sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
              >
                {result}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button
            variant="contained"
            onClick={handleMarketingGenerate}
            disabled={loading || !topic}
            startIcon={loading ? <CircularProgress size={20} /> : <Campaign />}
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Chat Assistant Dialog */}
      <Dialog
        open={selectedTool?.id === 'chat'}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chat sx={{ color: '#00bcd4' }} />
            AI Chat Assistant (Demo)
          </Box>
        </DialogTitle>
        <DialogContent>
          <Paper
            sx={{
              height: 300,
              overflow: 'auto',
              p: 2,
              bgcolor: 'grey.50',
              mb: 2,
            }}
          >
            {chatHistory.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 10 }}>
                Start a conversation to test the AI assistant
              </Typography>
            ) : (
              chatHistory.map((msg, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    mb: 1,
                  }}
                >
                  <Paper
                    sx={{
                      p: 1.5,
                      maxWidth: '80%',
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                      color: msg.role === 'user' ? 'white' : 'text.primary',
                    }}
                  >
                    <Typography variant="body2">{msg.content}</Typography>
                  </Paper>
                </Box>
              ))
            )}
          </Paper>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Ask a question..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
            />
            <Button
              variant="contained"
              onClick={handleChatSend}
              disabled={loading || !chatMessage}
            >
              Send
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChatHistory([])}>Clear Chat</Button>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Generic Tool Dialog for others */}
      <Dialog
        open={!!selectedTool && !['marketing', 'chat'].includes(selectedTool.id)}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedTool?.icon}
            {selectedTool?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 1 }}>
            This AI tool is available via API. Use it from the relevant page in the dashboard:
          </Alert>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Endpoint:</strong> {selectedTool?.endpoint}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2">
              {selectedTool?.id === 'reschedule' && 'Access from Calendar page when rescheduling an appointment.'}
              {selectedTool?.id === 'recommend' && 'Access from Client detail page to get personalized service recommendations.'}
              {selectedTool?.id === 'noshow' && 'Access from Calendar page to view no-show risk predictions.'}
              {selectedTool?.id === 'staff' && 'Access from Staff page to view performance insights.'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
