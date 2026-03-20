const express = require('express');
const cors = require('cors');
require('dotenv').config();

const supabase = require('./supabaseClient');

const app = express();

app.use(cors());
app.use(express.json());

const supabaseAdmin = require('./supabaseAdmin');

app.get('/api/health', (req, res) => {
  res.json({ message: 'server is running' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, full_name, role',
      });
    }
    if (!['FARMER', 'VENDOR'].includes(role)) {
      return res.status(400).json({ error: 'Role must be FARMER or VENDOR' });
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      return res.status(400).json({ error: signUpError.message });
    }

    const user = authData?.user;
    if (!user) {
      return res.status(500).json({ error: 'Sign up succeeded but no user returned.' });
    }

    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: user.id,
          full_name: full_name,
          email,
          role,
        },
      ]);

    if (insertError) {
      return res.status(500).json({
        error: 'Account created but failed to save profile. Please contact support.',
        details: insertError.message,
      });
    }

    res.status(201).json({ message: 'Registration successful', user_id: user.id });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

