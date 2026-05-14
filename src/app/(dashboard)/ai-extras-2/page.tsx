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
} from '@mui/material';
import { AutoAwesome, TrendingUp, AddShoppingCart, Spa } from '@mui/icons-material';

/**
 * Apply pass 5 — surfaces 3 additive AI endpoints:
 *  - POST /api/ai/retention-forecast
 *  - POST /api/ai/upsell-suggester
 *  - POST /api/ai/wellness-tips
 *
 * 503 (missing OPENROUTER_API_KEY) shown as warning Alert.
 */

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
      const needsKey = res.status === 503 || res.status === 502 ||
        /OPENROUTER|api[_ ]key|unavailable/i.test(String(data?.error || ''));
      return { ok: false, error: data?.error || `HTTP ${res.status}`, needsKey };
    }
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

function ResultBlock({ result }: { result: SubmitResult | null }) {
  if (!result) return null;
  if (!result.ok) {
    return (
      <Alert severity={result.needsKey ? 'warning' : 'error'} sx={{ mt: 2 }}>
        {result.needsKey
          ? `AI unavailable — set OPENROUTER_API_KEY in the server .env. (${result.error})`
          : result.error}
      </Alert>
    );
  }
  return (
    <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
      <Typography variant="caption" color="text.secondary">Response</Typography>
      <Box component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: 13, m: 0, mt: 1, maxHeight: 360, overflow: 'auto' }}>
        {result.data?.parsed
          ? JSON.stringify(result.data.parsed, null, 2)
          : (typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2))}
      </Box>
    </Paper>
  );
}

function RetentionForecastCard() {
  const [timeframeDays, setTimeframeDays] = useState('90');
  const [segment, setSegment] = useState('');
  const [recentChurnSignals, setRecentChurnSignals] = useState('');
  const [retentionGoals, setRetentionGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const onSubmit = async () => {
    setLoading(true); setResult(null);
    const body: any = { timeframeDays: Number(timeframeDays) || 90 };
    if (segment) body.segment = segment;
    if (recentChurnSignals) body.recentChurnSignals = recentChurnSignals.split(',').map((s) => s.trim()).filter(Boolean);
    if (retentionGoals) body.retentionGoals = retentionGoals;
    setResult(await postJSON('/api/ai/retention-forecast', body));
    setLoading(false);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TrendingUp color="primary" />
          <Typography variant="h6">Retention Forecast</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}><TextField label="Timeframe (days)" fullWidth size="small" type="number" value={timeframeDays} onChange={(e) => setTimeframeDays(e.target.value)} /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Segment" fullWidth size="small" value={segment} onChange={(e) => setSegment(e.target.value)} /></Grid>
          <Grid size={{ xs: 12 }}><TextField label="Recent churn signals (comma-sep)" fullWidth size="small" value={recentChurnSignals} onChange={(e) => setRecentChurnSignals(e.target.value)} /></Grid>
          <Grid size={{ xs: 12 }}><TextField label="Retention goals" fullWidth size="small" value={retentionGoals} onChange={(e) => setRetentionGoals(e.target.value)} /></Grid>
        </Grid>
        <Button variant="contained" sx={{ mt: 2 }} onClick={onSubmit} disabled={loading} startIcon={loading ? <CircularProgress size={18} /> : <TrendingUp />}>
          Forecast
        </Button>
        <ResultBlock result={result} />
      </CardContent>
    </Card>
  );
}

function UpsellSuggesterCard() {
  const [clientName, setClientName] = useState('');
  const [currentService, setCurrentService] = useState('');
  const [recentServices, setRecentServices] = useState('');
  const [budgetTier, setBudgetTier] = useState('mid');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const onSubmit = async () => {
    if (!clientName) return;
    setLoading(true); setResult(null);
    const body: any = { clientName, budgetTier };
    if (currentService) body.currentService = currentService;
    if (recentServices) body.recentServices = recentServices.split(',').map((s) => s.trim()).filter(Boolean);
    setResult(await postJSON('/api/ai/upsell-suggester', body));
    setLoading(false);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AddShoppingCart color="primary" />
          <Typography variant="h6">Upsell Suggester</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}><TextField label="Client name" fullWidth size="small" value={clientName} onChange={(e) => setClientName(e.target.value)} /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Current service" fullWidth size="small" value={currentService} onChange={(e) => setCurrentService(e.target.value)} /></Grid>
          <Grid size={{ xs: 12 }}><TextField label="Recent services (comma-sep)" fullWidth size="small" value={recentServices} onChange={(e) => setRecentServices(e.target.value)} /></Grid>
          <Grid size={{ xs: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Budget tier</InputLabel>
              <Select value={budgetTier} label="Budget tier" onChange={(e) => setBudgetTier(e.target.value)}>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="mid">Mid</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Button variant="contained" sx={{ mt: 2 }} onClick={onSubmit} disabled={loading || !clientName} startIcon={loading ? <CircularProgress size={18} /> : <AddShoppingCart />}>
          Suggest
        </Button>
        <ResultBlock result={result} />
      </CardContent>
    </Card>
  );
}

function WellnessTipsCard() {
  const [topic, setTopic] = useState('');
  const [clientName, setClientName] = useState('');
  const [season, setSeason] = useState('');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const onSubmit = async () => {
    if (!topic) return;
    setLoading(true); setResult(null);
    const body: any = { topic, language };
    if (clientName) body.clientName = clientName;
    if (season) body.season = season;
    setResult(await postJSON('/api/ai/wellness-tips', body));
    setLoading(false);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Spa color="primary" />
          <Typography variant="h6">Wellness Tips</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}><TextField label="Topic *" fullWidth size="small" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. caring for gel manicure between visits" /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Client name" fullWidth size="small" value={clientName} onChange={(e) => setClientName(e.target.value)} /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Season" fullWidth size="small" value={season} onChange={(e) => setSeason(e.target.value)} /></Grid>
          <Grid size={{ xs: 6 }}><TextField label="Language" fullWidth size="small" value={language} onChange={(e) => setLanguage(e.target.value)} /></Grid>
        </Grid>
        <Button variant="contained" sx={{ mt: 2 }} onClick={onSubmit} disabled={loading || !topic} startIcon={loading ? <CircularProgress size={18} /> : <Spa />}>
          Generate
        </Button>
        <ResultBlock result={result} />
      </CardContent>
    </Card>
  );
}

export default function AIExtras2Page() {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <AutoAwesome sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">More AI Tools (Pass 5)</Typography>
          <Typography variant="body2" color="text.secondary">
            Retention forecasting, ethical upsell suggestions, post-visit wellness tips
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}><RetentionForecastCard /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><UpsellSuggesterCard /></Grid>
        <Grid size={{ xs: 12 }}><WellnessTipsCard /></Grid>
      </Grid>
    </Box>
  );
}
