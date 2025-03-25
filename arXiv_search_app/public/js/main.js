// public/js/main.js

// DOM Elements
const elements = {
    searchForm: document.getElementById('arxiv-search-form'),
    searchInput: document.getElementById('search-input'),
    categorySelect: document.getElementById('category-select'),
    authorInput: document.getElementById('author-input'),
    dateFrom: document.getElementById('date-from'),
    dateTo: document.getElementById('date-to'),
    searchField: document.getElementById('search-field'),
    exactMatch: document.getElementById('exact-match'),
    maxResults: document.getElementById('max-results'),
    sortBy: document.getElementById('sort-by'),
    sortOrder: document.getElementById('sort-order'),
    detailedResults: document.getElementById('detailed-results'),
    loadSavedSearch: document.getElementById('load-saved-search'),
    queryIdInput: document.getElementById('query-id-input'),
    resultsContainer: document.getElementById('results-container'),
    loadingContainer: document.getElementById('loading-container'),
    loadingMessage: document.getElementById('loading-message'),
    progressContainer: document.getElementById('progress-container'),
    progressMessage: document.getElementById('progress-message'),
    progressBar: document.getElementById('progress-bar'),
    resultsCount: document.getElementById('results-count'),
    queryDisplay: document.getElementById('query-display'),
    paginationInfo: document.getElementById('pagination-info'),
    errorContainer: document.getElementById('error-container'),
    citationsContainer: document.getElementById('citations-container'),
    jsonOutput: document.getElementById('json-output'),
    downloadContainer: document.getElementById('download-container'),
    toggleCitations: document.getElementById('toggle-citations'),
    exportJson: document.getElementById('export-json')
};

// API endpoints
const API = {
    search: '/api/arxiv/search',
    savedSearch: '/api/arxiv/saved',
    citations: '/api/arxiv/citations'
};

// Current query ID
let currentQueryId = null;

// Event listeners
elements.searchForm.addEventListener('submit', handleSearch);
elements.loadSavedSearch.addEventListener('click', handleLoadSavedSearch);
elements.toggleCitations.addEventListener('click', handleToggleCitations);
elements.exportJson.addEventListener('click', handleExportJson);

// Handle search form submission
async function handleSearch(event) {
    event.preventDefault();
    
    // Clear previous results and errors
    clearResults();
    
    // Show loading state
    showLoading('Searching arXiv...');
    
    // Get search parameters from form
    const searchParams = {
        query: elements.searchInput.value,
        categories: Array.from(elements.categorySelect.selectedOptions).map(opt => opt.value),
        authors: elements.authorInput.value ? [elements.authorInput.value] : [],
        dateFrom: elements.dateFrom.value || '',
        dateTo: elements.dateTo.value || '',
        searchField: elements.searchField.value,
        exactMatch: elements.exactMatch.checked,
        maxResults: parseInt(elements.maxResults.value) || 10,
        sortBy: elements.sortBy.value,
        sortOrder: elements.sortOrder.value,
        detailed: elements.detailedResults.checked,
        format: 'ui'
    };
    
    try {
        // Make API request
        const response = await fetch(API.search, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchParams)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Search request failed');
        }
        
        // Hide loading state
        hideLoading();
        
        // Process and display results
        displayResults(data);
        
        // Store the current query ID
        if (data.metadata && data.metadata.queryId) {
            currentQueryId = data.metadata.queryId;
            elements.queryIdInput.value = currentQueryId;
        }
    } catch (error) {
        console.error('Search error:', error);
        hideLoading();
        showError(error.message);
    }
}

// Handle loading a saved search
async function handleLoadSavedSearch() {
    const queryId = elements.queryIdInput.value;
    
    if (!queryId) {
        showError('Please enter a Query ID');
        return;
    }
    
    // Clear previous results and errors
    clearResults();
    
    // Show loading state
    showLoading('Loading saved search...');
    
    try {
        // Make API request
        const response = await fetch(`${API.savedSearch}/${queryId}?detailed=${elements.detailedResults.checked}`, {
            method: 'GET'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load saved search');
        }
        
        // Hide loading state
        hideLoading();
        
        // Process and display results
        displayResults(data);
        
        // Update current query ID
        currentQueryId = queryId;
    } catch (error) {
        console.error('Load saved search error:', error);
        hideLoading();
        showError(error.message);
    }
}

// Handle toggle citations button
async function handleToggleCitations() {
    if (!currentQueryId) {
        showError('No search results available');
        return;
    }
    
    // If citations are already showing, just toggle visibility
    if (elements.citationsContainer.innerHTML !== '') {
        toggleView('citations');
        return;
    }
    
    // Show loading state
    showLoading('Generating citations...');
    
    try {
        // Make API request
        const response = await fetch(API.citations, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                queryId: currentQueryId,
                citationStyle: 'apa'
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate citations');
        }
        
        // Hide loading state
        hideLoading();
        
        // Display citations
        displayCitations(data.citations);
        
        // Toggle view to show citations
        toggleView('citations');
    } catch (error) {
        console.error('Citations error:', error);
        hideLoading();
        showError(error.message);
    }
}

// Handle export JSON button
function handleExportJson() {
    if (!currentQueryId) {
        showError('No search results available');
        return;
    }
    
    // Show loading state
    showLoading('Preparing JSON export...');
    
    fetch(`${API.savedSearch}/${currentQueryId}?format=json`)
        .then(response => response.text())
        .then(jsonText => {
            // Create a download link
            const downloadLink = document.createElement('a');
            downloadLink.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonText);
            downloadLink.download = 'arxiv_results.json';
            downloadLink.innerText = 'Download JSON Results';
            downloadLink.className = 'btn btn-primary mt-3';
            
            // Clear and update download container
            elements.downloadContainer.innerHTML = '';
            elements.downloadContainer.appendChild(downloadLink);
            
            // Hide loading state
            hideLoading();
        })
        .catch(error => {
            console.error('JSON export error:', error);
            hideLoading();
            showError(error.message);
        });
}

