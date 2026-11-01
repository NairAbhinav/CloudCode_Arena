require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { executeCode, executePython, getPythonCmd } = require('./executor');

const app = express();
const PORT = process.env.CODE_RUNNER_PORT || 5005;

app.use(cors());
app.use(express.json({ limit: '512kb' }));
app.use(morgan('combined'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'code-runner',
    supportedLanguages: ['python', 'c', 'cpp', 'java', 'javascript'],
    pythonCmd: getPythonCmd(),
    timestamp: new Date().toISOString()
  });
});

app.post('/execute', async (req, res) => {
  try {
    const { code, input, timeoutMs, language } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: code'
      });
    }

    const result = await executeCode(code, input, timeoutMs, language || 'python');
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('[Code Runner] Execution error:', err);
    res.status(500).json({
      success: false,
      status: 'Internal Error',
      error: err.message
    });
  }
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Code Runner Service] Listening on port ${PORT}`);
  });
}

module.exports = app;
