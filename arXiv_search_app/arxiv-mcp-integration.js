// MODEL - Handles data operations and business logic
const axios = require('axios');
const xml2js = require('xml2js');

class ArxivModel {
  /**
   * Search arXiv for scientific papers
   * @param {Object} options - Search configuration
   * @returns {Promise<Object>} - Parsed results and metadata
   */
  async searchArxiv(options = {}) {
    // Default options
    const {
      searchQuery = 'bioinformatics',
      categories = [],
      authors = [],
      dateRange = { from: '', to: '' },
      searchField = 'all',
      exactMatch = false,
      start = 0,
      maxResults = 10,
      sortBy = 'submittedDate',
      sortOrder = 'descending',
      fullText = false,
      onProgress = null
    } = options;

    // Build the query parameters
    let queryParts = [];
    
    // Process main search query
    if (Array.isArray(searchQuery)) {
      // Join multiple search terms with OR
      const queryTerms = searchQuery.map(term => {
        // Handle exact phrase matching
        if (exactMatch && !term.includes('"')) {
          return `"${term}"`;
        }
        return term;
      });
      
      if (searchField !== 'all') {
        queryParts.push(`${searchField}:(${queryTerms.join(' OR ')})`);
      } else {
        queryParts.push(`(${queryTerms.join(' OR ')})`);
      }
    } else {
      // Single search term
      const formattedQuery = exactMatch && !searchQuery.includes('"') 
        ? `"${searchQuery}"` 
        : searchQuery;
          
      if (searchField !== 'all') {
        queryParts.push(`${searchField}:${formattedQuery}`);
      } else {
        queryParts.push(formattedQuery);
      }
    }
    
    // Add category filters
    if (categories.length > 0) {
      const catQuery = Array.isArray(categories) 
        ? categories.map(cat => `cat:${cat}`).join(' OR ') 
        : `cat:${categories}`;
      queryParts.push(`(${catQuery})`);
    }
    
    // Add author filters
    if (authors.length > 0) {
      const authorQuery = Array.isArray(authors)
        ? authors.map(author => `au:"${author}"`).join(' OR ')
        : `au:"${authors}"`;
      queryParts.push(`(${authorQuery})`);
    }
    
    // Add date range filter
    if (dateRange.from || dateRange.to) {
      let dateQuery = '';
      if (dateRange.from && dateRange.to) {
        dateQuery = `submittedDate:[${dateRange.from} TO ${dateRange.to}]`;
      } else if (dateRange.from) {
        dateQuery = `submittedDate:[${dateRange.from} TO 9999-12-31]`;
      } else if (dateRange.to) {
        dateQuery = `submittedDate:[0000-01-01 TO ${dateRange.to}]`;
      }
      queryParts.push(dateQuery);
    }
    
    // Join all query parts with AND
    const queryString = queryParts.join(' AND ');
    
    // Encode URI components properly
    const encodedQuery = encodeURIComponent(queryString);
    
    // Build the full URL
    const url = `http://export.arxiv.org/api/query?search_query=${encodedQuery}&start=${start}&max_results=${maxResults}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    
    // Make the request
    try {
      if (onProgress) onProgress({ status: 'requesting', url });
      const response = await axios.get(url);
      
      if (onProgress) onProgress({ status: 'parsing' });
      
      // Parse the XML response
      return new Promise((resolve, reject) => {
        const parser = new xml2js.Parser();
        parser.parseString(response.data, (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Extract and format the results
          const entries = result.feed.entry || [];
          const totalResults = parseInt(result.feed['opensearch:totalResults'][0], 10);
          
          if (onProgress) onProgress({ 
            status: 'complete', 
            found: entries.length, 
            total: totalResults 
          });
          
          // Format the data for easier consumption
          const papers = entries.map((entry, index) => {
            // Find the PDF link
            const pdfLink = entry.link.find(link => link.$.title === 'pdf' || link.$.type === 'application/pdf');
            
            // Extract DOI if available
            const doi = entry['arxiv:doi'] ? entry['arxiv:doi'][0] : null;
            
            // Get all categories
            const primaryCategory = entry['arxiv:primary_category'][0].$.term;
            const allCategories = entry.category.map(cat => cat.$.term);
            
            // Format the result
            return {
              id: entry.id[0],
              title: entry.title[0].trim(),
              authors: entry.author.map(a => ({
                name: a.name[0],
                affiliation: a.affiliation ? a.affiliation[0] : null
              })),
              summary: entry.summary[0].trim().replace(/\s+/g, ' '),
              published: new Date(entry.published[0]),
              updated: new Date(entry.updated[0]),
              doi,
              primaryCategory,
              categories: allCategories,
              links: {
                abstract: entry.link.find(link => link.$.rel === 'alternate' || link.$.title === 'abs').$.href,
                pdf: pdfLink ? pdfLink.$.href : null,
                doi: doi ? `https://doi.org/${doi}` : null
              },
              // Include full text if requested (this would require additional processing)
              ...(fullText ? { fullText: 'Not directly available from arXiv API' } : {})
            };
          });
          
          // Resolve with the formatted results and metadata
          resolve({
            papers,
            metadata: {
              totalResults,
              startIndex: start,
              itemsPerPage: parseInt(result.feed['opensearch:itemsPerPage'][0], 10),
              query: queryString
            }
          });
        });
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Store search results in cache or database
   * @param {Object} results - Results from searchArxiv
   * @param {string} queryId - Unique identifier for this query
   */
  async storeResults(results, queryId) {
    // Implementation would depend on your storage mechanism
    // Here's a simple example using an in-memory store
    if (!this.resultsCache) {
      this.resultsCache = new Map();
    }
    
    this.resultsCache.set(queryId, {
      results,
      timestamp: new Date()
    });
    
    return queryId;
  }

  /**
   * Retrieve stored results
   * @param {string} queryId - Unique identifier for the query
   * @returns {Object|null} - The stored results or null if not found
   */
  async getStoredResults(queryId) {
    if (!this.resultsCache) return null;
    
    const cached = this.resultsCache.get(queryId);
    if (!cached) return null;
    
    return cached.results;
  }
}

