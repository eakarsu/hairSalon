'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  Store,
  Person,
  Notifications,
  Loyalty,
  Save,
} from '@mui/icons-material';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [selectedTab, setSelectedTab] = useState(0);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { label: 'Salon', icon: <Store /> },
    { label: 'Profile', icon: <Person /> },
    { label: 'Notifications', icon: <Notifications /> },
    { label: 'Loyalty', icon: <Loyalty /> },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} sx={{ mb: 3 }}>
        Settings
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Tabs
              orientation="vertical"
              value={selectedTab}
              onChange={(_, v) => setSelectedTab(v)}
              sx={{
                '& .MuiTab-root': {
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  pl: 2,
                },
              }}
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={tab.label}
                  icon={tab.icon}
                  iconPosition="start"
                  label={tab.label}
                  sx={{ justifyContent: 'flex-start' }}
                />
              ))}
            </Tabs>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 9 }}>
          <Paper sx={{ p: 3 }}>
            {selectedTab === 0 && (
              /* Salon Settings */
              <Box>
                <Typography variant="h6" gutterBottom>
                  Salon Information
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      label="Salon Name"
                      fullWidth
                      defaultValue="Elegant Nails & Spa"
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      label="Address"
                      fullWidth
                      defaultValue="123 Main Street, Suite 100, San Jose, CA 95112"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Phone"
                      fullWidth
                      defaultValue="(408) 555-0123"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Email"
                      fullWidth
                      defaultValue="info@elegantnails.com"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Timezone</InputLabel>
                      <Select label="Timezone" defaultValue="America/Los_Angeles">
                        <MenuItem value="America/New_York">Eastern Time</MenuItem>
                        <MenuItem value="America/Chicago">Central Time</MenuItem>
                        <MenuItem value="America/Denver">Mountain Time</MenuItem>
                        <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Primary Language</InputLabel>
                      <Select label="Primary Language" defaultValue="en">
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="vi">Vietnamese</MenuItem>
                        <MenuItem value="es">Spanish</MenuItem>
                        <MenuItem value="zh">Chinese</MenuItem>
                        <MenuItem value="ko">Korean</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Typography variant="h6" sx={{ mt: 4 }} gutterBottom>
                  Business Hours
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <Grid size={12} key={day}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography sx={{ width: 100 }}>{day}</Typography>
                        <TextField
                          type="time"
                          size="small"
                          defaultValue={day === 'Sunday' ? '10:00' : '09:00'}
                        />
                        <Typography>to</Typography>
                        <TextField
                          type="time"
                          size="small"
                          defaultValue={day === 'Sunday' ? '17:00' : day === 'Saturday' ? '18:00' : '19:00'}
                        />
                        <FormControlLabel
                          control={<Switch defaultChecked={day !== 'Sunday'} />}
                          label="Open"
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {selectedTab === 1 && (
              /* Profile Settings */
              <Box>
                <Typography variant="h6" gutterBottom>
                  Profile Settings
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Full Name"
                      fullWidth
                      defaultValue={session?.user?.name || ''}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Email"
                      fullWidth
                      defaultValue={session?.user?.email || ''}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Phone"
                      fullWidth
                      defaultValue=""
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Preferred Language</InputLabel>
                      <Select
                        label="Preferred Language"
                        defaultValue={session?.user?.preferredLanguage || 'en'}
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="vi">Vietnamese</MenuItem>
                        <MenuItem value="es">Spanish</MenuItem>
                        <MenuItem value="zh">Chinese</MenuItem>
                        <MenuItem value="ko">Korean</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Typography variant="h6" sx={{ mt: 4 }} gutterBottom>
                  Change Password
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      label="Current Password"
                      type="password"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="New Password"
                      type="password"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Confirm New Password"
                      type="password"
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {selectedTab === 2 && (
              /* Notification Settings */
              <Box>
                <Typography variant="h6" gutterBottom>
                  Notification Preferences
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={500}>
                      Appointment Reminders
                    </Typography>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Send 24-hour reminder"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Send 2-hour reminder"
                    />
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={500}>
                      No-Show Follow-up
                    </Typography>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Auto-send recovery message"
                    />
                    <TextField
                      label="Wait time before sending (hours)"
                      type="number"
                      size="small"
                      defaultValue={2}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={500}>
                      Review Requests
                    </Typography>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Request reviews after completed appointments"
                    />
                    <FormControl size="small" sx={{ mt: 1, minWidth: 200 }}>
                      <InputLabel>Preferred Platform</InputLabel>
                      <Select label="Preferred Platform" defaultValue="Google">
                        <MenuItem value="Google">Google</MenuItem>
                        <MenuItem value="Yelp">Yelp</MenuItem>
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={500}>
                      Staff Notifications
                    </Typography>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="New appointment notifications"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Cancellation notifications"
                    />
                    <FormControlLabel
                      control={<Switch />}
                      label="Daily schedule summary"
                    />
                  </CardContent>
                </Card>
              </Box>
            )}

            {selectedTab === 3 && (
              /* Loyalty Settings */
              <Box>
                <Typography variant="h6" gutterBottom>
                  Loyalty Program Configuration
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={500}>
                      Points Earning
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Points per $1 spent"
                          type="number"
                          fullWidth
                          defaultValue={1}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Bonus points for referral"
                          type="number"
                          fullWidth
                          defaultValue={100}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={500}>
                      Tier Thresholds
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <TextField
                          label="Bronze (min)"
                          type="number"
                          fullWidth
                          defaultValue={0}
                          disabled
                        />
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <TextField
                          label="Silver (min)"
                          type="number"
                          fullWidth
                          defaultValue={500}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <TextField
                          label="Gold (min)"
                          type="number"
                          fullWidth
                          defaultValue={1000}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <TextField
                          label="Platinum (min)"
                          type="number"
                          fullWidth
                          defaultValue={2000}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={500}>
                      Redemption
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Points for $10 discount"
                          type="number"
                          fullWidth
                          defaultValue={100}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Minimum points to redeem"
                          type="number"
                          fullWidth
                          defaultValue={50}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                Save Settings
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
