/**
 * Schema Parser - Auto-generates keyword mappings from CSV schema
 */
class SchemaParser {
    constructor() {
        this.tables = new Map();
        this.keywordMappings = new Map();
        this.relationships = new Map();
    }

    /**
     * Parse CSV schema and build keyword mappings
     */
    parseSchema(csvText) {
        const lines = csvText.split('\n');

        for (const line of lines) {
            if (!line.trim()) continue;

            const [tableName, columnName, dataType] = line.split(',').map(s => s.trim());

            if (!tableName || !columnName) continue;

            // Store table structure
            if (!this.tables.has(tableName)) {
                this.tables.set(tableName, {
                    name: tableName,
                    alias: this.generateTableAlias(tableName),
                    columns: new Map()
                });
            }

            this.tables.get(tableName).columns.set(columnName, {
                name: columnName,
                type: dataType,
                keywords: this.generateColumnKeywords(columnName, dataType)
            });
        }

        this.buildKeywordMappings();
        this.detectRelationships();

        return {
            tables: this.tables,
            keywordMappings: this.keywordMappings,
            relationships: this.relationships
        };
    }

    /**
     * Generate table alias (e.g., Hal_Customers -> c)
     */
    generateTableAlias(tableName) {
        const aliases = {
            'Hal_Customers': 'c',
            'Hal_GalleryMaster': 'g',
            'Hal_SalesOrderHeader': 'soh',
            'Hal_SalesOrderDetails': 'sod',
            'Hal_SalesPerson': 'sp'
        };

        return aliases[tableName] || tableName.toLowerCase().charAt(0);
    }

    /**
     * Generate keywords for a column based on name and type
     */
    generateColumnKeywords(columnName, dataType) {
        const keywords = [];
        const lowerName = columnName.toLowerCase();

        // Add the column name itself
        keywords.push(lowerName);

        // Name-based keywords
        const namePatterns = {
            'custid': ['customer', 'client', 'customerid'],
            'firstname': ['firstname', 'forename', 'fname', 'given'],
            'lastname': ['lastname', 'surname', 'lname', 'family'],
            'email': ['email', 'mail', 'address'],
            'mobile': ['mobile', 'phone', 'cell', 'cellular'],
            'homephone': ['home', 'homephone', 'house'],
            'workphone': ['work', 'office', 'business'],
            'gallerycode': ['gallery', 'location', 'store', 'branch'],
            'galleryname': ['gallery', 'galleryname', 'location', 'store'],
            'name': ['name', 'title', 'description'],
            'soid': ['order', 'orderid', 'sale', 'saleid'],
            'sodate': ['date', 'orderdate', 'saledate', 'when'],
            'sototal': ['total', 'amount', 'value', 'price', 'cost'],
            'sobalance': ['balance', 'outstanding', 'owing', 'due'],
            'slpnum': ['salesperson', 'sales', 'rep', 'staff'],
            'qty': ['quantity', 'qty', 'amount', 'number'],
            'soldprice': ['price', 'cost', 'value', 'amount'],
            'retailprice': ['retail', 'rrp', 'listprice'],
            'itemcode': ['item', 'product', 'code', 'sku'],
            'commission': ['commission', 'bonus', 'reward'],
            'vat': ['vat', 'tax', 'gst'],
            'discount': ['discount', 'reduction', 'saving'],
            'address': ['address', 'location', 'street'],
            'postcode': ['postcode', 'zip', 'postal'],
            'country': ['country', 'nation'],
            'balance': ['balance', 'amount', 'total'],
            'status': ['status', 'state', 'condition']
        };

        // Find matching patterns
        for (const [pattern, synonyms] of Object.entries(namePatterns)) {
            if (lowerName.includes(pattern)) {
                keywords.push(...synonyms);
            }
        }

        // Type-based keywords
        if (dataType) {
            const typePatterns = {
                'datetime': ['date', 'time', 'when'],
                'smalldatetime': ['date', 'time', 'when'],
                'date': ['date', 'when'],
                'money': ['money', 'amount', 'value', 'price'],
                'decimal': ['amount', 'value', 'number'],
                'float': ['amount', 'value', 'number'],
                'int': ['number', 'count', 'id'],
                'bigint': ['number', 'count', 'id'],
                'varchar': ['text', 'name', 'description'],
                'nvarchar': ['text', 'name', 'description'],
                'char': ['code', 'flag', 'status'],
                'bit': ['flag', 'boolean', 'yes', 'no']
            };

            const lowerType = dataType.toLowerCase();
            for (const [type, typeKeywords] of Object.entries(typePatterns)) {
                if (lowerType.includes(type)) {
                    keywords.push(...typeKeywords);
                    break;
                }
            }
        }

        // Remove duplicates and return
        return [...new Set(keywords)];
    }

