SQLite Test Database Setup - Creates a sample e-commerce database with these tables:

categories
products
customers
orders
order_items


SQLite Schema Explorer - A tool that connects to SQLite databases, visualizes their structure, and allows natural language queries via Ollama

How to Use
First, create the test database:
bashCopypython sqlite_test_setup.py
This will create a file called ecommerce_test.db with sample data.
Then, explore the database:
bashCopypython sqlite_schema_explorer.py ecommerce_test.db
This will:

Connect to the database
Extract schema information
Generate a visual diagram of the database structure
Display table information and sample data

If you have Ollama installed, you can run natural language queries:
bashCopypython sqlite_schema_explorer.py ecommerce_test.db --ask "Show me the top 5 customers by total order amount"
Key Features

Database Schema Visualization

Creates an ER diagram showing tables and relationships
Shows primary and foreign keys visually


Natural Language Queries

Uses Ollama to translate English questions into SQL
Executes the generated SQL and shows results


Sample Data

The test database includes realistic data with proper relationships
The explorer shows sample rows from each table