// CONTROLLER - Handles the communication between Model and Presenter
class ArxivController {
  constructor(model, presenter) {
    this.model = model;
    this.presenter = presenter;
  }

  /**
   * Process a search request
   * @param {Object} searchOptions - Search parameters
   * @param {Object} displayOptions - Display preferences
   */
  async handleSearch(searchOptions, displayOptions = {}) {
    try {
      // Notify presenter that search is starting
      this.presenter.showLoading(searchOptions);
      
      // Create a progress callback that updates the presenter
      const progressCallback = (progress) => {
        this.presenter.updateProgress(progress);
      };
      
      // Add the progress callback to the search options
      const options = {
        ...searchOptions,
        onProgress: progressCallback
      };
      
      // Perform the search
      const results = await this.model.searchArxiv(options);
      
      // Store the results with a unique ID
      const queryId = `query_${Date.now()}`;
      await this.model.storeResults(results, queryId);
      
      // Send the results to the presenter
      this.presenter.displayResults(results, {
        ...displayOptions,
        queryId
      });
      
      return queryId;
    } catch (error) {
      // Handle errors
      this.presenter.showError(error);
      throw error;
    }
  }

  /**
   * Retrieve and display a previously stored search result
   * @param {string} queryId - The ID of the stored query
   * @param {Object} displayOptions - Display preferences
   */
  async retrieveSavedSearch(queryId, displayOptions = {}) {
    try {
      this.presenter.showLoading({ message: 'Retrieving saved search...' });
      
      const results = await this.model.getStoredResults(queryId);
      
      if (!results) {
        throw new Error(`No saved search found with ID: ${queryId}`);
      }
      
      this.presenter.displayResults(results, displayOptions);
      
      return true;
    } catch (error) {
      this.presenter.showError(error);
      throw error;
    }
  }
}

// PRESENTER - Responsible for UI updates and formatting display data
class ArxivPresenter {
  constructor(view) {
    this.view = view;
  }

  /**
   * Show loading state
   * @param {Object} options - Loading state information
   */
  showLoading(options) {
    const message = options.message || 'Searching arXiv...';
    this.view.updateLoadingState(true, message);
  }

  /**
   * Update progress information
   * @param {Object} progress - Progress data
   */
  updateProgress(progress) {
    let message = '';
    
    switch (progress.status) {
      case 'requesting':
        message = 'Sending request to arXiv...';
        break;
      case 'parsing':
        message = 'Processing response...';
        break;
      case 'complete':
        message = `Found ${progress.found} out of ${progress.total} papers`;
        break;
      default:
        message = `Status: ${progress.status}`;
    }
    
    this.view.updateProgressInfo(progress.status, message, progress);
  }

