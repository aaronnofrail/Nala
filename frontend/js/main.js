let currentPage = 'home';
function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + name).classList.add('active');
    const btn = document.getElementById('nav-' + name);
    if (btn) btn.classList.add('active');
    currentPage = name;
    window.scrollTo(0, 0);
    if (name === 'mood') renderMoodChart();
    if (name === 'edu') renderArticles();
}

function toggleMobileMenu() {
    const m = document.getElementById('mobileMenu');
    m.classList.toggle('open');
}

// INIT TIME 
document.getElementById('initTime').textContent = formatTime(new Date());
function formatTime(d) {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// NALA AI CHAT
let chatHistory = [];
let isAITyping = false;
let recognition = null;

async function sendMessage() {
    if (isAITyping) return;
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    appendMsg('user', msg);
    chatHistory.push({ role: 'user', content: msg });
    await getAIResponse();
}

function appendMsg(role, text) {
    const wrap = document.getElementById('chatMessages');
    const row = document.createElement('div');
    row.className = 'msg-row ' + (role === 'user' ? 'user' : 'ai');
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? 'K' : 'N';
    const msgWrap = document.createElement('div');
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = text;
    const timeEl = document.createElement('div');
    timeEl.className = 'msg-time';
    timeEl.textContent = formatTime(new Date());
    msgWrap.appendChild(bubble);
    msgWrap.appendChild(timeEl);
    row.appendChild(avatar);
    row.appendChild(msgWrap);
    wrap.appendChild(row);
    wrap.scrollTop = wrap.scrollHeight;
}

function showTyping() {
    const wrap = document.getElementById('chatMessages');
    const row = document.createElement('div');
    row.className = 'msg-row ai';
    row.id = 'typingIndicator';
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = 'N';
    const ind = document.createElement('div');
    ind.className = 'typing-indicator';
    ind.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    row.appendChild(avatar);
    row.appendChild(ind);
    wrap.appendChild(row);
    wrap.scrollTop = wrap.scrollHeight;
}

function removeTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

async function getAIResponse() {
    isAITyping = true;
    document.getElementById('sendBtn').disabled = true;
    showTyping();

    const systemPrompt = `Kamu adalah Nala, AI teman kesehatan mental yang empatik... (pastikan prompt kamu lengkap di sini)`;

    try {
        const response = await fetch('https://nala-be.vercel.app/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemPrompt: systemPrompt,
                messages: chatHistory
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Terjadi kesalahan di server');
        }

        const aiMsg = data.reply ? data.reply : 'Maaf, aku tidak bisa merespons saat ini. Coba lagi ya 💚';

        removeTyping();
        appendMsg('ai', aiMsg);
        chatHistory.push({ role: 'model', content: aiMsg });

    } catch (err) {
        console.error('Error dari frontend:', err.message);
        removeTyping();
        appendMsg('ai', 'Maaf, ada gangguan koneksi. Pastikan server lokalmu berjalan dan coba lagi 💚');
    }

    isAITyping = false;
    document.getElementById('sendBtn').disabled = false;
}

// Voice input
// Voice input dengan sistem deteksi error
function toggleVoice() {
    const btn = document.getElementById('micBtn');

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('Browser tidak mendukung input suara');
        return;
    }

    if (recognition && btn.classList.contains('recording')) {
        recognition.stop();
        btn.classList.remove('recording');
        return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'id-ID'; // Menggunakan bahasa Indonesia
    recognition.interimResults = false;

    // 1. Menangkap dan menampilkan error secara spesifik
    recognition.onerror = (event) => {
        console.error("❌ Mic terhenti karena error:", event.error);
        if (event.error === 'not-allowed') {
            showToast("Akses mic ditolak browser/sistem!");
        } else if (event.error === 'no-speech') {
            showToast("Suara tidak terdengar, coba lagi.");
        } else {
            showToast("Mic error: " + event.error);
        }
        btn.classList.remove('recording');
    };

    // 2. Menangkap hasil suara
    recognition.onresult = (e) => {
        document.getElementById('chatInput').value = e.results[0][0].transcript;
        btn.classList.remove('recording');
    };

    // 3. Menangkap saat mic otomatis mati
    recognition.onend = () => {
        console.log("ℹ️ Sesi mikrofon berakhir.");
        btn.classList.remove('recording');
    };

    try {
        recognition.start();
        btn.classList.add('recording');
    } catch (err) {
        console.error("❌ Gagal memulai mikrofon:", err);
    }
}

// MOOD TRACKER 
let moodData = JSON.parse(localStorage.getItem('nala_moods') || '[]');
let moodChart = null;

const moodValues = { 'Sangat Senang': 5, 'Senang': 4, 'Netral': 3, 'Sedih': 2, 'Cemas': 2, 'Marah': 1, 'Lelah': 2 };
const moodEmojis = { 'Sangat Senang': '😄', 'Senang': '🙂', 'Netral': '😐', 'Sedih': '😔', 'Cemas': '😰', 'Marah': '😠', 'Lelah': '😴' };

function saveMood() {
    const mood = document.getElementById('moodSelect').value;
    const note = document.getElementById('moodNote').value.trim();
    if (!mood) { showToast('Pilih suasana hati dulu ya!'); return; }
    const entry = { date: new Date().toLocaleDateString('id-ID'), mood, note, ts: Date.now() };
    moodData.unshift(entry);
    localStorage.setItem('nala_moods', JSON.stringify(moodData));
    document.getElementById('moodSelect').value = '';
    document.getElementById('moodNote').value = '';
    renderMoodHistory();
    renderMoodChart();
    showToast('Mood berhasil disimpan! 💚');
}

function deleteMood(idx) {
    moodData.splice(idx, 1);
    localStorage.setItem('nala_moods', JSON.stringify(moodData));
    renderMoodHistory();
    renderMoodChart();
}

function renderMoodHistory() {
    const el = document.getElementById('moodHistory');
    if (!moodData.length) {
        el.innerHTML = '<div class="mood-empty">Belum ada data mood. Mulai catat hari ini!</div>';
        return;
    }
    el.innerHTML = moodData.map((d, i) => `
    <div class="mood-history-item">
      <span><span class="mood-emoji">${moodEmojis[d.mood] || ''}</span>${d.date} – ${d.mood}${d.note ? ' : ' + d.note : ''}</span>
      <button class="mood-delete" onclick="deleteMood(${i})" title="Hapus">✕</button>
    </div>
  `).join('');
}

function renderMoodChart() {
    renderMoodHistory();
    const ctx = document.getElementById('moodChart').getContext('2d');
    const sorted = [...moodData].reverse().slice(-10);
    if (moodChart) moodChart.destroy();
    if (!sorted.length) {
        moodChart = new Chart(ctx, { type: 'line', data: { labels: [], datasets: [{ data: [] }] }, options: { plugins: { legend: { display: false } } } });
        return;
    }
    const labels = sorted.map(d => d.date);
    const values = sorted.map(d => moodValues[d.mood] || 3);
    moodChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: values,
                borderColor: '#5a9e6a',
                backgroundColor: 'rgba(90,158,106,0.08)',
                borderWidth: 2.5,
                pointBackgroundColor: '#3a7d44',
                pointRadius: 5,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 5, ticks: { stepSize: 1, color: '#7a9c80' }, grid: { color: '#eef7f0' } },
                x: { ticks: { color: '#7a9c80', maxRotation: 30 }, grid: { display: false } }
            }
        }
    });
}

