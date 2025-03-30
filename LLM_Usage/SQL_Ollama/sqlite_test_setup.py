# No external dependencies needed - sqlite3 is built into Python
"""
SQLite Test Database Setup

This script creates a test e-commerce database with sample data to test the Schema Explorer.
It sets up tables for customers, products, orders, order_items, and categories with realistic relationships.

USAGE:
  python sqlite_test_setup.py [output_file]

OPTIONS:
  output_file     SQLite database file to create (default: "ecommerce_test.db")
  
EXAMPLES:
  python sqlite_test_setup.py
  python sqlite_test_setup.py my_test_db.db
"""

import argparse
import sys
import sqlite3
import random
from datetime import datetime, timedelta
import os

# Sample data for generating test records
FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", 
               "David", "Susan", "Richard", "Jessica", "Joseph", "Sarah", "Thomas", "Karen", "Charles", "Lisa"]

LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", 
              "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", 
          "Dallas", "San Jose", "Austin", "Jacksonville", "Fort Worth", "Columbus", "San Francisco", "Charlotte", 
          "Indianapolis", "Seattle", "Denver", "Boston"]

STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", 
          "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", 
          "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"]

CATEGORIES = ["Electronics", "Clothing", "Books", "Home & Kitchen", "Sports", "Toys", "Beauty", "Automotive", 
              "Grocery", "Health", "Garden", "Office", "Pet Supplies", "Tools", "Baby", "Jewelry"]

PRODUCT_NAMES = {
    "Electronics": ["Smartphone", "Laptop", "Tablet", "Headphones", "Smart Watch", "Camera", "TV", "Gaming Console", "Bluetooth Speaker", "Wireless Earbuds"],
    "Clothing": ["T-Shirt", "Jeans", "Dress", "Jacket", "Sweater", "Socks", "Hat", "Gloves", "Scarf", "Shorts"],
    "Books": ["Novel", "Cookbook", "Biography", "Self-Help", "History Book", "Science Fiction", "Mystery", "Poetry", "Travel Guide", "Children's Book"],
    "Home & Kitchen": ["Blender", "Coffee Maker", "Toaster", "Microwave", "Cookware Set", "Knife Set", "Dinnerware", "Bedding", "Vacuum Cleaner", "Air Purifier"],
    "Sports": ["Basketball", "Tennis Racket", "Football", "Yoga Mat", "Dumbbells", "Exercise Bike", "Running Shoes", "Swim Goggles", "Baseball Bat", "Soccer Ball"]
}

PAYMENT_METHODS = ["Credit Card", "PayPal", "Apple Pay", "Google Pay", "Bank Transfer", "Cash on Delivery"]
ORDER_STATUSES = ["Processing", "Shipped", "Delivered", "Cancelled", "Refunded"]