  /**
   * Format and display search results
   * @param {Object} results - Results from searchArxiv
   * @param {Object} options - Display options
   */
  displayResults(results, options = {}) {
    const { papers, metadata } = results;
    const { detailed = false, format = 'ui', queryId = null } = options;
    
    // Update view with query information
    this.view.updateSearchMetadata({
      totalResults: metadata.totalResults,
      query: metadata.query,
      startIndex: metadata.startIndex,
      itemsPerPage: metadata.itemsPerPage,
      queryId
    });
    
    // Clear loading state
    this.view.updateLoadingState(false);
    
    // Format the papers based on the desired output format
    if (format === 'ui') {
      // Send formatted papers to the view
      const formattedPapers = papers.map(paper => this.formatPaperForDisplay(paper, detailed));
      this.view.displayPapers(formattedPapers);
    } else if (format === 'json') {
      // For API responses or downloads
      this.view.provideJSONData(JSON.stringify({ papers, metadata }, null, 2));
    } else if (format === 'citation') {
      // For citation formats
      const citations = papers.map(paper => this.formatPaperAsCitation(paper, options.citationStyle || 'apa'));
      this.view.displayCitations(citations);
    }
  }

  /**
   * Format a paper object for display
   * @param {Object} paper - Paper data
   * @param {boolean} detailed - Whether to include detailed information
   * @returns {Object} - Formatted paper data
   */
  formatPaperForDisplay(paper, detailed = false) {
    const formattedPaper = {
      id: paper.id,
      title: paper.title,
      authors: paper.authors.map(a => a.name).join(', '),
      publishedDate: paper.published.toLocaleDateString(),
      updatedDate: paper.updated.toLocaleDateString(),
      primaryCategory: paper.primaryCategory,
      categories: paper.categories,
      links: paper.links
    };
    
    if (detailed) {
      formattedPaper.summary = paper.summary;
      
      if (paper.authors.some(a => a.affiliation)) {
        formattedPaper.affiliations = paper.authors
          .filter(a => a.affiliation)
          .map(a => ({ name: a.name, affiliation: a.affiliation }));
      }
      
      if (paper.doi) {
        formattedPaper.doi = paper.doi;
      }
    }
    
    return formattedPaper;
  }

  /**
   * Format a paper as a citation
   * @param {Object} paper - Paper data
   * @param {string} style - Citation style ('apa', 'mla', 'chicago', etc.)
   * @returns {string} - Formatted citation
   */
  formatPaperAsCitation(paper, style = 'apa') {
    const authors = paper.authors.map(a => a.name);
    const year = paper.published.getFullYear();
    const title = paper.title;
    const arxivId = paper.id.split('/').pop();
    
    switch (style.toLowerCase()) {
      case 'apa':
        return `${authors.join(', ')}. (${year}). ${title}. arXiv preprint arXiv:${arxivId}.`;
      
      case 'mla':
        return `${authors.join(', ')}. "${title}." arXiv:${arxivId} (${year}).`;
      
      case 'chicago':
        return `${authors.join(', ')}. "${title}." arXiv preprint arXiv:${arxivId} (${year}).`;
      
      default:
        return `${authors.join(', ')} (${year}). ${title}. arXiv:${arxivId}.`;
    }
  }

  /**
   * Show error messages
   * @param {Error} error - The error object
   */
  showError(error) {
    this.view.updateLoadingState(false);
    this.view.displayError(error.message);
  }
}

// VIEW - Abstract class representing the view interface
class ArxivView {
  /**
   * Update the loading state of the view
   * @param {boolean} isLoading - Whether the view is in a loading state
   * @param {string} message - Loading message to display
   */
  updateLoadingState(isLoading, message = '') {
    // Abstract method to be implemented by concrete views
    throw new Error('Method updateLoadingState must be implemented');
  }

  /**
   * Update progress information during search
   * @param {string} status - Current status
   * @param {string} message - Progress message
   * @param {Object} progressData - Additional progress information
   */
  updateProgressInfo(status, message, progressData = {}) {
    // Abstract method to be implemented by concrete views
    throw new Error('Method updateProgressInfo must be implemented');
  }

  /**
   * Update search metadata in the view
   * @param {Object} metadata - Search metadata
   */
  updateSearchMetadata(metadata) {
    // Abstract method to be implemented by concrete views
    throw new Error('Method updateSearchMetadata must be implemented');
  }

  /**
   * Display a list of papers
   * @param {Array} papers - Formatted paper objects
   */
  displayPapers(papers) {
    // Abstract method to be implemented by concrete views
    throw new Error('Method displayPapers must be implemented');
  }

  /**
   * Provide JSON data for download or API response
   * @param {string} jsonData - Stringified JSON data
   */
  provideJSONData(jsonData) {
    // Abstract method to be implemented by concrete views
    throw new Error('Method provideJSONData must be implemented');
  }

