const API_BASE = '/api';

async function fetchHome() {
    const grid = document.getElementById('movieGrid');
    // Tampilkan loading spinner yang jelas
    grid.innerHTML = '<div class="loader"><i class="ri-loader-4-line ri-spin" style="font-size: 3rem;"></i><br>Sedang memuat film...</div>';

    try {
        const res = await fetch(`${API_BASE}/home`);
        
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        
        const data = await res.json();
        console.log("Data diterima:", data); // Cek Console Browser jika masih error

        if (data.success && data.results.length > 0) {
            // Render Hero (Film Pertama)
            renderHero(data.results[0]);
            // Render Grid (Sisanya)
            renderGrid(data.results, 'movieGrid');
        } else {
            grid.innerHTML = '<div class="loader">Gagal memuat data dari server.<br>Coba refresh halaman.</div>';
        }
    } catch (error) {
        console.error("Error fetching home:", error);
        grid.innerHTML = `<div class="loader">Terjadi kesalahan koneksi.<br>${error.message}</div>`;
    }
}

async function searchMovies(query) {
    const grid = document.getElementById('movieGrid');
    grid.innerHTML = '<div class="loader">Mencari...</div>';
    
    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success && data.results.length > 0) {
            document.getElementById('heroSection').innerHTML = ''; 
            renderGrid(data.results, 'movieGrid');
        } else {
            grid.innerHTML = '<div class="loader">Film tidak ditemukan.</div>';
        }
    } catch (error) {
        grid.innerHTML = '<div class="loader">Error saat mencari.</div>';
    }
}

async function loadDetail(url) {
    const container = document.getElementById('movieDetails');
    const player = document.getElementById('playerContainer');
    
    player.innerHTML = '<div class="loader" style="padding-top:20%"><i class="ri-loader-4-line ri-spin"></i> Memuat Player...</div>';

    try {
        const res = await fetch(`${API_BASE}/detail?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        if(data.success) {
            const detail = data.detail;
            
            // Player Logic (Priority: Trailer -> Embed)
            let videoUrl = detail.trailerUrl;
            if(videoUrl && videoUrl.includes('youtube')) {
                const videoId = videoUrl.split('v=')[1] || videoUrl.split('/').pop();
                videoUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            } else {
                // Placeholder jika tidak ada trailer
                videoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"; 
            }

            player.innerHTML = `<iframe src="${videoUrl}" allowfullscreen allow="autoplay"></iframe>`;

            container.innerHTML = `
                <h1 style="font-size: 1.8rem; margin-bottom: 10px;">${detail.title}</h1>
                <div class="card-meta" style="justify-content: flex-start; gap: 15px; margin-bottom: 20px;">
                    <span class="quality-tag">${detail.metadata.quality || 'HD'}</span>
                    <span><i class="ri-calendar-line"></i> ${detail.metadata.year || '-'}</span>
                    <span><i class="ri-time-line"></i> ${detail.metadata.duration || '-'}</span>
                </div>
                <p style="color: var(--text-muted); line-height: 1.6;">${detail.description}</p>
                <div style="margin-top: 20px;">
                    <strong>Genre:</strong> ${detail.metadata.genres ? detail.metadata.genres.join(', ') : '-'}
                </div>
            `;

            renderGrid(detail.relatedMovies, 'relatedGrid');
        }
    } catch (error) {
        console.error(error);
        player.innerHTML = '<div class="loader">Gagal memuat detail video.</div>';
    }
}

function renderHero(movie) {
    const hero = document.getElementById('heroSection');
    if(!hero || !movie) return;

    // Pastikan thumbnail valid
    const bgImage = movie.thumbnail || 'https://via.placeholder.com/800x400';

    hero.innerHTML = `
        <div class="hero" style="background-image: url('${bgImage}')">
            <div class="hero-content">
                <span class="quality-tag" style="margin-bottom:10px; display:inline-block;">Trending #1</span>
                <h1 class="hero-title">${movie.title}</h1>
                <div style="display:flex; gap:10px;">
                    <a href="watch.html?url=${encodeURIComponent(movie.url)}" class="btn btn-primary"><i class="ri-play-fill"></i> Putar</a>
                </div>
            </div>
        </div>
    `;
}

function renderGrid(movies, elementId) {
    const grid = document.getElementById(elementId);
    if (!grid) return;
    
    if(!movies || movies.length === 0) {
        grid.innerHTML = '<div class="loader">Tidak ada data.</div>';
        return;
    }

    grid.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="window.location.href='watch.html?url=${encodeURIComponent(movie.url)}'">
            <img src="${movie.thumbnail || 'https://via.placeholder.com/150x220'}" class="poster" loading="lazy" alt="${movie.title}">
            <div class="card-info">
                <div class="card-title">${movie.title}</div>
                <div class="card-meta">
                    <span>${movie.rating ? '★ '+movie.rating : ''}</span>
                    <span class="quality-tag">${movie.quality || 'HD'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Event Listeners
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

// Init
if(document.getElementById('heroSection')) fetchHome();
// Init Watch
const params = new URLSearchParams(window.location.search);
if(params.get('url')) loadDetail(params.get('url'));
