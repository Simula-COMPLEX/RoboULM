/**
 * server.js
 * ---------
 * Main backend entry point for RoboULM.
 *
 * Responsibilities:
 * - Initialize Express server and middleware
 * - Serve React frontend build for study deployment
 * - Provide API endpoints for:
 *   • LLM chat interaction
 *   • File parsing (PDF/Word)
 *   • Consent storage
 *   • Study data logging (setup, queries, refinements)
 * - Configure Gemini/OpenAI-compatible client
 */
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require("fs");
const path = require("path");
const fileParser = require("./utils/FileParser");


const os = require("os");

/**
 * Detects the first non-internal IPv4 address of the host machine.
 * Used to display a network-accessible URL when the server starts.
 */
function getNetworkIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}


// Load environment variables from .env file
dotenv.config();

// Initialize Express application
const app = express();

// Enable CORS to allow frontend access from different origins
app.use(cors());

// Parse incoming JSON requests (extended size for large prompts/files)
app.use(express.json());
app.use(express.json({ limit: "20mb" }));

// File parsing routes (PDF / Word document extraction)
app.use("/api", fileParser);

app.use(express.static(path.join(__dirname, "..", "frontend", "build")));

const setupLogger = require("./routes/setupLogger");
app.use("/api", setupLogger);

const logQueryRoute = require("./routes/logQuery");
app.use("/api", logQueryRoute);

const logRefinementRoute = require("./routes/logRefinement");
app.use("/api", logRefinementRoute);
/**
 * Initialize OpenAI-compatible client.
 * Uses Gemini API via OpenAI-compatible endpoint.
 * API key is read from environment variables.
 */
const PORT = process.env.PORT || 5001;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY, 
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "build", "index.html"));
});
/**
 * Stores signed informed consent as a PDF on the server.
 * Expects:
 * - filename: target PDF name
 * - pdfBase64: base64-encoded PDF content
 */
app.post("/api/save-consent", (req, res) => {
  try {
    const { filename, pdfBase64 } = req.body;

    if (!filename || !pdfBase64) {
      return res.status(400).json({ error: "Missing data" });
    }

    const folderPath = path.join(__dirname, "SignedConsent");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    const filePath = path.join(folderPath, filename);
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    fs.writeFileSync(filePath, base64Data, "base64");

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Health-check route to verify backend availability
app.get('/', (req, res) => {
  res.send({ message: 'Backend is working!' });
});

/**
 * Main chat endpoint.
 * Receives a constructed prompt from frontend,
 * sends it to the LLM (Gemini),
 * and returns the generated response.
 */
app.post('/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Send prompt to LLM using OpenAI-compatible chat completion API
    const completion = await openai.chat.completions.create({
model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ]
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error in /chat:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


// Start server on all network interfaces for LAN accessibility
app.listen(PORT, "0.0.0.0", () => {
  const ip = getNetworkIP();
  console.log(`✅ Server running on http://${ip}:${PORT}`);
});