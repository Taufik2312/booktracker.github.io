// Google Books API Configuration
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
const MAX_RESULTS = 40;

// State Management
let currentFilters = {
    keyword: '',
    sort: '',
    genre: '',
    yearFrom: null,
    yearTo: null,
    pageFrom: null,
    pageTo: null,
    page: 1
};

let allBooks = [];
let filteredBooks = [];
const BOOKS_PER_PAGE = 6;

// DOM Elements
const booksContainer = document.getElementById('booksContainer');
const bookCount = document.getElementById('bookCount');
const filterKeyword = document.getElementById('filterKeyword');
const filterSort = document.getElementById('filterSort');
const filterYearFrom = document.getElementById('filterYearFrom');
const filterYearTo = document.getElementById('filterYearTo');
const filterPageFrom = document.getElementById('filterPageFrom');
const filterPageTo = document.getElementById('filterPageTo');
const applyFilterBtn = document.getElementById('applyFilter');
const resetFilterBtn = document.getElementById('resetFilter');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageNumbers = document.getElementById('pageNumbers');

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadBooks();
    setupEventListeners();
    loadLibraryCount();
});

// Setup Event Listeners
function setupEventListeners() {
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', applyFilters);
    }

    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', resetFilters);
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentFilters.page > 1) {
                currentFilters.page--;
                displayCurrentPage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);
            if (currentFilters.page < totalPages) {
                currentFilters.page++;
                displayCurrentPage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    if (filterKeyword) {
        filterKeyword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-add-library')) {
            addToLibrary(e.target);
        }
    });
}

// Map Genre from Google Books categories
function mapGenre(categories) {
    if (!categories || categories.length === 0) return 'Uncategorized';
    
    const category = categories[0].toLowerCase();
    
    if (category.includes('fiction') || category.includes('novel')) return 'Fiksi';
    if (category.includes('romance') || category.includes('love')) return 'Romance';
    if (category.includes('thriller') || category.includes('mystery') || category.includes('suspense')) return 'Thriller';
    if (category.includes('self') || category.includes('help') || category.includes('motivat')) return 'Self Help';
    if (category.includes('business') || category.includes('economics') || category.includes('finance')) return 'Bisnis';
    if (category.includes('history') || category.includes('biography') || category.includes('science')) return 'Non-Fiksi';
    
    return 'Non-Fiksi';
}

// Build Google Books API URL
function buildGoogleBooksUrl() {
    let query = currentFilters.keyword || 'bestseller';
    
    if (currentFilters.genre) {
        const genreMap = {
            'fiksi': 'fiction',
            'nonfiksi': 'nonfiction',
            'romance': 'romance',
            'thriller': 'thriller',
            'selfhelp': 'self-help',
            'bisnis': 'business'
        };
        const genres = currentFilters.genre.split(',');
        query += ' ' + genres.map(g => genreMap[g] || g).join(' OR ');
    }
    
    const params = new URLSearchParams({
        q: query,
        maxResults: MAX_RESULTS,
        langRestrict: 'id,en',
        printType: 'books'
    });
    
    return `${GOOGLE_BOOKS_API}?${params.toString()}`;
}

function getBetterImageUrl(imageLinks) {
if (!imageLinks) return 'https://via.placeholder.com/300x400?text=No+Image';
    
    let imageUrl = imageLinks.medium || 
                   imageLinks.small || 
                   imageLinks.thumbnail || 
                   imageLinks.smallThumbnail ||
                   null;
    if (!imageUrl) return 'https://via.placeholder.com/300x400?text=No+Image';
    imageUrl = imageUrl.replace('http://', 'https://');
    imageUrl = imageUrl.replace(/&zoom=\d+/, '');
    
    return imageUrl;
}

// Transform Google Books data
function transformGoogleBooksData(items) {
    if (!items || !Array.isArray(items)) return [];
    
    return items.map(item => {
        const volumeInfo = item.volumeInfo || {};
        const imageLinks = volumeInfo.imageLinks || {};
        
        return {
            id: item.id,
            title: volumeInfo.title || 'Judul Tidak Tersedia',
            author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Penulis Tidak Diketahui',
            genre: mapGenre(volumeInfo.categories),
            year: volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.substring(0, 4)) : 0,
            pages: volumeInfo.pageCount || 0,
            rating: volumeInfo.averageRating || (Math.random() * 2 + 3).toFixed(1),
            image: getBetterImageUrl(imageLinks),
            description: volumeInfo.description || 'Deskripsi tidak tersedia',
            publisher: volumeInfo.publisher || 'Penerbit tidak diketahui',
            language: volumeInfo.language || 'en'
        };
    });
}

