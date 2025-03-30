#!/usr/bin/env python3
"""
Simple SQLite Explorer with Ollama Integration

Simplified version that focuses on core functionality and better error reporting.
"""

import os
import sys
import sqlite3
import argparse
import json
import requests

def check_dependencies():
    """Check if required packages are installed"""
    missing = []
    try:
        import requests
    except ImportError:
        missing.append("requests")
        
    if missing:
        print(f"Missing required packages: {', '.join(missing)}")
        print("Install them with: pip install " + " ".join(missing))
        return False
    return True

def check_ollama(model_name="llama3"):
    """Check if Ollama is running and has the required model"""
    try:
        # Check if Ollama server is running
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code != 200:
            print("Warning: Ollama server is not responding.")
            print("Please make sure Ollama is installed and running.")
            return False
            
        # Check if the model is available
        models = response.json().get("models", [])
        model_names = [model.get("name") for model in models]
        
        if not model_names:
            print("Warning: No models found in Ollama.")
            print(f"Please run: ollama pull {model_name}")
            return False
            
        if model_name not in model_names:
            print(f"Warning: Model '{model_name}' not found in Ollama.")
            print(f"Available models: {', '.join(model_names)}")
            print(f"Please run: ollama pull {model_name}")
            return False
            
        print(f"✓ Ollama is running with model '{model_name}' available.")
        return True
    except requests.exceptions.ConnectionError:
        print("Warning: Could not connect to Ollama server.")
        print("Please make sure Ollama is installed and running.")
        return False
    except Exception as e:
        print(f"Error checking Ollama: {e}")
        return False

class OllamaClient:
    """Simple client for Ollama API"""
    def __init__(self, model_name, base_url="http://localhost:11434"):
        self.model_name = model_name
        self.base_url = base_url
    
    def generate(self, prompt):
        """Generate a response using Ollama API"""
        try:
            print(f"Sending prompt to Ollama model '{self.model_name}'...")
            url = f"{self.base_url}/api/generate"
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False
            }
            
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            
            result = response.json().get("response", "")
            print(f"Received response ({len(result)} characters)")
            return result
        except Exception as e:
            print(f"Error calling Ollama API: {str(e)}")
            return f"Error: {str(e)}"

