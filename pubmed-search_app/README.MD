# PubMed Search App

A comprehensive application for searching and exploring medical research papers from PubMed using the Model-Controller-Presenter (MCP) architecture pattern.


## Features

- **Powerful Search Engine**: Query PubMed's extensive database of medical literature
- **Advanced Filtering**: Filter by publication date, journal, author, article type and more
- **Smart Result Handling**: Sort, paginate, and explore search results efficiently
- **Citation Management**: Generate citations in various academic formats
- **Abstract Previews**: Read paper abstracts without leaving the application
- **Responsive Interface**: Optimized for both desktop and mobile devices
- **Data Export**: Download search results in multiple formats

## Live Demo

[View Live Demo](#) (Replace with your deployed app URL)

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend**: Node.js, Express.js
- **API Integration**: NCBI E-utilities API (PubMed)
- **Architecture**: Model-Controller-Presenter (MCP) pattern

## Installation

### Prerequisites

- Node.js (v14.0.0 or newer)
- npm (v6.0.0 or newer)
- NCBI API Key (optional but recommended for higher request limits)

### Setup

1. Clone the repository
```bash
cd pubmed_search_app
```

2. Install dependencies
```bash
npm install
```

3. Configure API key (optional)
   - Create a `.env` file in the root directory
   - Add your NCBI API key: `NCBI_API_KEY=your_api_key_here`

4. Start the application
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

### Basic Search

1. Enter keywords or MeSH terms in the search box
2. Click "Search" to retrieve results
3. Browse through paginated results

### Advanced Search

- Combine search terms with Boolean operators (AND, OR, NOT)
- Filter by publication date range
- Limit to specific journals or article types
- Filter by author names

### Working with Results

- Click on a paper to view its abstract and details
- Generate citations in your preferred format
- Export selected results to CSV, JSON, or BibTeX
- Save searches for future reference

## Project Structure

```
pubmed-search-app/
├── pubmed-mcp-integration.js  # Core MCP components
├── server.js                  # Express server
├── package.json               # Project dependencies
├── public/                    # Frontend assets
│   ├── index.html             # Main HTML template
│   ├── js/                    # JavaScript files
│   │   └── main.js            # Frontend logic
│   └── css/                   # CSS stylesheets
└── README.md                  # Project documentation
```

## Architecture

The application uses the Model-Controller-Presenter (MCP) architecture:

- **Model (`PubmedModel`)**: Handles data operations, API calls to PubMed, and search logic
- **Controller (`PubmedController`)**: Manages user interactions and coordinates between Model and Presenter
- **Presenter (`PubmedPresenter`)**: Formats data from the Model for presentation and manages view updates
- **View (Various implementations)**: Displays information to the user

## API Integration

This application uses the NCBI E-utilities API to access PubMed data:

- **ESearch**: Searches PubMed and returns unique identifiers (PMIDs)
- **ESummary**: Retrieves document summaries for a list of PMIDs
- **EFetch**: Retrieves records in specified format from a list of PMIDs

## Customization

### Custom Search Fields

Add additional search fields by modifying the search form in `index.html` and handling them in the controller.

### Result Display Options

Customize how results are displayed by modifying the presenter's formatting methods:

```javascript
formatPaperForDisplay(paper, detailed = false) {
  // Customize the formatting logic
}
```

### API Parameters

Adjust PubMed API request parameters in the model:

```javascript
async searchPubmed(options = {}) {
  // Modify API request parameters
}
```

## MeSH Terms Integration

The application supports Medical Subject Headings (MeSH) for more precise searching:

- Use the MeSH browser to find appropriate terms
- Apply MeSH terms in the advanced search form
- Explore related MeSH terms for broader/narrower topics

## Rate Limiting and Performance

- Implements caching to reduce API calls
- Respects NCBI's usage guidelines (maximum 3 requests per second, 10 requests per second with API key)
- Batches requests for optimal performance

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [National Center for Biotechnology Information (NCBI)](https://www.ncbi.nlm.nih.gov/) for providing the E-utilities API
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/) for their extensive database of medical research
- [Bootstrap](https://getbootstrap.com) for the UI components

## Contact

Jiyang Jiang: jiyang.jiang@gmail.com