// RELAXATION
let breathRunning = false;
let breathTimer = null;
let breathSessions = 0;
const breathPhases = [
    { label: 'Tarik Napas...', dur: 4000, class: 'breathing-in' },
    { label: 'Tahan...', dur: 4000, class: 'breathing-hold' },
    { label: 'Hembuskan...', dur: 4000, class: 'breathing-out' },
    { label: 'Istirahat...', dur: 2000, class: '' }
];
let breathPhaseIdx = 0;

function toggleBreath() {
    if (breathRunning) {
        breathRunning = false;
        clearTimeout(breathTimer);
        document.getElementById('breathBtn').textContent = 'Mulai';
        document.getElementById('breathLabel').textContent = 'Siap memulai...';
        const c = document.getElementById('breathCircle');
        c.className = 'breath-circle-outer';
        return;
    }
    breathRunning = true;
    breathPhaseIdx = 0;
    document.getElementById('breathBtn').textContent = 'Berhenti';
    runBreathPhase();
}

function runBreathPhase() {
    if (!breathRunning) return;
    const phase = breathPhases[breathPhaseIdx];
    document.getElementById('breathLabel').textContent = phase.label;
    const c = document.getElementById('breathCircle');
    c.className = 'breath-circle-outer';
    void c.offsetWidth;
    if (phase.class) c.className = 'breath-circle-outer ' + phase.class;
    breathTimer = setTimeout(() => {
        breathPhaseIdx = (breathPhaseIdx + 1) % breathPhases.length;
        if (breathPhaseIdx === 0) {
            breathSessions++;
            document.getElementById('breathCounter').textContent = 'Sesi: ' + breathSessions;
        }
        runBreathPhase();
    }, phase.dur);
}