class SQLiteExplorer:
    """Simple SQLite database explorer"""
    def __init__(self, db_file):
        self.db_file = db_file
        self.connection = None
    
    def connect(self):
        """Connect to the SQLite database"""
        try:
            if not os.path.exists(self.db_file):
                print(f"Error: Database file '{self.db_file}' does not exist.")
                return False
                
            self.connection = sqlite3.connect(self.db_file)
            print(f"✓ Connected to SQLite database: {self.db_file}")
            return True
        except Exception as e:
            print(f"Error connecting to SQLite database: {e}")
            return False
    
    def disconnect(self):
        """Close the database connection"""
        if self.connection:
            self.connection.close()
            print("✓ Database connection closed.")
    
    def get_tables(self):
        """Get all tables in the database"""
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            tables = [table[0] for table in cursor.fetchall()]
            cursor.close()
            return tables
        except Exception as e:
            print(f"Error retrieving tables: {e}")
            return []
    
    def get_table_structure(self, table_name):
        """Get the structure of a specific table"""
        try:
            cursor = self.connection.cursor()
            
            # Get column information
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns_info = cursor.fetchall()
            
            # Format columns information
            columns = []
            for col in columns_info:
                col_id, name, type_name, not_null, default_value, is_pk = col
                columns.append({
                    'name': name,
                    'type': type_name,
                    'not_null': not_null == 1,
                    'default': default_value,
                    'primary_key': is_pk == 1
                })
            
            # Get foreign key information
            cursor.execute(f"PRAGMA foreign_key_list({table_name})")
            foreign_keys = cursor.fetchall()
            
            # Format foreign key information
            fkeys = []
            for fk in foreign_keys:
                id, seq, ref_table, from_col, to_col, on_update, on_delete, match = fk
                fkeys.append({
                    'column': from_col,
                    'ref_table': ref_table,
                    'ref_column': to_col
                })
            
            cursor.close()
            return {
                'columns': columns,
                'foreign_keys': fkeys
            }
        except Exception as e:
            print(f"Error retrieving structure for table {table_name}: {e}")
            return {'columns': [], 'foreign_keys': []}
    
    def get_sample_data(self, table_name, limit=5):
        """Get sample data from a table"""
        try:
            cursor = self.connection.cursor()
            cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit}")
            columns = [description[0] for description in cursor.description]
            rows = cursor.fetchall()
            
            # Convert to list of dictionaries for easier processing
            data = []
            for row in rows:
                data.append(dict(zip(columns, row)))
                
            cursor.close()
            return data
        except Exception as e:
            print(f"Error retrieving sample data from table {table_name}: {e}")
            return []
    
    def get_schema_for_ollama(self):
        """Get a text description of the schema for Ollama"""
        tables = self.get_tables()
        description = f"Database: {os.path.basename(self.db_file)}\n\n"
        
        for table_name in tables:
            structure = self.get_table_structure(table_name)
            description += f"Table: {table_name}\n"
            description += "Columns:\n"
            
            # Add column information
            for col in structure['columns']:
                attributes = []
                if col['primary_key']:
                    attributes.append("PRIMARY KEY")
                if col['not_null']:
                    attributes.append("NOT NULL")
                if col['default'] is not None:
                    attributes.append(f"DEFAULT {col['default']}")
                
                attr_str = f" ({', '.join(attributes)})" if attributes else ""
                description += f"  - {col['name']}: {col['type']}{attr_str}\n"
            
            # Add foreign key information
            if structure['foreign_keys']:
                description += "Foreign Keys:\n"
                for fk in structure['foreign_keys']:
                    description += f"  - {fk['column']} -> {fk['ref_table']}({fk['ref_column']})\n"
            
            # Add a sample row count
            cursor = self.connection.cursor()
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            description += f"Row count: {count}\n\n"
        
        return description
    
    def execute_query(self, query):
        """Execute a SQL query and return the results"""
        try:
            cursor = self.connection.cursor()
            cursor.execute(query)
            
            # Check if this is a SELECT query (has results)
            if cursor.description:
                columns = [description[0] for description in cursor.description]
                rows = cursor.fetchall()
                
                # Convert to list of dictionaries
                results = []
                for row in rows:
                    row_dict = {}
                    for i, col in enumerate(columns):
                        # Convert data types that don't serialize well to string
                        if isinstance(row[i], (bytes, bytearray)):
                            row_dict[col] = f"<binary data, {len(row[i])} bytes>"
                        else:
                            row_dict[col] = row[i]
                    results.append(row_dict)
                
                return {
                    "type": "SELECT",
                    "columns": columns,
                    "rows": results,
                    "row_count": len(results)
                }
            else:
                # For non-SELECT queries (INSERT, UPDATE, DELETE)
                self.connection.commit()
                return {
                    "type": "UPDATE",
                    "affected_rows": cursor.rowcount
                }
            
        except Exception as e:
            print(f"Error executing query: {e}")
            return {"type": "ERROR", "error": str(e)}

def natural_language_to_sql(ollama_client, schema_description, query):
    """Convert natural language query to SQL using Ollama"""
    prompt = f"""You are a database expert who converts natural language questions into precise SQL queries.
    
    Here is the schema information for the SQLite database:
    ```
    {schema_description}
    ```
    
    User question: "{query}"
    
    Based on the schema above, write a single SQL query that answers this question.
    Only return the SQL query with no additional explanations or comments.
    The SQL query must be valid SQLite syntax.
    """
    
    # Get response from Ollama
    print("\nConverting natural language to SQL using Ollama...")
    sql_query = ollama_client.generate(prompt)
    
    # Clean up the response to extract just the SQL query
    sql_query = sql_query.strip()
    
    # Remove markdown code blocks if present
    if sql_query.startswith("```sql"):
        sql_query = sql_query.replace("```sql", "", 1).strip()
    elif sql_query.startswith("```"):
        sql_query = sql_query.replace("```", "", 1).strip()
    
    if sql_query.endswith("```"):
        sql_query = sql_query[:sql_query.rfind("```")].strip()
    
    return sql_query

