// server.js - Express server setup with arXiv search API endpoints
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

// Import our ArXiv MCP components
const { 
  ArxivModel, 
  ArxivController, 
  ArxivPresenter, 
  ArxivView 
} = require('./arxiv-mcp-integration');

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Setup middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Create a REST API view implementation
class RestApiView extends ArxivView {
  constructor() {
    super();
    this.response = null;
    this.error = null;
    this.searchMetadata = null;
    this.papers = null;
    this.isLoading = false;
    this.progressStatus = '';
  }

  setResponse(res) {
    this.response = res;
  }

  updateLoadingState(isLoading, message = '') {
    // No-op for REST API
  }

  updateProgressInfo(status, message, progressData = {}) {
    // No-op for REST API
  }

  updateSearchMetadata(metadata) {
    this.searchMetadata = metadata;
  }

  displayPapers(papers) {
    this.papers = papers;
    
    if (this.response) {
      this.response.json({
        success: true,
        metadata: this.searchMetadata,
        papers: this.papers
      });
    }
  }

  provideJSONData(jsonData) {
    if (this.response) {
      this.response.header('Content-Type', 'application/json');
      this.response.send(jsonData);
    }
  }

  displayCitations(citations) {
    if (this.response) {
      this.response.json({
        success: true,
        metadata: this.searchMetadata,
        citations: citations
      });
    }
  }

  displayError(errorMessage) {
    this.error = errorMessage;
    
    if (this.response) {
      this.response.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  }
}

// Initialize MCP components
const apiView = new RestApiView();
const arxivModel = new ArxivModel();
const arxivPresenter = new ArxivPresenter(apiView);
const arxivController = new ArxivController(arxivModel, arxivPresenter);

// Define API routes
// 1. Search arXiv papers
app.post('/api/arxiv/search', async (req, res) => {
  try {
    apiView.setResponse(res);
    
    // Extract search parameters from request body
    const {
      query,
      categories,
      authors,
      dateFrom,
      dateTo,
      searchField,
      exactMatch,
      maxResults,
      sortBy,
      sortOrder,
      format
    } = req.body;
    
    // Build search options
    const searchOptions = {
      searchQuery: query || 'bioinformatics',
      categories: categories || [],
      authors: authors || [],
      dateRange: {
        from: dateFrom || '',
        to: dateTo || ''
      },
      searchField: searchField || 'all',
      exactMatch: exactMatch || false,
      start: req.body.start || 0,
      maxResults: maxResults || 10,
      sortBy: sortBy || 'submittedDate',
      sortOrder: sortOrder || 'descending',
      fullText: req.body.fullText || false
    };
    
    // Handle the search request
    await arxivController.handleSearch(searchOptions, {
      format: format || 'ui',
      detailed: req.body.detailed || false
    });
  } catch (error) {
    console.error('Search API error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred'
      });
    }
  }
});

// 2. Get saved search by ID
app.get('/api/arxiv/saved/:queryId', async (req, res) => {
  try {
    apiView.setResponse(res);
    const { queryId } = req.params;
    
    if (!queryId) {
      return res.status(400).json({
        success: false,
        error: 'Query ID is required'
      });
    }
    
    await arxivController.retrieveSavedSearch(queryId, {
      format: req.query.format || 'ui',
      detailed: req.query.detailed === 'true',
      citationStyle: req.query.citationStyle
    });
  } catch (error) {
    console.error('Saved search API error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred'
      });
    }
  }
});

// 3. Get citation for papers
app.post('/api/arxiv/citations', async (req, res) => {
  try {
    apiView.setResponse(res);
    const { queryId, citationStyle } = req.body;
    
    if (!queryId) {
      return res.status(400).json({
        success: false,
        error: 'Query ID is required'
      });
    }
    
    await arxivController.retrieveSavedSearch(queryId, {
      format: 'citation',
      citationStyle: citationStyle || 'apa'
    });
  } catch (error) {
    console.error('Citations API error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred'
      });
    }
  }
});

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`arXiv search server running at http://localhost:${port}`);
});


