const API_BASE = '/api';

// --- Functions ---

async function fetchHome() {
    try {
        const res = await fetch(`${API_BASE}/home`);
        const data = await res.json();
        if (data.success) {
            renderHero(data.results[0]);
            renderGrid(data.results, 'movieGrid');
        }
    } catch (error) {
        console.error("Error fetching home:", error);
    }
}

async function searchMovies(query) {
    const grid = document.getElementById('movieGrid');
    grid.innerHTML = '<div class="loader">Mencari...</div>';
    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('heroSection').innerHTML = ''; // Hide hero on search
            renderGrid(data.results, 'movieGrid');
        }
    } catch (error) {
        console.error(error);
    }
}

async function loadDetail(url) {
    try {
        const res = await fetch(`${API_BASE}/detail?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        if(data.success) {
            const detail = data.detail;
            
            // Render Player
            const playerContainer = document.getElementById('playerContainer');
            // Catatan: Karena scraper tidak mendapatkan direct link MP4, kita gunakan Trailer atau Placeholder
            // Jika Anda punya logika decode server, masukkan di sini.
            let videoSource = detail.trailerUrl;
            if(videoSource && videoSource.includes('youtube')) {
                const videoId = videoSource.split('v=')[1] || videoSource.split('/').pop();
                videoSource = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            }

            playerContainer.innerHTML = `
                <iframe src="${videoSource || ''}" allowfullscreen allow="autoplay"></iframe>
            `;

            // Render Info
            const infoHtml = `
                <h1 style="font-size: 1.8rem; margin-bottom: 10px;">${detail.title}</h1>
                <div class="card-meta" style="justify-content: flex-start; gap: 15px; margin-bottom: 20px;">
                    <span class="quality-tag">${detail.metadata.quality || 'HD'}</span>
                    <span><i class="ri-star-fill" style="color:yellow"></i> ${detail.metadata.rating || 'N/A'}</span>
                    <span>${detail.metadata.duration || ''}</span>
                    <span>${detail.metadata.year || ''}</span>
                </div>
                <p style="color: var(--text-muted); line-height: 1.6;">${detail.description}</p>
                
                <div style="margin-top: 20px;">
                    <strong>Genre:</strong> ${detail.metadata.genres ? detail.metadata.genres.join(', ') : '-'}
                </div>

                <div class="server-list">
                    ${detail.servers.map((s, i) => `<div class="server-btn ${i===0?'active':''}">${s.name}</div>`).join('')}
                </div>
            `;
            document.getElementById('movieDetails').innerHTML = infoHtml;

            // Render Related/Episodes
            renderGrid(detail.relatedMovies, 'relatedGrid');
        }
    } catch (error) {
        console.error(error);
    }
}

// --- Render Helpers ---

function renderHero(movie) {
    const hero = document.getElementById('heroSection');
    if(!hero || !movie) return;

    hero.innerHTML = `
        <div class="hero" style="background-image: url('${movie.thumbnail}')">
            <div class="hero-content">
                <span class="quality-tag" style="margin-bottom:10px; display:inline-block;">Trending #1</span>
                <h1 class="hero-title">${movie.title}</h1>
                <div style="display:flex; gap:10px;">
                    <a href="watch.html?url=${encodeURIComponent(movie.url)}" class="btn btn-primary"><i class="ri-play-fill"></i> Putar Sekarang</a>
                    <button class="btn" style="background:rgba(255,255,255,0.2)">+ Daftar Saya</button>
                </div>
            </div>
        </div>
    `;
}

function renderGrid(movies, elementId) {
    const grid = document.getElementById(elementId);
    if (!grid) return;
    
    grid.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="window.location.href='watch.html?url=${encodeURIComponent(movie.url)}'">
            <img src="${movie.thumbnail}" class="poster" loading="lazy" alt="${movie.title}">
            <div class="card-info">
                <div class="card-title">${movie.title}</div>
                <div class="card-meta">
                    <span>${movie.year || '2026'}</span>
                    <span class="quality-tag">${movie.quality || 'HD'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// --- Event Listeners ---

const searchInput = document.getElementById('searchInput');
if(searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') {
            searchMovies(e.target.value);
        }
    });
}

function loadHome() {
    window.location.href = 'index.html';
}

function toggleSearchMobile() {
    const term = prompt("Cari Film:");
    if(term) searchMovies(term);
}

// Init Home
if(document.getElementById('heroSection')) {
    fetchHome();
}