def format_table(data):
    """Format data as a text table"""
    if not data or not data.get("rows") or not data.get("columns"):
        return "No data to display"
        
    columns = data["columns"]
    rows = data["rows"]
    
    # Determine column widths
    col_widths = {col: max(len(str(col)), max(len(str(row.get(col, ""))) for row in rows)) for col in columns}
    
    # Create horizontal separator
    separator = "+-" + "-+-".join("-" * col_widths[col] for col in columns) + "-+"
    
    # Create header
    header = "| " + " | ".join(str(col).ljust(col_widths[col]) for col in columns) + " |"
    
    # Create rows
    formatted_rows = []
    for row in rows:
        formatted_row = "| " + " | ".join(str(row.get(col, "")).ljust(col_widths[col]) for col in columns) + " |"
        formatted_rows.append(formatted_row)
    
    # Put it all together
    table = [separator, header, separator]
    table.extend(formatted_rows)
    table.append(separator)
    
    return "\n".join(table)

def main():
    """Main function"""
    # Set up argument parsing
    parser = argparse.ArgumentParser(description='SQLite Database Explorer with Ollama Integration')
    parser.add_argument('database', help='SQLite database file to explore')
    parser.add_argument('-m', '--model', default='llama3', help='Ollama model to use (default: llama3)')
    parser.add_argument('-a', '--ask', help='Natural language query to convert to SQL')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Check dependencies
    if not check_dependencies():
        return
    
    # Create explorer and connect to database
    explorer = SQLiteExplorer(args.database)
    if not explorer.connect():
        return
    
    try:
        # Get list of tables
        tables = explorer.get_tables()
        print(f"\nFound {len(tables)} tables in the database:")
        for table in tables:
            print(f"  - {table}")
        
        # If a natural language query was provided
        if args.ask:
            # Check Ollama
            if check_ollama(args.model):
                ollama_client = OllamaClient(args.model)
                
                # Get schema description
                print("\nGetting database schema for Ollama...")
                schema_description = explorer.get_schema_for_ollama()
                
                # Convert to SQL
                sql_query = natural_language_to_sql(ollama_client, schema_description, args.ask)
                
                # Print the query
                print("\n--- Natural Language Query ---")
                print(f"Query: {args.ask}")
                print("\n--- Generated SQL ---")
                print(sql_query)
                
                # Execute the query
                print("\nExecuting query...")
                results = explorer.execute_query(sql_query)
                
                # Display results
                print("\n--- Query Results ---")
                if results["type"] == "SELECT":
                    print(f"Found {results['row_count']} rows")
                    if results["row_count"] > 0:
                        print("\n" + format_table(results))
                elif results["type"] == "UPDATE":
                    print(f"Query executed successfully. Affected rows: {results['affected_rows']}")
                else:
                    print(f"Error: {results.get('error', 'Unknown error')}")
        
        # Without natural language query, just print schema information
        else:
            print("\nDatabase Schema Information:")
            for table_name in tables:
                structure = explorer.get_table_structure(table_name)
                print(f"\nTable: {table_name}")
                print("  Columns:")
                for col in structure['columns']:
                    pk = "PK" if col['primary_key'] else ""
                    null = "NOT NULL" if col['not_null'] else "NULL"
                    print(f"    - {col['name']} ({col['type']}) {pk} {null}")
                
                if structure['foreign_keys']:
                    print("  Foreign Keys:")
                    for fk in structure['foreign_keys']:
                        print(f"    - {fk['column']} -> {fk['ref_table']}({fk['ref_column']})")
                
                # Print sample data
                sample = explorer.get_sample_data(table_name, 3)
                if sample:
                    print("  Sample Data:")
                    for i, row in enumerate(sample):
                        print(f"    Row {i+1}: {json.dumps(row, default=str)}")
    
    finally:
        # Close database connection
        explorer.disconnect()

if __name__ == "__main__":
    main()
