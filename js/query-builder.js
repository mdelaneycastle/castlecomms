/**
 * Query Builder - Modular SQL query assembly engine
 */
class QueryBuilder {
    constructor(schemaParser) {
        this.schema = schemaParser;
        this.query = {
            select: [],
            from: '',
            joins: [],
            where: [],
            groupBy: [],
            having: [],
            orderBy: [],
            limit: null
        };
        this.requiredTables = new Set();
        this.aliases = new Map();
    }

    /**
     * Reset the query builder
     */
    reset() {
        this.query = {
            select: [],
            from: '',
            joins: [],
            where: [],
            groupBy: [],
            having: [],
            orderBy: [],
            limit: null
        };
        this.requiredTables.clear();
        this.aliases.clear();
    }

    /**
     * Add SELECT clause
     */
    select(columns) {
        if (Array.isArray(columns)) {
            this.query.select.push(...columns);
        } else {
            this.query.select.push(columns);
        }
        return this;
    }

    /**
     * Set FROM clause
     */
    from(table, alias = null) {
        this.query.from = alias ? `${table} ${alias}` : table;
        this.requiredTables.add(table);
        if (alias) {
            this.aliases.set(table, alias);
        }
        return this;
    }

    /**
     * Add JOIN clause
     */
    join(type, table, alias, condition) {
        this.query.joins.push({
            type: type,
            table: table,
            alias: alias,
            condition: condition
        });
        this.requiredTables.add(table);
        if (alias) {
            this.aliases.set(table, alias);
        }
        return this;
    }

    /**
     * Add WHERE condition
     */
    where(condition) {
        this.query.where.push(condition);
        return this;
    }

    /**
     * Add GROUP BY clause
     */
    groupBy(columns) {
        if (Array.isArray(columns)) {
            this.query.groupBy.push(...columns);
        } else {
            this.query.groupBy.push(columns);
        }
        return this;
    }

    /**
     * Add HAVING clause
     */
    having(condition) {
        this.query.having.push(condition);
        return this;
    }

    /**
     * Add ORDER BY clause
     */
    orderBy(column, direction = 'ASC') {
        this.query.orderBy.push(`${column} ${direction}`);
        return this;
    }

    /**
     * Set LIMIT
     */
    limit(count) {
        this.query.limit = count;
        return this;
    }

    /**
     * Build the final SQL query
     */
    build() {
        let sql = '';

        // SELECT clause
        if (this.query.select.length > 0) {
            const selectClause = this.query.limit ?
                `SELECT TOP ${this.query.limit}\n    ` :
                'SELECT\n    ';
            sql += selectClause + this.query.select.join(',\n    ') + '\n';
        } else {
            sql += 'SELECT *\n';
        }

        // FROM clause
        if (this.query.from) {
            sql += `FROM ${this.query.from}\n`;
        }

        // JOIN clauses
        for (const join of this.query.joins) {
            sql += `${join.type} ${join.table}`;
            if (join.alias) {
                sql += ` ${join.alias}`;
            }
            sql += ` ON ${join.condition}\n`;
        }

        // WHERE clause
        if (this.query.where.length > 0) {
            sql += 'WHERE ' + this.query.where.join('\n  AND ') + '\n';
        }

        // GROUP BY clause
        if (this.query.groupBy.length > 0) {
            sql += 'GROUP BY ' + this.query.groupBy.join(', ') + '\n';
        }

        // HAVING clause
        if (this.query.having.length > 0) {
            sql += 'HAVING ' + this.query.having.join(' AND ') + '\n';
        }

        // ORDER BY clause
        if (this.query.orderBy.length > 0) {
            sql += 'ORDER BY ' + this.query.orderBy.join(', ') + '\n';
        }

        return sql.trim();
    }