// Load Books from Google Books API using GET method
async function loadBooks() {
    try {
        showLoading();
        
        const url = buildGoogleBooksUrl();
        console.log('Fetching from Google Books:', url);
        
        // Using GET method explicitly
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Google Books API Response:', data);

        if (data.items && data.items.length > 0) {
            allBooks = transformGoogleBooksData(data.items);
            applyFiltersToBooks();
        } else {
            allBooks = [];
            filteredBooks = [];
            displayBooks([]);
        }

        hideLoading();

    } catch (error) {
        console.error('Error loading books:', error);
        showError('Gagal memuat data buku dari Google Books. Silakan coba lagi.');
        hideLoading();
    }
}

// Apply all filters to books
function applyFiltersToBooks() {
    filteredBooks = [...allBooks];

    // Filter by year range
    if (currentFilters.yearFrom || currentFilters.yearTo) {
        const yearFrom = currentFilters.yearFrom || 0;
        const yearTo = currentFilters.yearTo || 9999;
        filteredBooks = filteredBooks.filter(book => 
            book.year >= yearFrom && book.year <= yearTo
        );
    }

    // Filter by page count
    if (currentFilters.pageFrom || currentFilters.pageTo) {
        const pageFrom = currentFilters.pageFrom || 0;
        const pageTo = currentFilters.pageTo || Infinity;
        filteredBooks = filteredBooks.filter(book => 
            book.pages >= pageFrom && book.pages <= pageTo
        );
    }

    // Apply sorting
    applySorting();

    // Reset to page 1
    currentFilters.page = 1;

    // Display results
    displayCurrentPage();
}

// Apply Sorting
function applySorting() {
    switch(currentFilters.sort) {
        case 'newest':
            filteredBooks.sort((a, b) => b.year - a.year);
            break;
        case 'oldest':
            filteredBooks.sort((a, b) => a.year - b.year);
            break;
        case 'titleAZ':
            filteredBooks.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'titleZA':
            filteredBooks.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'ratingHighLow':
            filteredBooks.sort((a, b) => b.rating - a.rating);
            break;
        case 'ratingLowHigh':
            filteredBooks.sort((a, b) => a.rating - b.rating);
            break;
    }
}

// Display Current Page
function displayCurrentPage() {
    const startIndex = (currentFilters.page - 1) * BOOKS_PER_PAGE;
    const endIndex = startIndex + BOOKS_PER_PAGE;
    const booksToShow = filteredBooks.slice(startIndex, endIndex);
    
    displayBooks(booksToShow);
    updatePagination();
}

