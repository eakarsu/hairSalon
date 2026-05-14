'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { AutoAwesome, RateReview, NoteAlt, PhotoLibrary } from '@mui/icons-material';

/**
 * Surfaces the 3 AI endpoints that previously had no UI:
 *  - POST /api/ai/visit-notes
 *  - POST /api/ai/review-request
 *  - POST /api/ai/gallery-curator
 *
 * NextAuth session cookie is sent automatically; no Bearer header needed.
 * Visible 503/502 handling — the helpers in the route files return
 * { error } with status 502 when OpenRouter is unavailable.
 */

type Section = 'visit' | 'review' | 'gallery';

interface SubmitResult {
  ok: boolean;
  data?: any;
  error?: string;
  needsKey?: boolean;
}

async function postJSON(url: string, body: any): Promise<SubmitResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const needsKey = res.status === 502 || res.status === 503 ||
        /unavailable|api[_ ]key|OPENROUTER/i.test(String(data?.error || data?.detail || ''));
      return { ok: false, error: data?.error || `HTTP ${res.status}`, needsKey };
    }
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

export default function AIExtrasPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <AutoAwesome sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            More AI Tools
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visit-notes summary, review-request drafting, and gallery photo curation
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <VisitNotesCard />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ReviewRequestCard />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <GalleryCuratorCard />
        </Grid>
      </Grid>
    </Box>
  );
}

function ResultBlock({ result }: { result: SubmitResult | null }) {
  if (!result) return null;
  if (!result.ok) {
    return (
      <Alert severity={result.needsKey ? 'warning' : 'error'} sx={{ mt: 2 }}>
        {result.needsKey
          ? `AI provider unavailable — set OPENROUTER_API_KEY in the server .env. (${result.error})`
          : result.error}
      </Alert>
    );
  }
  return (
    <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
      <Typography variant="caption" color="text.secondary">Response</Typography>
      <Box component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: 13, m: 0, mt: 1 }}>
        {typeof result.data === 'string'
          ? result.data
          : JSON.stringify(result.data, null, 2)}
      </Box>
    </Paper>
  );
}

function VisitNotesCard() {
  const [bulletNotes, setBulletNotes] = useState('');
  const [visitId, setVisitId] = useState('');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const onSubmit = async () => {
    if (!bulletNotes.trim()) return;
    setLoading(true);
    setResult(null);
    const body: any = { bulletNotes };
    if (visitId.trim()) body.visitId = visitId.trim();
    if (clientId.trim()) body.clientId = clientId.trim();
    setResult(await postJSON('/api/ai/visit-notes', body));
    setLoading(false);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <NoteAlt color="primary" />
          <Typography variant="h6">Visit Notes Summarizer</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Turn bullet-style technician notes into a polished visit summary.
        </Typography>
        <TextField
          label="Bullet notes"
          fullWidth
          multiline
          minRows={4}
          value={bulletNotes}
          onChange={(e) => setBulletNotes(e.target.value)}
          placeholder={'• gel manicure, OPI Bubble Bath\n• cuticles softened\n• client requested shorter shape next time'}
          sx={{ mb: 2 }}
        />
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <TextField label="Visit ID (optional)" fullWidth size="small" value={visitId} onChange={(e) => setVisitId(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField label="Client ID (optional)" fullWidth size="small" value={clientId} onChange={(e) => setClientId(e.target.value)} />
          </Grid>
        </Grid>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={onSubmit}
          disabled={loading || !bulletNotes.trim()}
          startIcon={loading ? <CircularProgress size={18} /> : <NoteAlt />}
        >
          Summarize
        </Button>
        <ResultBlock result={result} />
      </CardContent>
    </Card>
  );
}

function ReviewRequestCard() {
  const [serviceName, setServiceName] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [platform, setPlatform] = useState('Google');
  const [language, setLanguage] = useState('en');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const onSubmit = async () => {
    if (!serviceName || !visitDate) return;
    setLoading(true);
    setResult(null);
    const body: any = { serviceName, visitDate, platform, language };
    if (clientId.trim()) body.clientId = clientId.trim();
    setResult(await postJSON('/api/ai/review-request', body));
    setLoading(false);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <RateReview color="primary" />
          <Typography variant="h6">Review-Request Drafter</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Draft a polite, on-brand review request for Google or Yelp.
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Service name" fullWidth size="small" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Visit date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Platform</InputLabel>
              <Select value={platform} label="Platform" onChange={(e) => setPlatform(e.target.value)}>
                <MenuItem value="Google">Google</MenuItem>
                <MenuItem value="Yelp">Yelp</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Language</InputLabel>
              <Select value={language} label="Language" onChange={(e) => setLanguage(e.target.value)}>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Español</MenuItem>
                <MenuItem value="vi">Tiếng Việt</MenuItem>
                <MenuItem value="ko">한국어</MenuItem>
                <MenuItem value="zh">中文</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField label="Client ID (optional)" fullWidth size="small" value={clientId} onChange={(e) => setClientId(e.target.value)} />
          </Grid>
        </Grid>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={onSubmit}
          disabled={loading || !serviceName || !visitDate}
          startIcon={loading ? <CircularProgress size={18} /> : <RateReview />}
        >
          Draft Request
        </Button>
        <ResultBlock result={result} />
      </CardContent>
    </Card>
  );
}

function GalleryCuratorCard() {
  const [photoId, setPhotoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const onSubmit = async () => {
    if (!photoId.trim()) return;
    setLoading(true);
    setResult(null);
    setResult(await postJSON('/api/ai/gallery-curator', { photoId: photoId.trim() }));
    setLoading(false);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PhotoLibrary color="primary" />
          <Typography variant="h6">Gallery Photo Curator</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Auto-tag a gallery photo with style/colors and generate Instagram + TikTok captions.
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <TextField
          label="Photo ID"
          fullWidth
          size="small"
          value={photoId}
          onChange={(e) => setPhotoId(e.target.value)}
          placeholder="e.g. clw5xy0a90001abcd"
          helperText="Find IDs in the Gallery page or via /api/ai/gallery-curator?salonId=..."
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={loading || !photoId.trim()}
          startIcon={loading ? <CircularProgress size={18} /> : <PhotoLibrary />}
        >
          Curate
        </Button>
        <ResultBlock result={result} />
      </CardContent>
    </Card>
  );
}