const affirmations = [
    '"Hari ini aku memilih untuk tenang dan bersyukur."',
    '"Aku cukup. Aku berharga. Aku layak dicintai."',
    '"Setiap napas membawa ketenangan ke dalam diriku."',
    '"Aku punya kekuatan untuk melewati hari ini."',
    '"Perasaanku valid dan aku boleh merasa seperti ini."',
    '"Aku memilih untuk fokus pada hal-hal baik hari ini."',
    '"Aku tumbuh lebih kuat setiap harinya."',
    '"Kedamaian ada di dalam diriku, bukan di luar sana."',
    '"Aku berhak untuk istirahat dan memulihkan diri."',
    '"Aku percaya pada perjalananku sendiri."'
];

function newAffirmation() {
    const el = document.getElementById('affirmText');
    el.style.opacity = '0';
    setTimeout(() => {
        el.textContent = affirmations[Math.floor(Math.random() * affirmations.length)];
        el.style.opacity = '1';
    }, 300);
}

// ===== AUDIO PLAYER (MP3) =====
let currentAudio = null;
let ambientPlaying = false;
let isMuted = false;
let currentBtn = null;

function formatTimeAudio(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}
function stopAmbient(btn) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    document.querySelectorAll('.ambient-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.remove('active');

    document.getElementById('playIcon').style.display = 'block';
    document.getElementById('pauseIcon').style.display = 'none';
    ambientPlaying = false;
}

function playAmbient(btn) {
    stopAmbient(null);
    btn.classList.add('active');
    currentBtn = btn;

    const fileUrl = btn.dataset.file;
    // 1. Bikin wadah audionya dulu (jangan masukkan URL-nya dulu)
    currentAudio = new Audio();
    currentAudio.loop = true;
    currentAudio.volume = isMuted ? 0 : 1.0;

    // 2. Pasang alat pendengar metadata & waktu SEBELUM audio dimuat
    currentAudio.addEventListener('loadedmetadata', () => {
        const timeLabel = document.getElementById('audioTimeLabel');
        if (timeLabel) {
            timeLabel.textContent = `0:00 / ${formatTimeAudio(currentAudio.duration)}`;
        }
    });

    currentAudio.addEventListener('timeupdate', () => {
        const currentTime = currentAudio.currentTime;
        const duration = currentAudio.duration;

        const timeLabel = document.getElementById('audioTimeLabel');
        if (timeLabel) {
            timeLabel.textContent = `${formatTimeAudio(currentTime)} / ${formatTimeAudio(duration)}`;
        }

        const progressBar = document.getElementById('audioProgress');
        if (progressBar && duration) {
            progressBar.value = (currentTime / duration) * 100;
        }
    });

    // 3. BARU kita masukkan URL file-nya agar browser mulai memuat
    currentAudio.src = fileUrl;

    // 4. Mainkan!
    currentAudio.play().then(() => {
        ambientPlaying = true;
        document.getElementById('playIcon').style.display = 'none';
        document.getElementById('pauseIcon').style.display = 'block';
    }).catch(err => {
        console.error("Gagal memutar audio:", err);
        showToast("Gagal memutar audio. Cek Console untuk detailnya.");
    });
}

function toggleAmbientPlay() {
    if (!currentAudio && !currentBtn) {
        showToast('Pilih jenis suara dulu ya!');
        return;
    }

    if (ambientPlaying) {
        currentAudio.pause();
        ambientPlaying = false;
        document.getElementById('playIcon').style.display = 'block';
        document.getElementById('pauseIcon').style.display = 'none';
    } else {
        if (!currentAudio && currentBtn) {
            playAmbient(currentBtn);
        } else {
            currentAudio.play();
            ambientPlaying = true;
            document.getElementById('playIcon').style.display = 'none';
            document.getElementById('pauseIcon').style.display = 'block';
        }
    }
}

function setAmbientVol(val) {
    if (currentAudio) {
        currentAudio.volume = val / 100;
    }
}

function toggleMute() {
    isMuted = !isMuted;
    document.getElementById('volIcon').textContent = isMuted ? '🔇' : '🔊';
    if (currentAudio) {
        currentAudio.muted = isMuted;
    }
}

// ===== KONTROL SLIDER UNTUK SKIP AUDIO =====
const progressBar = document.getElementById('audioProgress');

if (progressBar) {
    progressBar.addEventListener('input', (e) => {
        // Cek apakah ada audio yang sedang dimainkan dan punya durasi
        if (currentAudio && currentAudio.duration) {
            // Hitung detik ke berapa berdasarkan persentase tarikan slider
            const seekTime = (e.target.value / 100) * currentAudio.duration;
            // Ubah posisi waktu audio ke detik tersebut
            currentAudio.currentTime = seekTime;
        }
    });
}