// Display Books
function displayBooks(books) {
    if (!booksContainer) return;

    if (books.length === 0) {
        booksContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <h3>📚 Buku Tidak Ditemukan</h3>
                <p>Tidak ada buku yang sesuai dengan filter Anda. Silakan coba filter lain.</p>
            </div>
        `;
        updateBookCount(0);
        return;
    }

    booksContainer.innerHTML = books.map(book => createBookCard(book)).join('');
    updateBookCount(filteredBooks.length);
}

// Create Book Card HTML (WITHOUT PRICE)
function createBookCard(book) {
    const ratingStars = '⭐'.repeat(Math.round(book.rating));

    return `
        <div class="book-card" 
             data-genre="${book.genre.toLowerCase()}" 
             data-year="${book.year}" 
             data-pages="${book.pages}" 
             data-book-id="${book.id}">
            <img src="${book.image}" 
                 alt="${book.title}" 
                 onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
            <div class="book-info">
                <h3>${book.title}</h3>
                <p class="author">${book.author}</p>
                <p class="genre">${book.genre}</p>
                <div class="rating">${ratingStars} (${book.rating})</div>
                ${book.year ? `<p class="book-meta-info">📅 ${book.year}</p>` : ''}
                ${book.pages ? `<p class="book-meta-info">📄 ${book.pages} halaman</p>` : ''}
                ${book.publisher ? `<p class="book-meta-info">📚 ${book.publisher}</p>` : ''}
                <button class="btn-add-library" data-book-id="${book.id}">
                    + Tambah ke Perpustakaan
                </button>
            </div>
        </div>
    `;
}

// Apply Filters
function applyFilters() {
    currentFilters.keyword = filterKeyword?.value.trim() || '';
    currentFilters.sort = filterSort?.value || '';
    currentFilters.yearFrom = parseInt(filterYearFrom?.value) || null;
    currentFilters.yearTo = parseInt(filterYearTo?.value) || null;
    currentFilters.pageFrom = parseInt(filterPageFrom?.value) || null;
    currentFilters.pageTo = parseInt(filterPageTo?.value) || null;

    const genreCheckboxes = document.querySelectorAll('input[name="genre"]:checked');
    const selectedGenres = Array.from(genreCheckboxes).map(cb => cb.value);
    currentFilters.genre = selectedGenres.join(',');

    loadBooks();
}

// Reset Filters
function resetFilters() {
    if (filterKeyword) filterKeyword.value = '';
    if (filterSort) filterSort.value = '';
    if (filterYearFrom) filterYearFrom.value = '';
    if (filterYearTo) filterYearTo.value = '';
    if (filterPageFrom) filterPageFrom.value = '';
    if (filterPageTo) filterPageTo.value = '';

    const genreCheckboxes = document.querySelectorAll('input[name="genre"]');
    genreCheckboxes.forEach(cb => cb.checked = false);

    currentFilters = {
        keyword: '',
        sort: '',
        genre: '',
        yearFrom: null,
        yearTo: null,
        pageFrom: null,
        pageTo: null,
        page: 1
    };

    loadBooks();
}

// Update Pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);

    if (prevPageBtn) {
        prevPageBtn.disabled = currentFilters.page <= 1;
    }
    if (nextPageBtn) {
        nextPageBtn.disabled = currentFilters.page >= totalPages;
    }

    if (!pageNumbers) return;

    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentFilters.page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    let pageNumbersHTML = '';
    
    for (let i = startPage; i <= endPage; i++) {
        pageNumbersHTML += `
            <button class="page-number ${i === currentFilters.page ? 'active' : ''}" 
                    data-page="${i}">
                ${i}
            </button>
        `;
    }

    pageNumbers.innerHTML = pageNumbersHTML;

    const pageButtons = pageNumbers.querySelectorAll('.page-number');
    pageButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilters.page = parseInt(btn.dataset.page);
            displayCurrentPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// Update Book Count
function updateBookCount(count) {
    if (bookCount) {
        bookCount.innerHTML = `Menampilkan <strong>${count}</strong> buku`;
    }
}

// Show Loading State
function showLoading() {
    if (booksContainer) {
        booksContainer.innerHTML = `
            <div class="loading-state" style="grid-column: 1/-1; text-align: center; padding: 4rem;">
                <div class="loading"></div>
                <p style="margin-top: 1rem; color: #666;">Memuat data buku dari Google Books...</p>
            </div>
        `;
    }
}

// Hide Loading State
function hideLoading() {
    // Loading will be replaced by book cards or empty state
}

// Show Error Message
function showError(message) {
    if (booksContainer) {
        booksContainer.innerHTML = `
            <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 4rem;">
                <h3 style="color: #e74c3c; margin-bottom: 1rem;">⚠️ Terjadi Kesalahan</h3>
                <p style="color: #666;">${message}</p>
                <button onclick="loadBooks()" class="btn-primary" style="margin-top: 1rem;">
                    Coba Lagi
                </button>
            </div>
        `;
    }
}

function addToLibrary(button) {
    const bookId = button.dataset.bookId;
    const bookCard = button.closest('.book-card');
    const bookTitle = bookCard.querySelector('h3').textContent;
    const bookImage = bookCard.querySelector('img').src;
    const bookAuthor = bookCard.querySelector('.author').textContent;
    const bookGenre = bookCard.querySelector('.genre').textContent;

    const library = getLibrary();
    const alreadyExists = library.some(book => book.id === bookId);

    if (alreadyExists) {
        button.textContent = '✓ Sudah di Perpustakaan';
        button.style.background = '#95a5a6';
        setTimeout(() => {
            button.textContent = '+ Tambah ke Perpustakaan';
            button.style.background = '';
        }, 2000);
        return;
    }

    button.textContent = '✓ Ditambahkan';
    button.style.background = '#27ae60';
    
    setTimeout(() => {
        button.textContent = '+ Tambah ke Perpustakaan';
        button.style.background = '';
    }, 2000);

    const libraryBadge = document.querySelector('.library-btn span');
    if (libraryBadge) {
        const currentCount = parseInt(libraryBadge.textContent) || 0;
        libraryBadge.textContent = currentCount + 1;
        libraryBadge.classList.add('bounce');
        setTimeout(() => libraryBadge.classList.remove('bounce'), 500);
    }

    console.log(`Added to library: ${bookTitle} (ID: ${bookId})`);
    
    saveToLibrary({
        id: bookId,
        title: bookTitle,
        author: bookAuthor,
        genre: bookGenre,
        image: bookImage,
        timestamp: new Date().toISOString(),
        status: 'want-to-read'
    });
}

function getLibrary() {
    try {
        return JSON.parse(localStorage.getItem('litopiaLibrary')) || [];
    } catch (error) {
        console.error('Error getting library:', error);
        return [];
    }
}

function saveToLibrary(book) {
    try {
        let library = getLibrary();
        library.push(book);
        localStorage.setItem('litopiaLibrary', JSON.stringify(library));
    } catch (error) {
        console.error('Error saving to library:', error);
    }
}
function loadLibraryCount() {
    try {
        const library = getLibrary();
        const libraryBadge = document.querySelector('.library-btn span');
        if (libraryBadge) {
            libraryBadge.textContent = library.length;
        }
    } catch (error) {
        console.error('Error loading library count:', error);
    }
}