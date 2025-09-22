#!/usr/bin/env python3
import csv
import json

def convert_csv_to_js():
    """Convert Sales Data.csv to JavaScript array for embedding"""

    sales_data = []

    try:
        with open('Sales Data.csv', 'r', encoding='utf-8-sig') as file:
            csv_reader = csv.DictReader(file)

            for row in csv_reader:
                # Clean and convert the data
                cleaned_row = {}
                for key, value in row.items():
                    # Remove BOM and clean field names
                    clean_key = key.strip().replace('\ufeff', '')
                    cleaned_row[clean_key] = value.strip() if value else ''

                sales_data.append(cleaned_row)

        print(f"Successfully loaded {len(sales_data)} records")

        # Calculate some quick stats to verify
        total_sales = 0
        valid_records = 0

        for record in sales_data:
            try:
                so_total = float(record.get('SOTotal', 0))
                total_sales += so_total
                if so_total > 0:
                    valid_records += 1
            except (ValueError, TypeError):
                continue

        print(f"Total records: {len(sales_data)}")
        print(f"Valid sales records: {valid_records}")
        print(f"Total sales value: £{total_sales:,.2f}")

        # Find highest customer
        customer_totals = {}
        for record in sales_data:
            try:
                so_total = float(record.get('SOTotal', 0))
                customer_name = f"{record.get('FirstName', '')} {record.get('LastName', '')}".strip()

                if customer_name and so_total > 0:
                    if customer_name not in customer_totals:
                        customer_totals[customer_name] = 0
                    customer_totals[customer_name] += so_total
            except (ValueError, TypeError):
                continue

        if customer_totals:
            top_customer = max(customer_totals.items(), key=lambda x: x[1])
            print(f"Top customer: {top_customer[0]} - £{top_customer[1]:,.2f}")

        # Generate JavaScript code
        js_output = f"""
        function loadEmbeddedSalesData() {{
            // Full sales data - {len(sales_data)} records
            const salesDataArray = {json.dumps(sales_data, indent=2)};

            try {{
                salesData = salesDataArray.map(row => ({{
                    ...row,
                    SOTotal: parseFloat(row.SOTotal) || 0,
                    SODate: new Date(row.SODate)
                }}));

                console.log(`Loaded ${{salesData.length}} sales records`);

                // Calculate quick stats
                const totalSales = salesData.reduce((sum, row) => sum + row.SOTotal, 0);
                const validRecords = salesData.filter(row => row.SOTotal > 0).length;

                setTimeout(() => {{
                    addMessage('assistant', `📊 <strong>Sales Data Loaded!</strong><br>
                    • Total Records: ${{salesData.length:toLocaleString()}}<br>
                    • Valid Sales: ${{validRecords:toLocaleString()}}<br>
                    • Total Value: £${{Math.round(totalSales):toLocaleString()}}<br><br>
                    Ask me anything about your sales data!`);
                }}, 1000);

            }} catch (error) {{
                console.error('Error processing sales data:', error);
                addMessage('assistant', 'Sorry, I encountered an error loading the sales data.');
            }}
        }}
        """

        # Write the JavaScript function to a file
        with open('sales-data-embedded.js', 'w') as js_file:
            js_file.write(js_output)

        print(f"\nGenerated sales-data-embedded.js with full dataset")
        print("You can now replace the loadEmbeddedSalesData function in your HTML file")

    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return None

if __name__ == "__main__":
    convert_csv_to_js()