    /**
     * Auto-configure joins based on required tables
     */
    autoJoin(requiredTables) {
        // Start with the most central table
        const primaryTable = this.determinePrimaryTable(requiredTables);
        const primaryAlias = this.schema.tables.get(primaryTable)?.alias || 'main';

        this.from(primaryTable, primaryAlias);

        // Generate required joins
        const joins = this.schema.generateJoins(requiredTables);

        for (const join of joins) {
            this.join(join.type, join.table, join.alias, join.condition);
        }

        return this;
    }

    /**
     * Determine the primary table to start FROM
     */
    determinePrimaryTable(requiredTables) {
        // Priority order for starting table
        const priority = [
            'Hal_SalesOrderHeader',  // Most central - links to everything
            'Hal_Customers',         // Second choice
            'Hal_GalleryMaster',     // Third choice
            'Hal_SalesOrderDetails', // Detail table
            'Hal_SalesPerson'        // Staff table
        ];

        for (const table of priority) {
            if (requiredTables.includes(table)) {
                return table;
            }
        }

        return requiredTables[0] || 'Hal_Customers';
    }

    /**
     * Add common patterns based on query type
     */
    applyTemplate(templateName, params = {}) {
        switch (templateName) {
            case 'top_customers':
                return this.buildTopCustomersQuery(params);
            case 'sales_by_gallery':
                return this.buildSalesByGalleryQuery(params);
            case 'sales_by_salesperson':
                return this.buildSalesBySalespersonQuery(params);
            case 'order_details':
                return this.buildOrderDetailsQuery(params);
            case 'customer_list':
                return this.buildCustomerListQuery(params);
            case 'list_salespeople':
                return this.buildSalespeopleListQuery(params);
            default:
                throw new Error(`Unknown template: ${templateName}`);
        }
    }

    /**
     * Build top customers query
     */
    buildTopCustomersQuery(params) {
        const limit = params.limit || 10;

        this.select([
            'c.CustID',
            'c.FirstName + \' \' + c.LastName as CustomerName',
            'g.Name as GalleryName',
            'COUNT(soh.SoId) as OrderCount',
            'SUM(soh.SOTotal) as TotalSpent',
            'AVG(soh.SOTotal) as AvgOrderValue'
        ])
        .from('Hal_Customers', 'c')
        .join('LEFT JOIN', 'Hal_SalesOrderHeader', 'soh', 'c.CustID = soh.CustID')
        .join('LEFT JOIN', 'Hal_GalleryMaster', 'g', 'c.GalleryCode = g.GalleryCode')
        .groupBy(['c.CustID', 'c.FirstName', 'c.LastName', 'g.Name'])
        .having('SUM(soh.SOTotal) > 0')
        .orderBy('TotalSpent', 'DESC')
        .limit(limit);

        return this;
    }

    /**
     * Build sales by gallery query
     */
    buildSalesByGalleryQuery(params) {
        this.select([
            'g.GalleryCode',
            'g.Name as GalleryName',
            'COUNT(soh.SoId) as OrderCount',
            'SUM(soh.SOTotal) as TotalSales',
            'AVG(soh.SOTotal) as AvgOrderValue',
            'COUNT(DISTINCT soh.CustID) as UniqueCustomers'
        ])
        .from('Hal_GalleryMaster', 'g')
        .join('LEFT JOIN', 'Hal_SalesOrderHeader', 'soh', 'g.GalleryCode = soh.GalleryCode')
        .groupBy(['g.GalleryCode', 'g.Name'])
        .orderBy('TotalSales', 'DESC');

        return this;
    }

