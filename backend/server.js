const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/', (req, res) => {
    res.send('API Nala AI Backend Berjalan Mulus! 🌿');
});

app.post('/api/chat', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            systemInstruction: req.body.systemPrompt
        });

        // Menerjemahkan riwayat chat Nala agar sesuai dengan skema Gemini SDK
        const geminiMessages = req.body.messages.map(msg => ({
            role: (msg.role === 'ai' || msg.role === 'assistant') ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // Generate balasan AI
        const result = await model.generateContent({
            contents: geminiMessages
        });

        const aiResponseText = result.response.text();
        res.json({ reply: aiResponseText });

    } catch (error) {
        console.error('❌ Error dari Gemini SDK:', error.message);
        res.status(500).json({ error: 'Gagal menghubungi AI' });
    }
});

module.exports = app;