class SQLiteTestSetup:
    def __init__(self, db_file="ecommerce_test.db"):
        self.db_file = db_file
        self.connection = None
    
    def connect(self):
        """Create and connect to the SQLite database"""
        try:
            # Remove existing database file if it exists
            if os.path.exists(self.db_file):
                os.remove(self.db_file)
                print(f"✓ Removed existing database file: {self.db_file}")
            
            # Create a new database connection
            self.connection = sqlite3.connect(self.db_file)
            print(f"✓ Created new SQLite database: {self.db_file}")
            return True
        except Exception as e:
            print(f"Error connecting to SQLite database: {e}")
            sys.exit(1)
    
    def create_tables(self):
        """Create the necessary tables for the test database"""
        try:
            cursor = self.connection.cursor()
            
            # Create categories table
            cursor.execute("""
                CREATE TABLE categories (
                    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create products table with foreign key to categories
            cursor.execute("""
                CREATE TABLE products (
                    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    price REAL NOT NULL,
                    stock_quantity INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES categories(category_id)
                )
            """)
            
            # Create customers table
            cursor.execute("""
                CREATE TABLE customers (
                    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    phone TEXT,
                    address TEXT,
                    city TEXT,
                    state TEXT,
                    zip_code TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
            """)
            
            # Create orders table with foreign key to customers
            cursor.execute("""
                CREATE TABLE orders (
                    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    total_amount REAL NOT NULL,
                    payment_method TEXT,
                    status TEXT DEFAULT 'Processing',
                    shipping_address TEXT,
                    shipping_city TEXT,
                    shipping_state TEXT,
                    shipping_zip TEXT,
                    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
                )
            """)
            
            # Create order_items table with foreign keys to orders and products
            cursor.execute("""
                CREATE TABLE order_items (
                    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL,
                    unit_price REAL NOT NULL,
                    FOREIGN KEY (order_id) REFERENCES orders(order_id),
                    FOREIGN KEY (product_id) REFERENCES products(product_id)
                )
            """)
            
            self.connection.commit()
            print("✓ Created all tables for the test database")
        except Exception as e:
            print(f"Error creating tables: {e}")
            sys.exit(1)
    
    def insert_sample_data(self, num_customers=50, num_products=100, num_orders=200):
        """Insert sample data into the tables"""
        try:
            print("Inserting sample data...")
            cursor = self.connection.cursor()
            
            # Insert categories
            for category in CATEGORIES:
                cursor.execute(
                    "INSERT INTO categories (name, description) VALUES (?, ?)",
                    (category, f"Products in the {category} category")
                )
            self.connection.commit()
            print(f"✓ Inserted {len(CATEGORIES)} categories")
            
            # Get category IDs
            cursor.execute("SELECT category_id, name FROM categories")
            categories = {name: cat_id for cat_id, name in cursor.fetchall()}
            
            # Insert products
            for _ in range(num_products):
                category = random.choice(list(categories.keys()))
                if category in PRODUCT_NAMES:
                    product_base = random.choice(PRODUCT_NAMES[category])
                    variant = random.choice(["Premium", "Basic", "Pro", "Deluxe", "Standard", "Ultra", "Mini", "Max"])
                    product_name = f"{variant} {product_base}"
                else:
                    product_name = f"Product {_ + 1}"
                
                category_id = categories[category]
                price = round(random.uniform(9.99, 999.99), 2)
                stock = random.randint(0, 1000)
                
                cursor.execute(
                    "INSERT INTO products (category_id, name, description, price, stock_quantity) VALUES (?, ?, ?, ?, ?)",
                    (category_id, product_name, f"Description for {product_name}", price, stock)
                )
            self.connection.commit()
            print(f"✓ Inserted {num_products} products")
            
            # Get all product IDs and prices for later use
            cursor.execute("SELECT product_id, price FROM products")
            products = {prod_id: price for prod_id, price in cursor.fetchall()}
            
            # Insert customers
            for i in range(num_customers):
                first_name = random.choice(FIRST_NAMES)
                last_name = random.choice(LAST_NAMES)
                email = f"{first_name.lower()}.{last_name.lower()}{i}@example.com"
                city = random.choice(CITIES)
                state = random.choice(STATES)
                
                cursor.execute(
                    """INSERT INTO customers 
                    (first_name, last_name, email, phone, address, city, state, zip_code) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        first_name, 
                        last_name, 
                        email, 
                        f"555-{random.randint(100, 999)}-{random.randint(1000, 9999)}", 
                        f"{random.randint(100, 9999)} Main St", 
                        city, 
                        state, 
                        f"{random.randint(10000, 99999)}"
                    )
                )
            self.connection.commit()
            print(f"✓ Inserted {num_customers} customers")
            
            # Get all customer IDs
            cursor.execute("SELECT customer_id FROM customers")
            customer_ids = [row[0] for row in cursor.fetchall()]
            
            # Insert orders and order items
            for _ in range(num_orders):
                customer_id = random.choice(customer_ids)
                # SQLite doesn't support direct datetime subtraction, so we'll use string format
                days_ago = random.randint(1, 365)
                order_date = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d %H:%M:%S')
                payment_method = random.choice(PAYMENT_METHODS)
                status = random.choice(ORDER_STATUSES)
                
                # Get customer address for shipping
                cursor.execute(
                    "SELECT address, city, state, zip_code FROM customers WHERE customer_id = ?",
                    (customer_id,)
                )
                address, city, state, zip_code = cursor.fetchone()
                
                # Insert order without total amount first
                cursor.execute(
                    """INSERT INTO orders 
                    (customer_id, order_date, total_amount, payment_method, status, 
                    shipping_address, shipping_city, shipping_state, shipping_zip) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        customer_id, 
                        order_date, 
                        0,  # Temporary total amount
                        payment_method, 
                        status, 
                        address, 
                        city, 
                        state, 
                        zip_code
                    )
                )
                
                # Get the order ID
                order_id = cursor.lastrowid
                
                # Generate order items
                num_items = random.randint(1, 5)
                order_product_ids = random.sample(list(products.keys()), num_items)
                total_amount = 0
                
                for product_id in order_product_ids:
                    unit_price = products[product_id]
                    quantity = random.randint(1, 5)
                    item_total = unit_price * quantity
                    total_amount += item_total
                    
                    cursor.execute(
                        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
                        (order_id, product_id, quantity, unit_price)
                    )
                
                # Update the order with the correct total amount
                cursor.execute(
                    "UPDATE orders SET total_amount = ? WHERE order_id = ?",
                    (total_amount, order_id)
                )
                
                # Commit every 50 orders to avoid transaction size issues
                if _ % 50 == 0:
                    self.connection.commit()
            
            self.connection.commit()
            print(f"✓ Inserted {num_orders} orders with items")
            
        except Exception as e:
            print(f"Error inserting sample data: {e}")
            sys.exit(1)
    
    def close_connection(self):
        """Close the database connection"""
        if self.connection:
            self.connection.close()
            print("✓ Database connection closed.")
    
    def setup_test_database(self):
        """Set up the complete test database"""
        self.connect()
        self.create_tables()
        self.insert_sample_data()
        self.close_connection()
        
        print(f"\n✓ Test database '{self.db_file}' is ready!")
        print("\nTo examine this database, use the SQLite Schema Explorer:")
        print(f"  python sqlite_schema_explorer.py {self.db_file}")
        print("\nTo run a natural language query with Ollama:")
        print(f"  python sqlite_schema_explorer.py {self.db_file} --ask \"What are the top 5 customers by order total?\"")

def main():
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description='SQLite Test Database Setup')
    parser.add_argument('output_file', nargs='?', default="ecommerce_test.db",
                        help='SQLite database file to create (default: "ecommerce_test.db")')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Run the setup
    setup = SQLiteTestSetup(args.output_file)
    setup.setup_test_database()

if __name__ == "__main__":
    main()