// ===== MENTAL EDU =====
const articles = [
    {
        title: 'Bagaimana Pikiran Negatif Terbentuk',
        preview: 'Pikiran negatif sering kali muncul sebagai respon otomatis dari stres. Dengan mengenali pola pikir ini, kita bisa menggantinya dengan sudut pandang yang lebih sehat.',
        full: `<p>Pikiran negatif adalah bagian normal dari pengalaman manusia, namun ketika menjadi pola yang dominan, dapat memengaruhi kesehatan mental secara signifikan.</p>
<p>Menurut penelitian psikologi kognitif, pikiran negatif sering muncul sebagai "distorsi kognitif" — cara otak menyederhanakan realita secara tidak akurat. Beberapa contoh umum: all-or-nothing thinking (hitam-putih), catastrophizing (membayangkan skenario terburuk), dan mind reading (menebak pikiran orang lain).</p>
<p>Cara mengatasinya:</p>
<p>1. <strong>Kenali polanya</strong> — Ketika pikiran negatif muncul, tanyakan: "Apakah ini fakta atau asumsi?"</p>
<p>2. <strong>Tantang pikiran tersebut</strong> — Cari bukti yang bertentangan dengan pikiran negatifmu.</p>
<p>3. <strong>Ganti dengan perspektif yang lebih realistis</strong> — Bukan selalu positif, tapi seimbang dan akurat.</p>
<p>Latihan journaling dan mindfulness terbukti efektif membantu mengenali dan mengubah pola pikir negatif.</p>`
    },
    {
        title: 'Dampak Tidur terhadap Kesehatan Mental',
        preview: 'Tidur yang cukup membantu menstabilkan suasana hati dan menurunkan risiko kecemasan. Prioritaskan pola tidur yang teratur untuk menjaga keseimbangan mental.',
        full: `<p>Hubungan antara tidur dan kesehatan mental bersifat dua arah: masalah mental dapat mengganggu tidur, dan kurang tidur dapat memperburuk kondisi mental.</p>
<p>Penelitian menunjukkan bahwa orang yang tidur kurang dari 6 jam per malam memiliki risiko lebih tinggi mengalami depresi dan kecemasan. Selama tidur, otak memproses emosi dan membuang racun metabolik.</p>
<p><strong>Tips tidur yang lebih baik:</strong></p>
<p>• Tidur dan bangun di waktu yang sama setiap hari, termasuk akhir pekan.</p>
<p>• Hindari layar elektronik minimal 30 menit sebelum tidur.</p>
<p>• Jaga kamar tetap gelap, sejuk, dan tenang.</p>
<p>• Hindari kafein setelah pukul 14.00.</p>
<p>• Coba teknik relaksasi seperti deep breathing atau progressive muscle relaxation sebelum tidur.</p>`
    },
    {
        title: 'Mengelola Kecemasan Sehari-hari',
        preview: 'Kecemasan adalah respons normal, namun bisa dikelola dengan strategi yang tepat. Pelajari teknik sederhana yang bisa kamu praktekan kapan saja.',
        full: `<p>Kecemasan adalah respons alami tubuh terhadap ancaman atau ketidakpastian. Namun ketika menjadi berlebihan, dapat mengganggu kualitas hidup.</p>
<p><strong>Teknik 5-4-3-2-1 (Grounding):</strong></p>
<p>Saat cemas melanda, fokus pada: 5 hal yang bisa kamu lihat, 4 hal yang bisa kamu sentuh, 3 hal yang bisa kamu dengar, 2 hal yang bisa kamu cium, 1 hal yang bisa kamu rasakan.</p>
<p><strong>Box Breathing:</strong> Tarik napas 4 hitungan → tahan 4 hitungan → hembuskan 4 hitungan → tahan 4 hitungan. Ulangi 4-6 kali.</p>
<p><strong>Journaling:</strong> Tuliskan apa yang kamu cemaskan dan tanyakan pada dirimu: "Seberapa mungkin ini terjadi? Apa yang bisa aku lakukan jika ini terjadi?"</p>`
    },
    {
        title: 'Pentingnya Koneksi Sosial untuk Kesehatan Mental',
        preview: 'Manusia adalah makhluk sosial. Hubungan yang sehat dengan orang lain adalah salah satu fondasi utama kesehatan mental yang baik.',
        full: `<p>Penelitian konsisten menunjukkan bahwa orang dengan hubungan sosial yang kuat memiliki kesehatan mental yang lebih baik, umur yang lebih panjang, dan pemulihan dari penyakit yang lebih cepat.</p>
<p>Kesepian kronis terbukti sama berbahayanya dengan merokok 15 batang per hari bagi kesehatan fisik dan mental.</p>
<p><strong>Cara membangun koneksi sosial yang sehat:</strong></p>
<p>• Luangkan waktu berkualitas bersama orang-orang yang kamu sayangi, bukan hanya secara kuantitas.</p>
<p>• Jadilah pendengar yang baik — fokus pada lawan bicara tanpa menghakimi.</p>
<p>• Bergabung dengan komunitas atau grup yang memiliki minat serupa.</p>
<p>• Jangan ragu meminta bantuan ketika kamu membutuhkannya.</p>
<p>• Ekspresikan rasa terima kasih dan apresiasi kepada orang-orang di sekitarmu.</p>`
    }
];