    /**
     * Build sales by salesperson query
     */
    buildSalesBySalespersonQuery(params) {
        this.select([
            'sp.SLPNum',
            'sp.Name as SalespersonName',
            'g.Name as GalleryName',
            'COUNT(soh.SoId) as OrderCount',
            'SUM(soh.SOTotal) as TotalSales',
            'AVG(soh.SOTotal) as AvgOrderValue',
            'SUM(soh.Commission) as TotalCommission'
        ])
        .from('Hal_SalesPerson', 'sp')
        .join('LEFT JOIN', 'Hal_SalesOrderHeader', 'soh', 'sp.SLPNum = soh.SlpNum')
        .join('LEFT JOIN', 'Hal_GalleryMaster', 'g', 'sp.GalleryCode = g.GalleryCode')
        .groupBy(['sp.SLPNum', 'sp.Name', 'g.Name'])
        .orderBy('TotalSales', 'DESC');

        return this;
    }

    /**
     * Build order details query
     */
    buildOrderDetailsQuery(params) {
        this.select([
            'soh.SoId',
            'soh.SODate',
            'soh.SOTotal',
            'c.FirstName + \' \' + c.LastName as CustomerName',
            'g.Name as GalleryName',
            'sp.Name as SalespersonName',
            'sod.ItemCode',
            'sod.Qty',
            'sod.SoldPrice'
        ])
        .from('Hal_SalesOrderHeader', 'soh')
        .join('LEFT JOIN', 'Hal_Customers', 'c', 'soh.CustID = c.CustID')
        .join('LEFT JOIN', 'Hal_GalleryMaster', 'g', 'soh.GalleryCode = g.GalleryCode')
        .join('LEFT JOIN', 'Hal_SalesPerson', 'sp', 'soh.SlpNum = sp.SLPNum')
        .join('LEFT JOIN', 'Hal_SalesOrderDetails', 'sod', 'soh.SoId = sod.SoId')
        .orderBy('soh.SODate', 'DESC');

        return this;
    }

    /**
     * Build customer list query
     */
    buildCustomerListQuery(params) {
        this.select([
            'c.CustID',
            'c.FirstName',
            'c.LastName',
            'c.Email',
            'c.Mobile',
            'g.Name as GalleryName',
            'sp.Name as SalespersonName'
        ])
        .from('Hal_Customers', 'c')
        .join('LEFT JOIN', 'Hal_GalleryMaster', 'g', 'c.GalleryCode = g.GalleryCode')
        .join('LEFT JOIN', 'Hal_SalesPerson', 'sp', 'c.SlpNum = sp.SLPNum')
        .orderBy('c.LastName, c.FirstName');

        return this;
    }

    /**
     * Add date filtering to the query
     */
    addDateFilter(dateConditions) {
        for (const condition of dateConditions) {
            this.where(condition);
        }
        return this;
    }

    /**
     * Add amount filtering to the query
     */
    addAmountFilter(operator, amount, column = 'soh.SOTotal') {
        this.where(`${column} ${operator} ${amount}`);
        return this;
    }

    /**
     * Add text filtering to the query
     */
    addTextFilter(column, operator, value) {
        if (operator === 'LIKE') {
            this.where(`${column} LIKE '%${value}%'`);
        } else {
            this.where(`${column} ${operator} '${value}'`);
        }
        return this;
    }

    /**
     * Add gallery filtering
     */
    addGalleryFilter(galleryName) {
        this.where(`g.Name LIKE '%${galleryName}%'`);
        return this;
    }

    /**
     * Add salesperson filtering
     */
    addSalespersonFilter(salespersonName) {
        this.where(`sp.Name LIKE '%${salespersonName}%'`);
        return this;
    }

    /**
     * Build salespeople list query
     */
    buildSalespeopleListQuery(params) {
        this.select([
            'sp.SLPNum',
            'sp.Name as SalespersonName',
            'g.Name as GalleryName',
            'sp.Email',
            'sp.Phone',
            'sp.Commission as CommissionRate'
        ])
        .from('Hal_SalesPerson', 'sp')
        .join('LEFT JOIN', 'Hal_GalleryMaster', 'g', 'sp.GalleryCode = g.GalleryCode')
        .orderBy('sp.Name');

        return this;
    }
}

// Export for use in other modules
window.QueryBuilder = QueryBuilder;