  /**
   * Display a list of citations
   * @param {Array} citations - Formatted citation strings
   */
  displayCitations(citations) {
    // Abstract method to be implemented by concrete views
    throw new Error('Method displayCitations must be implemented');
  }

  /**
   * Display an error message
   * @param {string} errorMessage - Error message to display
   */
  displayError(errorMessage) {
    // Abstract method to be implemented by concrete views
    throw new Error('Method displayError must be implemented');
  }
}

// Example concrete view implementation for web UI
class WebArxivView extends ArxivView {
  constructor(elements) {
    super();
    this.elements = elements;
  }

  updateLoadingState(isLoading, message = '') {
    if (this.elements.loadingContainer) {
      this.elements.loadingContainer.style.display = isLoading ? 'block' : 'none';
    }
    
    if (this.elements.loadingMessage) {
      this.elements.loadingMessage.textContent = message;
    }
  }

  updateProgressInfo(status, message, progressData = {}) {
    if (this.elements.progressContainer) {
      this.elements.progressContainer.style.display = 'block';
    }
    
    if (this.elements.progressMessage) {
      this.elements.progressMessage.textContent = message;
    }
    
    if (this.elements.progressBar && progressData.total) {
      const percentage = Math.min(100, Math.round((progressData.found / progressData.total) * 100));
      this.elements.progressBar.style.width = `${percentage}%`;
      this.elements.progressBar.setAttribute('aria-valuenow', percentage);
    }
  }

  updateSearchMetadata(metadata) {
    if (this.elements.resultsCount) {
      this.elements.resultsCount.textContent = `Found ${metadata.totalResults} results`;
    }
    
    if (this.elements.queryDisplay) {
      this.elements.queryDisplay.textContent = `Query: ${metadata.query}`;
    }
    
    if (this.elements.paginationInfo) {
      const start = metadata.startIndex + 1;
      const end = Math.min(metadata.startIndex + metadata.itemsPerPage, metadata.totalResults);
      this.elements.paginationInfo.textContent = `Showing ${start}-${end} of ${metadata.totalResults}`;
    }
    
    if (metadata.queryId && this.elements.queryIdInput) {
      this.elements.queryIdInput.value = metadata.queryId;
    }
  }

  displayPapers(papers) {
    if (!this.elements.resultsContainer) return;
    
    // Clear previous results
    this.elements.resultsContainer.innerHTML = '';
    
    papers.forEach(paper => {
      const paperElement = document.createElement('div');
      paperElement.className = 'paper-card';
      
      // Create paper card content with Bootstrap styling
      paperElement.innerHTML = `
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">${paper.title}</h5>
            <h6 class="card-subtitle mb-2 text-muted">${paper.authors}</h6>
            <div class="card-text">
              <small class="text-muted">Published: ${paper.publishedDate} | Updated: ${paper.updatedDate}</small>
              <p class="mt-2">${paper.summary || ''}</p>
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
      
      this.elements.resultsContainer.appendChild(paperElement);
    });
  }

  provideJSONData(jsonData) {
    // For API responses or downloads
    if (this.elements.jsonOutput) {
      this.elements.jsonOutput.textContent = jsonData;
    }
    
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonData);
    downloadLink.download = 'arxiv_results.json';
    downloadLink.innerText = 'Download JSON Results';
    downloadLink.className = 'btn btn-primary mt-3';
    
    if (this.elements.downloadContainer) {
      this.elements.downloadContainer.innerHTML = '';
      this.elements.downloadContainer.appendChild(downloadLink);
    }
  }

  displayCitations(citations) {
    if (!this.elements.citationsContainer) return;
    
    this.elements.citationsContainer.innerHTML = '';
    
    const citationsList = document.createElement('ol');
    citationsList.className = 'citations-list';
    
    citations.forEach(citation => {
      const citationItem = document.createElement('li');
      citationItem.className = 'citation-item';
      citationItem.innerHTML = citation;
      citationsList.appendChild(citationItem);
    });
    
    this.elements.citationsContainer.appendChild(citationsList);
  }

  displayError(errorMessage) {
    if (this.elements.errorContainer) {
      this.elements.errorContainer.style.display = 'block';
      this.elements.errorContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
          Error: ${errorMessage}
        </div>
      `;
    }
  }
}

// Export the components for use in other modules
module.exports = {
  ArxivModel,
  ArxivController,
  ArxivPresenter,
  ArxivView,
  WebArxivView
};

