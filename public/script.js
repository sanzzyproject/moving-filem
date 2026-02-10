const API_BASE = '/api';

// --- FUNGSI UTAMA ---

async function fetchHome() {
    const grid = document.getElementById('movieGrid');
    grid.innerHTML = '<div class="loader"><div class="spinner"></div><p>Sedang memuat film terbaru...</p></div>';

    try {
        const res = await fetch(`${API_BASE}/home`);
        if(!res.ok) throw new Error("Gagal terhubung ke API");
        
        const data = await res.json();
        console.log("Home Data:", data); // Cek Console

        if (data.success && data.results.length > 0) {
            renderHero(data.results[0]);
            renderGrid(data.results, 'movieGrid');
        } else {
            grid.innerHTML = '<div class="loader">Tidak ada data film ditemukan.</div>';
        }
    } catch (error) {
        console.error(error);
        grid.innerHTML = `<div class="loader">Gagal memuat: ${error.message}</div>`;
    }
}

async function searchMovies(query) {
    const grid = document.getElementById('movieGrid');
    grid.innerHTML = '<div class="loader"><div class="spinner"></div><p>Mencari...</p></div>';
    
    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (data.success && data.results.length > 0) {
            document.getElementById('heroSection').innerHTML = ''; // Hide hero
            renderGrid(data.results, 'movieGrid');
        } else {
            grid.innerHTML = '<div class="loader">Pencarian tidak ditemukan.</div>';
        }
    } catch (error) {
        grid.innerHTML = '<div class="loader">Error saat mencari.</div>';
    }
}

async function loadDetail(url) {
    const playerContainer = document.getElementById('playerContainer');
    const detailsContainer = document.getElementById('movieDetails');
    
    playerContainer.innerHTML = '<div class="loader" style="padding-top:20%"><div class="spinner"></div></div>';

    try {
        const res = await fetch(`${API_BASE}/detail?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        if(data.success) {
            const detail = data.detail;
            
            // LOGIKA PLAYER: Prioritas Trailer Youtube
            // Note: Scraper ini hanya mengambil ID Tab Server, bukan link video langsung.
            // Jadi defaultnya kita putar Trailer agar tidak blank.
            let videoUrl = "";
            if(detail.trailerUrl && detail.trailerUrl.includes('youtube')) {
                const videoId = detail.trailerUrl.split('v=')[1] || detail.trailerUrl.split('/').pop();
                videoUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`;
            } else {
                // Placeholder jika tidak ada trailer
                videoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"; 
            }

            playerContainer.innerHTML = `<iframe src="${videoUrl}" allowfullscreen allow="autoplay"></iframe>`;

            detailsContainer.innerHTML = `
                <h1 class="title-detail">${detail.title}</h1>
                <div class="meta-row">
                    <span class="badge quality">${detail.metadata.quality || 'HD'}</span>
                    <span class="badge rating"><i class="ri-star-fill"></i> ${detail.rating.value || '-'}</span>
                    <span>${detail.metadata.year || ''}</span>
                    <span>${detail.metadata.duration || ''}</span>
                </div>
                <p class="desc">${detail.description}</p>
                <div class="genres">
                    ${detail.metadata.genres ? detail.metadata.genres.map(g => `<span>${g}</span>`).join('') : ''}
                </div>
            `;

            renderGrid(detail.relatedMovies, 'relatedGrid');
        }
    } catch (error) {
        console.error(error);
        playerContainer.innerHTML = '<div class="loader">Gagal memuat detail.</div>';
    }
}

// --- HELPER RENDER ---

function renderHero(movie) {
    const hero = document.getElementById('heroSection');
    if(!hero || !movie) return;

    hero.innerHTML = `
        <div class="hero" style="background-image: url('${movie.thumbnail}')">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <span class="badge quality">Trending #1</span>
                <h1 class="hero-title">${movie.title}</h1>
                <div class="hero-actions">
                    <a href="watch.html?url=${encodeURIComponent(movie.url)}" class="btn-watch"><i class="ri-play-fill"></i> Nonton Sekarang</a>
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
            <div class="poster-wrapper">
                <img src="${movie.thumbnail}" loading="lazy" alt="${movie.title}">
                <div class="poster-overlay">
                    <i class="ri-play-circle-line"></i>
                </div>
                <span class="card-quality">${movie.quality || 'HD'}</span>
            </div>
            <div class="card-info">
                <div class="card-title">${movie.title}</div>
                <div class="card-meta">
                    <span>${movie.year || '2026'}</span>
                    <span><i class="ri-star-fill" style="color:#e50914"></i> ${movie.rating || '?'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// --- EVENTS ---

const searchInput = document.getElementById('searchInput');
if(searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') searchMovies(e.target.value);
    });
}

function loadHome() { window.location.href = 'index.html'; }
function toggleSearchMobile() {
    const q = prompt("Cari Film:");
    if(q) searchMovies(q);
}

// Init Page
const path = window.location.pathname;
const params = new URLSearchParams(window.location.search);

if(document.getElementById('heroSection')) {
    fetchHome();
} else if (params.get('url')) {
    loadDetail(params.get('url'));
}