function renderArticles() {
    const grid = document.getElementById('articlesGrid');
    grid.innerHTML = articles.map((a, i) => `
    <div class="article-card" onclick="openArticle(${i})">
      <h3>${a.title}</h3>
      <p>${a.preview}</p>
      <span class="article-link">Baca Selengkapnya →</span>
    </div>
  `).join('');
}

function openArticle(idx) {
    const a = articles[idx];
    const modal = document.getElementById('articleModal');
    modal.style.display = 'flex';
    modal.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal-box">
        <button class="modal-close" onclick="closeModal()">✕</button>
        <h2 class="modal-title">${a.title}</h2>
        <div class="modal-body">${a.full}</div>
      </div>
    </div>
  `;
}

function closeModal() {
    document.getElementById('articleModal').style.display = 'none';
}

const dailyTips = [
    'Luangkan 5 menit untuk bernapas dalam-dalam dan fokus pada momen sekarang.',
    'Tulis 3 hal yang kamu syukuri hari ini, sekecil apapun itu.',
    'Lakukan satu kebaikan kecil untuk orang lain — ini juga menyehatkan dirimu sendiri.',
    'Matikan notifikasi selama 30 menit dan nikmati waktu tanpa gangguan.',
    'Minum air putih yang cukup — hidrasi memengaruhi suasana hati dan konsentrasi.',
    'Berjalan kaki 10-15 menit di luar ruangan untuk meningkatkan mood secara alami.',
    'Hubungi seseorang yang sudah lama tidak kamu sapa — koneksi sosial sangat penting.',
    'Rapikan satu sudut ruanganmu — lingkungan yang bersih memengaruhi kejernihan pikiran.',
    'Dengarkan musik yang membuatmu merasa baik selama beberapa menit.',
    'Istirahat dari media sosial selama setengah hari dan perhatikan perubahannya.'
];

function newDailyTip() {
    const el = document.getElementById('dailyTipText');
    el.style.opacity = '0';
    setTimeout(() => {
        el.textContent = dailyTips[Math.floor(Math.random() * dailyTips.length)];
        el.style.opacity = '1';
    }, 300);
}

// Activities
let activities = JSON.parse(localStorage.getItem('nala_activities') || 'null') || [
    { text: 'Jalan kaki santai di luar ruangan 🌿', done: false },
    { text: 'Menulis 3 hal yang kamu syukuri hari ini ✍️', done: false },
    { text: 'Mendengarkan musik yang membuatmu tenang 🎵', done: false },
    { text: 'Mendengarkan podcast inspiratif 🎧', done: false }
];

function saveActivities() { localStorage.setItem('nala_activities', JSON.stringify(activities)); }

function renderActivities() {
    const el = document.getElementById('activitiesList');
    el.innerHTML = activities.map((a, i) => `
    <div class="activity-item">
      <div class="activity-check ${a.done ? 'checked' : ''}" onclick="toggleActivity(${i})"></div>
      <span class="activity-text ${a.done ? 'done' : ''}">${a.text}</span>
      <button class="mood-delete" onclick="removeActivity(${i})" title="Hapus" style="margin-left:auto">✕</button>
    </div>
  `).join('') || '<div class="mood-empty">Tambahkan aktivitas positifmu!</div>';
}

function toggleActivity(idx) {
    activities[idx].done = !activities[idx].done;
    saveActivities(); renderActivities();
}

function removeActivity(idx) {
    activities.splice(idx, 1);
    saveActivities(); renderActivities();
}

function addActivity() {
    const input = document.getElementById('newActivityInput');
    const text = input.value.trim();
    if (!text) return;
    activities.push({ text, done: false });
    saveActivities(); renderActivities();
    input.value = '';
}

// ===== TOAST =====
function showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3100);
}

// ===== INIT =====
renderMoodHistory();
renderActivities();
renderArticles();