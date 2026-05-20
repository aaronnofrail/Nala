const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Konfigurasi Middleware
app.use(cors());
app.use(express.json());

// Rute GET Utama (Harus aman tanpa memanggil SDK)
app.get('/', (req, res) => {
  res.status(200).send('API Nala AI Backend Berjalan Mulus! 🌿');
});

// Rute POST Chat
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY belum dikonfigurasi di Environment Variables Vercel." });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Menggunakan model produksi yang stabil
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview", 
      systemInstruction: req.body.systemPrompt || "Kamu adalah Nala, AI yang empatik."
    });

    // Validasi format messages dari frontend
    if (!req.body.messages || !Array.isArray(req.body.messages)) {
      return res.status(400).json({ error: "Format body 'messages' tidak valid." });
    }

    const geminiMessages = req.body.messages.map(msg => ({
      role: (msg.role === 'ai' || msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user',
      parts: [{ text: msg.content || "" }]
    }));

    const result = await model.generateContent({
      contents: geminiMessages
    });

    const aiResponseText = result.response.text();
    res.status(200).json({ reply: aiResponseText });

  } catch (error) {
    console.error('Error saat memproses chat:', error.message);
    res.status(500).json({ error: "Gemini gagal merespons: " + error.message });
  }
});

// Mengatasi rute 404
app.use((req, res) => {
  res.status(404).json({ error: "Rute tidak ditemukan." });
});

// Jalankan server lokal jika bukan di environment Vercel/Production
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`✅ Server lokal aktif di port ${PORT}`));
}

module.exports = app;