// Toggle between different views (results, citations, JSON)
function toggleView(view) {
    // Hide all views first
    elements.resultsContainer.style.display = 'none';
    elements.citationsContainer.style.display = 'none';
    elements.jsonOutput.style.display = 'none';
    
    // Update button text
    elements.toggleCitations.innerText = 'Show Citations';
    
    // Show the requested view
    switch (view) {
        case 'results':
            elements.resultsContainer.style.display = 'block';
            break;
        case 'citations':
            elements.citationsContainer.style.display = 'block';
            elements.toggleCitations.innerText = 'Show Results';
            break;
        case 'json':
            elements.jsonOutput.style.display = 'block';
            break;
    }
}

// Display search results
function displayResults(data) {
    const { papers, metadata } = data;
    
    // Update metadata display
    if (metadata) {
        elements.resultsCount.textContent = `Found ${metadata.totalResults} results`;
        elements.queryDisplay.textContent = `Query: ${metadata.query}`;
        
        if (metadata.startIndex !== undefined && metadata.itemsPerPage !== undefined) {
            const start = metadata.startIndex + 1;
            const end = Math.min(metadata.startIndex + metadata.itemsPerPage, metadata.totalResults);
            elements.paginationInfo.textContent = `Showing ${start}-${end} of ${metadata.totalResults}`;
        }
    }
    
    // Clear and update results container
    elements.resultsContainer.innerHTML = '';
    
    if (!papers || papers.length === 0) {
        elements.resultsContainer.innerHTML = '<div class="alert alert-info">No papers found matching your criteria.</div>';
        return;
    }
    
    // Create paper cards
    papers.forEach((paper, index) => {
        const paperElement = document.createElement('div');
        paperElement.className = 'paper-card fade-in';
        
        // Format the date strings
        const publishedDate = new Date(paper.publishedDate).toLocaleDateString();
        const updatedDate = new Date(paper.updatedDate).toLocaleDateString();
        
        // Create paper card content with Bootstrap styling
        paperElement.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">${paper.title}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${paper.authors}</h6>
                    <div class="card-text">
                        <small class="text-muted">Published: ${publishedDate} | Updated: ${updatedDate}</small>
                        ${paper.summary ? `<p class="mt-2">${paper.summary}</p>` : ''}
                        <div class="mt-2">
                            <span class="badge bg-primary">${paper.primaryCategory}</span>
                            ${paper.categories.map(cat => `<span class="badge bg-secondary">${cat}</span>`).join(' ')}
                        </div>
                    </div>
                    <div class="mt-3">
                        <a href="${paper.links.abstract}" class="btn btn-sm btn-outline-primary" target="_blank">Abstract</a>
                        ${paper.links.pdf ? `<a href="${paper.links.pdf}" class="btn btn-sm btn-outline-success" target="_blank">PDF</a>` : ''}
                        ${paper.links.doi ? `<a href="${paper.links.doi}" class="btn btn-sm btn-outline-info" target="_blank">DOI</a>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        elements.resultsContainer.appendChild(paperElement);
    });
    
    // Show results view
    toggleView('results');
}

// Display citations
function displayCitations(citations) {
    if (!citations || citations.length === 0) {
        elements.citationsContainer.innerHTML = '<div class="alert alert-info">No citations available.</div>';
        return;
    }
    
    // Create citations list
    const citationsList = document.createElement('ol');
    citationsList.className = 'citations-list';
    
    citations.forEach(citation => {
        const citationItem = document.createElement('li');
        citationItem.className = 'citation-item';
        citationItem.innerHTML = citation;
        citationsList.appendChild(citationItem);
    });
    
    // Clear and update citations container
    elements.citationsContainer.innerHTML = '';
    elements.citationsContainer.appendChild(citationsList);
}

// Show loading state
function showLoading(message) {
    elements.loadingMessage.textContent = message || 'Loading...';
    elements.loadingContainer.style.display = 'block';
    elements.progressContainer.style.display = 'none';
    elements.errorContainer.style.display = 'none';
}

// Update progress information
function updateProgress(status, message, progress) {
    elements.progressMessage.textContent = message;
    elements.progressContainer.style.display = 'block';
    
    if (progress && progress.total) {
        const percentage = Math.min(100, Math.round((progress.found / progress.total) * 100));
        elements.progressBar.style.width = `${percentage}%`;
        elements.progressBar.setAttribute('aria-valuenow', percentage);
    }
}

// Hide loading state
function hideLoading() {
    elements.loadingContainer.style.display = 'none';
    elements.progressContainer.style.display = 'none';
}

// Show error message
function showError(message) {
    elements.errorContainer.style.display = 'block';
    elements.errorContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
            Error: ${message}
        </div>
    `;
}

// Clear all results and errors
function clearResults() {
    elements.resultsContainer.innerHTML = '';
    elements.citationsContainer.innerHTML = '';
    elements.jsonOutput.innerHTML = '';
    elements.errorContainer.innerHTML = '';
    elements.errorContainer.style.display = 'none';
}

// Initialize the application
function init() {
    // Set default values
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    elements.dateTo.value = today.toISOString().split('T')[0];
    elements.dateFrom.value = oneYearAgo.toISOString().split('T')[0];
    
    // Hide loading and progress initially
    hideLoading();
}

// Start the application
init();