    /**
     * Build the global keyword mappings
     */
    buildKeywordMappings() {
        for (const [tableName, table] of this.tables) {
            // Table-level keywords
            const tableKeywords = this.generateTableKeywords(tableName);
            for (const keyword of tableKeywords) {
                if (!this.keywordMappings.has(keyword)) {
                    this.keywordMappings.set(keyword, []);
                }
                this.keywordMappings.get(keyword).push({
                    type: 'table',
                    table: tableName,
                    alias: table.alias
                });
            }

            // Column-level keywords
            for (const [columnName, column] of table.columns) {
                for (const keyword of column.keywords) {
                    if (!this.keywordMappings.has(keyword)) {
                        this.keywordMappings.set(keyword, []);
                    }
                    this.keywordMappings.get(keyword).push({
                        type: 'column',
                        table: tableName,
                        alias: table.alias,
                        column: columnName,
                        dataType: column.type,
                        fullReference: `${table.alias}.${columnName}`
                    });
                }
            }
        }
    }

    /**
     * Generate table-level keywords
     */
    generateTableKeywords(tableName) {
        const tablePatterns = {
            'Hal_Customers': ['customer', 'customers', 'client', 'clients', 'people', 'person'],
            'Hal_GalleryMaster': ['gallery', 'galleries', 'location', 'locations', 'store', 'stores', 'branch', 'branches'],
            'Hal_SalesOrderHeader': ['order', 'orders', 'sale', 'sales', 'transaction', 'transactions'],
            'Hal_SalesOrderDetails': ['item', 'items', 'product', 'products', 'detail', 'details', 'line', 'lines'],
            'Hal_SalesPerson': ['salesperson', 'salespeople', 'staff', 'employee', 'employees', 'rep', 'reps']
        };

        return tablePatterns[tableName] || [tableName.toLowerCase()];
    }

    /**
     * Detect relationships between tables
     */
    detectRelationships() {
        const relationships = [
            {
                from: 'Hal_Customers',
                to: 'Hal_SalesOrderHeader',
                fromKey: 'CustID',
                toKey: 'CustID',
                type: 'one-to-many'
            },
            {
                from: 'Hal_GalleryMaster',
                to: 'Hal_Customers',
                fromKey: 'GalleryCode',
                toKey: 'GalleryCode',
                type: 'one-to-many'
            },
            {
                from: 'Hal_GalleryMaster',
                to: 'Hal_SalesOrderHeader',
                fromKey: 'GalleryCode',
                toKey: 'GalleryCode',
                type: 'one-to-many'
            },
            {
                from: 'Hal_SalesOrderHeader',
                to: 'Hal_SalesOrderDetails',
                fromKey: 'SoId',
                toKey: 'SoId',
                type: 'one-to-many'
            },
            {
                from: 'Hal_SalesPerson',
                to: 'Hal_SalesOrderHeader',
                fromKey: 'SLPNum',
                toKey: 'SlpNum',
                type: 'one-to-many'
            },
            {
                from: 'Hal_SalesPerson',
                to: 'Hal_Customers',
                fromKey: 'SLPNum',
                toKey: 'SlpNum',
                type: 'one-to-many'
            }
        ];

        for (const rel of relationships) {
            this.relationships.set(`${rel.from}-${rel.to}`, rel);
        }
    }

    /**
     * Get tables that need to be joined for given keywords
     */
    getRequiredTables(keywords) {
        const requiredTables = new Set();

        for (const keyword of keywords) {
            const mappings = this.keywordMappings.get(keyword) || [];
            for (const mapping of mappings) {
                requiredTables.add(mapping.table);
            }
        }

        return Array.from(requiredTables);
    }

    /**
     * Generate JOIN statements for required tables
     */
    generateJoins(requiredTables) {
        const joins = [];
        const addedTables = new Set();

        // Start with most connected table (usually SalesOrderHeader)
        const startTable = 'Hal_SalesOrderHeader';
        if (requiredTables.includes(startTable)) {
            addedTables.add(startTable);
        }

        // Add joins in dependency order
        const joinOrder = [
            { table: 'Hal_Customers', via: 'Hal_SalesOrderHeader' },
            { table: 'Hal_GalleryMaster', via: 'Hal_SalesOrderHeader' },
            { table: 'Hal_SalesOrderDetails', via: 'Hal_SalesOrderHeader' },
            { table: 'Hal_SalesPerson', via: 'Hal_SalesOrderHeader' }
        ];

        for (const { table, via } of joinOrder) {
            if (requiredTables.includes(table) && !addedTables.has(table)) {
                if (addedTables.has(via)) {
                    const rel = this.relationships.get(`${via}-${table}`) ||
                               this.relationships.get(`${table}-${via}`);

                    if (rel) {
                        const fromTable = this.tables.get(rel.from);
                        const toTable = this.tables.get(rel.to);

                        joins.push({
                            type: 'LEFT JOIN',
                            table: table,
                            alias: this.tables.get(table).alias,
                            condition: `${fromTable.alias}.${rel.fromKey} = ${toTable.alias}.${rel.toKey}`
                        });

                        addedTables.add(table);
                    }
                }
            }
        }

        return joins;
    }
}

// Export for use in other modules
window.SchemaParser = SchemaParser;