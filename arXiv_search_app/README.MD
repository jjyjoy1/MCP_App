# arXiv Search App

A powerful, customizable application for searching academic papers on arXiv using a clean Model-Controller-Presenter (MCP) architecture.

![arXiv Search App](https://via.placeholder.com/800x400?text=arXiv+Search+App)

## Features

- **Advanced Search Capabilities**: Search by keywords, authors, categories, date ranges and more
- **Detailed Results**: View comprehensive information about papers including abstracts, authors, and publication dates
- **Citation Generation**: Generate citations in various formats (APA, MLA, Chicago)
- **Saved Searches**: Cache search results for future reference
- **Export Options**: Download results in JSON format
- **Responsive Design**: Works on desktop and mobile devices

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend**: Node.js, Express.js
- **API Integration**: arXiv API
- **Architecture**: Model-Controller-Presenter (MCP) pattern

## Installation

### Prerequisites

- Node.js (v14.0.0 or newer)
- npm (v6.0.0 or newer)

### Setup

1. Clone the repository
```bash
cd arxiv_search_app
```

2. Install dependencies
```bash
npm install
```

3. Start the application
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

### Basic Search

1. Enter keywords in the search box
2. Select relevant categories (optional)
3. Click "Search"

### Advanced Search

Use the advanced options to:
- Filter by author name
- Set date ranges
- Choose sort options
- Enable exact phrase matching
- Limit results

### Saving Results

Each search generates a unique Query ID that can be used to retrieve results later. Copy the ID from the search field or use the automatic caching system.

### Generating Citations

1. Perform a search
2. Click "Show Citations" 
3. Choose your preferred citation style

## Project Structure

```
arxiv-search-app/
├── arxiv-mcp-integration.js   # Core MCP components
├── server.js                  # Express server
├── package.json               # Project dependencies
├── public/                    # Frontend assets
│   ├── index.html             # Main HTML template
│   ├── js/                    # JavaScript files
│   │   └── main.js            # Frontend logic
│   └── css/                   # (Optional) Custom CSS
└── README.md                  # Project documentation
```

## Architecture

The application follows the Model-Controller-Presenter (MCP) pattern:

- **Model (`ArxivModel`)**: Handles data operations and business logic for arXiv searches
- **Controller (`ArxivController`)**: Processes user requests and coordinates between Model and Presenter
- **Presenter (`ArxivPresenter`)**: Formats data for display and manages views
- **View (`ArxivView`, implementations)**: Different view interfaces for displaying results

## API Endpoints

- `POST /api/arxiv/search` - Search for papers with various parameters
- `GET /api/arxiv/saved/:queryId` - Retrieve a previously saved search by ID
- `POST /api/arxiv/citations` - Generate citations for papers in a saved search

## Customization

### Adding Categories

Edit the `index.html` file to add more arXiv categories to the select menu:

```html
<select class="form-select" id="category-select" multiple>
  <!-- Existing options -->
  <option value="new-category">New Category Name</option>
</select>
```

### Custom View Implementation

Create a new view by extending the `ArxivView` abstract class:

```javascript
class CustomView extends ArxivView {
  // Implement required methods
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [arXiv.org](https://arxiv.org) for providing the API
- [Bootstrap](https://getbootstrap.com) for the UI components
- All the researchers who make their papers available on arXiv

## Contact

Jiyang Jiang - jiyang.jiang@gmail.com


