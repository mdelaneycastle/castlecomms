/**
 * Query Templates Library - Expanded collection of pre-built query patterns
 */
class QueryTemplates {
    constructor() {
        this.templates = this.buildTemplates();
        this.patterns = this.buildPatterns();
    }

    /**
     * Build comprehensive template library
     */
    buildTemplates() {
        return {
            // Customer Analysis Templates
            top_customers: {
                name: 'Top Customers by Spending',
                description: 'Shows highest spending customers with order count and average order value',
                query: `SELECT TOP {limit}
    c.CustID,
    c.FirstName + ' ' + c.LastName as CustomerName,
    c.Email,
    g.Name as GalleryName,
    sp.Name as SalespersonName,
    COUNT(soh.SoId) as OrderCount,
    SUM(soh.SOTotal) as TotalSpent,
    AVG(soh.SOTotal) as AvgOrderValue,
    MAX(soh.SODate) as LastOrderDate
FROM Hal_Customers c
LEFT JOIN Hal_SalesOrderHeader soh ON c.CustID = soh.CustID
LEFT JOIN Hal_GalleryMaster g ON c.GalleryCode = g.GalleryCode
LEFT JOIN Hal_SalesPerson sp ON soh.SlpNum = sp.SLPNum
{where_clause}
GROUP BY c.CustID, c.FirstName, c.LastName, c.Email, g.Name, sp.Name
HAVING SUM(soh.SOTotal) > 0
ORDER BY TotalSpent DESC`,
                defaultParams: { limit: 10 },
                requiredTables: ['Hal_Customers', 'Hal_SalesOrderHeader', 'Hal_GalleryMaster', 'Hal_SalesPerson']
            },

            inactive_customers: {
                name: 'Inactive Customers',
                description: 'Customers who haven\'t purchased in a specified time period',
                query: `SELECT
    c.CustID,
    c.FirstName + ' ' + c.LastName as CustomerName,
    c.Email,
    c.Mobile,
    g.Name as GalleryName,
    MAX(soh.SODate) as LastOrderDate,
    DATEDIFF(day, MAX(soh.SODate), GETDATE()) as DaysSinceLastOrder,
    SUM(soh.SOTotal) as TotalHistoricalSpent
FROM Hal_Customers c
LEFT JOIN Hal_SalesOrderHeader soh ON c.CustID = soh.CustID
LEFT JOIN Hal_GalleryMaster g ON c.GalleryCode = g.GalleryCode
{where_clause}
GROUP BY c.CustID, c.FirstName, c.LastName, c.Email, c.Mobile, g.Name
HAVING MAX(soh.SODate) < DATEADD(month, -{months}, GETDATE()) OR MAX(soh.SODate) IS NULL
ORDER BY LastOrderDate DESC`,
                defaultParams: { months: 6 },
                requiredTables: ['Hal_Customers', 'Hal_SalesOrderHeader', 'Hal_GalleryMaster']
            },

            new_customers: {
                name: 'New Customers',
                description: 'Recently acquired customers in specified time period',
                query: `SELECT
    c.CustID,
    c.FirstName + ' ' + c.LastName as CustomerName,
    c.Email,
    c.CreatedDate,
    g.Name as GalleryName,
    MIN(soh.SODate) as FirstOrderDate,
    COUNT(soh.SoId) as OrderCount,
    SUM(soh.SOTotal) as TotalSpent
FROM Hal_Customers c
LEFT JOIN Hal_SalesOrderHeader soh ON c.CustID = soh.CustID
LEFT JOIN Hal_GalleryMaster g ON c.GalleryCode = g.GalleryCode
WHERE c.CreatedDate >= DATEADD(month, -{months}, GETDATE())
{additional_where}
GROUP BY c.CustID, c.FirstName, c.LastName, c.Email, c.CreatedDate, g.Name
ORDER BY c.CreatedDate DESC`,
                defaultParams: { months: 3 },
                requiredTables: ['Hal_Customers', 'Hal_SalesOrderHeader', 'Hal_GalleryMaster']
            },

            // Sales Analysis Templates
            sales_by_gallery: {
                name: 'Sales Performance by Gallery',
                description: 'Revenue, order count, and customer metrics by gallery location',
                query: `SELECT
    g.GalleryCode,
    g.Name as GalleryName,
    g.GalleryType,
    COUNT(soh.SoId) as OrderCount,
    COUNT(DISTINCT soh.CustID) as UniqueCustomers,
    SUM(soh.SOTotal) as TotalSales,
    AVG(soh.SOTotal) as AvgOrderValue,
    MAX(soh.SODate) as LastSaleDate,
    SUM(CASE WHEN soh.SODate >= DATEADD(month, -1, GETDATE()) THEN soh.SOTotal ELSE 0 END) as LastMonthSales
FROM Hal_GalleryMaster g
LEFT JOIN Hal_SalesOrderHeader soh ON g.GalleryCode = soh.GalleryCode
{where_clause}
GROUP BY g.GalleryCode, g.Name, g.GalleryType
ORDER BY TotalSales DESC`,
                defaultParams: {},
                requiredTables: ['Hal_GalleryMaster', 'Hal_SalesOrderHeader']
            },

            sales_by_salesperson: {
                name: 'Sales Performance by Salesperson',
                description: 'Individual sales performance with commission tracking',
                query: `SELECT
    sp.SLPNum,
    sp.Name as SalespersonName,
    g.Name as GalleryName,
    COUNT(soh.SoId) as OrderCount,
    COUNT(DISTINCT soh.CustID) as UniqueCustomers,
    SUM(soh.SOTotal) as TotalSales,
    AVG(soh.SOTotal) as AvgOrderValue,
    SUM(soh.Commission) as TotalCommission,
    AVG(soh.Commission) as AvgCommission,
    MAX(soh.SODate) as LastSaleDate
FROM Hal_SalesPerson sp
LEFT JOIN Hal_SalesOrderHeader soh ON sp.SLPNum = soh.SlpNum
LEFT JOIN Hal_GalleryMaster g ON sp.GalleryCode = g.GalleryCode
{where_clause}
GROUP BY sp.SLPNum, sp.Name, g.Name
ORDER BY TotalSales DESC`,
                defaultParams: {},
                requiredTables: ['Hal_SalesPerson', 'Hal_SalesOrderHeader', 'Hal_GalleryMaster']
            },

            sales_trend: {
                name: 'Sales Trend Analysis',
                description: 'Monthly or quarterly sales trends',
                query: `SELECT
    YEAR(soh.SODate) as SalesYear,
    {period_selector} as SalesPeriod,
    COUNT(soh.SoId) as OrderCount,
    COUNT(DISTINCT soh.CustID) as UniqueCustomers,
    SUM(soh.SOTotal) as TotalSales,
    AVG(soh.SOTotal) as AvgOrderValue
FROM Hal_SalesOrderHeader soh
{where_clause}
GROUP BY YEAR(soh.SODate), {period_selector}
ORDER BY SalesYear, SalesPeriod`,
                defaultParams: { period: 'month' },
                requiredTables: ['Hal_SalesOrderHeader']
            },

            // Order Analysis Templates
            high_value_orders: {
                name: 'High Value Orders',
                description: 'Orders above specified amount with customer details',
                query: `SELECT
    soh.SoId,
    soh.SODate,
    soh.SOTotal,
    soh.SoBalance,
    c.FirstName + ' ' + c.LastName as CustomerName,
    c.Email,
    g.Name as GalleryName,
    sp.Name as SalespersonName,
    COUNT(sod.AutoId) as ItemCount
FROM Hal_SalesOrderHeader soh
JOIN Hal_Customers c ON soh.CustID = c.CustID
LEFT JOIN Hal_GalleryMaster g ON soh.GalleryCode = g.GalleryCode
LEFT JOIN Hal_SalesPerson sp ON soh.SlpNum = sp.SLPNum
LEFT JOIN Hal_SalesOrderDetails sod ON soh.SoId = sod.SoId
WHERE soh.SOTotal >= {min_amount}
{additional_where}
GROUP BY soh.SoId, soh.SODate, soh.SOTotal, soh.SoBalance, c.FirstName, c.LastName, c.Email, g.Name, sp.Name
ORDER BY soh.SOTotal DESC`,
                defaultParams: { min_amount: 1000 },
                requiredTables: ['Hal_SalesOrderHeader', 'Hal_Customers', 'Hal_GalleryMaster', 'Hal_SalesPerson', 'Hal_SalesOrderDetails']
            },

            pending_orders: {
                name: 'Pending Orders',
                description: 'Orders with outstanding balances or pending status',
                query: `SELECT
    soh.SoId,
    soh.SODate,
    soh.SOTotal,
    soh.SoBalance,
    soh.SOStatus,
    c.FirstName + ' ' + c.LastName as CustomerName,
    c.Email,
    c.Mobile,
    g.Name as GalleryName,
    sp.Name as SalespersonName,
    DATEDIFF(day, soh.SODate, GETDATE()) as DaysOld
FROM Hal_SalesOrderHeader soh
JOIN Hal_Customers c ON soh.CustID = c.CustID
LEFT JOIN Hal_GalleryMaster g ON soh.GalleryCode = g.GalleryCode
LEFT JOIN Hal_SalesPerson sp ON soh.SlpNum = sp.SLPNum
WHERE (soh.SoBalance > 0 OR soh.SOStatus IN ('Pending', 'Outstanding', 'Incomplete'))
{additional_where}
ORDER BY soh.SoBalance DESC, soh.SODate`,
                defaultParams: {},
                requiredTables: ['Hal_SalesOrderHeader', 'Hal_Customers', 'Hal_GalleryMaster', 'Hal_SalesPerson']
            },

            order_details: {
                name: 'Order Details',
                description: 'Detailed view of orders with item breakdown',
                query: `SELECT
    soh.SoId,
    soh.SODate,
    soh.SOTotal,
    c.FirstName + ' ' + c.LastName as CustomerName,
    g.Name as GalleryName,
    sp.Name as SalespersonName,
    sod.ItemCode,
    sod.Qty,
    sod.SoldPrice,
    sod.RetailPrice,
    sod.DiscountAmount,
    (sod.SoldPrice * sod.Qty) as LineTotal
FROM Hal_SalesOrderHeader soh
JOIN Hal_Customers c ON soh.CustID = c.CustID
LEFT JOIN Hal_GalleryMaster g ON soh.GalleryCode = g.GalleryCode
LEFT JOIN Hal_SalesPerson sp ON soh.SlpNum = sp.SLPNum
LEFT JOIN Hal_SalesOrderDetails sod ON soh.SoId = sod.SoId
{where_clause}
ORDER BY soh.SODate DESC, soh.SoId, sod.lnNo`,
                defaultParams: {},
                requiredTables: ['Hal_SalesOrderHeader', 'Hal_Customers', 'Hal_GalleryMaster', 'Hal_SalesPerson', 'Hal_SalesOrderDetails']
            },

            // Product Analysis Templates
            top_selling_items: {
                name: 'Top Selling Items',
                description: 'Most popular products by quantity or revenue',
                query: `SELECT TOP {limit}
    sod.ItemCode,
    SUM(sod.Qty) as TotalQuantitySold,
    COUNT(DISTINCT sod.SoId) as OrderCount,
    SUM(sod.SoldPrice * sod.Qty) as TotalRevenue,
    AVG(sod.SoldPrice) as AvgSoldPrice,
    MAX(sod.RetailPrice) as RetailPrice,
    COUNT(DISTINCT soh.CustID) as UniqueCustomers
FROM Hal_SalesOrderDetails sod
JOIN Hal_SalesOrderHeader soh ON sod.SoId = soh.SoId
{where_clause}
GROUP BY sod.ItemCode
ORDER BY {order_by} DESC`,
                defaultParams: { limit: 20, order_by: 'TotalRevenue' },
                requiredTables: ['Hal_SalesOrderDetails', 'Hal_SalesOrderHeader']
            },

            // Commission Analysis
            commission_report: {
                name: 'Commission Report',
                description: 'Commission earnings by salesperson',
                query: `SELECT
    sp.SLPNum,
    sp.Name as SalespersonName,
    g.Name as GalleryName,
    COUNT(soh.SoId) as OrderCount,
    SUM(soh.SOTotal) as TotalSales,
    SUM(soh.Commission) as TotalCommission,
    SUM(soh.Commission2) as SharedCommission2,
    SUM(soh.Commission3) as SharedCommission3,
    (SUM(soh.Commission) + ISNULL(SUM(soh.Commission2), 0) + ISNULL(SUM(soh.Commission3), 0)) as TotalAllCommissions,
    AVG(soh.Commission / NULLIF(soh.SOTotal, 0) * 100) as AvgCommissionRate
FROM Hal_SalesPerson sp
LEFT JOIN Hal_SalesOrderHeader soh ON sp.SLPNum = soh.SlpNum
LEFT JOIN Hal_GalleryMaster g ON sp.GalleryCode = g.GalleryCode
{where_clause}
GROUP BY sp.SLPNum, sp.Name, g.Name
HAVING SUM(soh.Commission) > 0
ORDER BY TotalAllCommissions DESC`,
                defaultParams: {},
                requiredTables: ['Hal_SalesPerson', 'Hal_SalesOrderHeader', 'Hal_GalleryMaster']
            },

            // Staff/Salesperson Templates
            list_salespeople: {
                name: 'List All Salespeople',
                description: 'Show all sales staff with their gallery assignments',
                query: `SELECT
    sp.SLPNum,
    sp.Name as SalespersonName,
    g.Name as GalleryName,
    sp.Email,
    sp.Phone,
    sp.Commission as CommissionRate
FROM Hal_SalesPerson sp
LEFT JOIN Hal_GalleryMaster g ON sp.GalleryCode = g.GalleryCode
{where_clause}
ORDER BY sp.Name`,
                defaultParams: {},
                requiredTables: ['Hal_SalesPerson', 'Hal_GalleryMaster']
            },

            // Data Quality Templates
            duplicate_emails: {
                name: 'Duplicate Email Addresses',
                description: 'Find customers with duplicate email addresses',
                query: `SELECT
    c.Email,
    COUNT(*) as DuplicateCount,
    STRING_AGG(CAST(c.CustID as VARCHAR), ', ') as CustomerIDs,
    STRING_AGG(c.FirstName + ' ' + c.LastName, ', ') as CustomerNames
FROM Hal_Customers c
WHERE c.Email IS NOT NULL AND c.Email != ''
{where_clause}
GROUP BY c.Email
HAVING COUNT(*) > 1
ORDER BY DuplicateCount DESC`,
                defaultParams: {},
                requiredTables: ['Hal_Customers']
            },

            missing_data: {
                name: 'Missing Data Report',
                description: 'Identify customers with missing important information',
                query: `SELECT
    c.CustID,
    c.FirstName + ' ' + c.LastName as CustomerName,
    g.Name as GalleryName,
    CASE WHEN c.Email IS NULL OR c.Email = '' THEN 'Missing' ELSE 'OK' END as EmailStatus,
    CASE WHEN c.Mobile IS NULL OR c.Mobile = '' THEN 'Missing' ELSE 'OK' END as MobileStatus,
    CASE WHEN c.Home_Address IS NULL OR c.Home_Address = '' THEN 'Missing' ELSE 'OK' END as AddressStatus,
    CASE WHEN c.Home_PostCode IS NULL OR c.Home_PostCode = '' THEN 'Missing' ELSE 'OK' END as PostCodeStatus
FROM Hal_Customers c
LEFT JOIN Hal_GalleryMaster g ON c.GalleryCode = g.GalleryCode
WHERE (c.Email IS NULL OR c.Email = '')
   OR (c.Mobile IS NULL OR c.Mobile = '')
   OR (c.Home_Address IS NULL OR c.Home_Address = '')
   OR (c.Home_PostCode IS NULL OR c.Home_PostCode = '')
{additional_where}
ORDER BY c.LastName, c.FirstName`,
                defaultParams: {},
                requiredTables: ['Hal_Customers', 'Hal_GalleryMaster']
            }
        };
    }

    /**
     * Build pattern matching for template selection
     */
    buildPatterns() {
        return {
            // Customer patterns
            top_customers: ['top', 'best', 'highest', 'spending', 'customers'],
            inactive_customers: ['inactive', 'haven\'t', 'not bought', 'old', 'dormant'],
            new_customers: ['new', 'recent', 'latest', 'acquired'],

            // Sales patterns
            sales_by_gallery: ['sales', 'gallery', 'location', 'performance'],
            sales_by_salesperson: ['sales', 'salesperson', 'staff', 'rep', 'performance'],
            sales_trend: ['trend', 'monthly', 'quarterly', 'growth'],

            // Order patterns
            high_value_orders: ['high', 'large', 'big', 'over', 'above', 'expensive'],
            pending_orders: ['pending', 'outstanding', 'incomplete', 'balance'],
            order_details: ['order', 'details', 'breakdown', 'items'],

            // Product patterns
            top_selling_items: ['items', 'products', 'selling', 'popular'],

            // Staff/Salesperson patterns
            list_salespeople: ['show', 'list', 'all', 'salespeople', 'staff', 'employees'],

            // Commission patterns
            commission_report: ['commission', 'earnings', 'bonus'],

            // Data quality patterns
            duplicate_emails: ['duplicate', 'duplicate email', 'same email'],
            missing_data: ['missing', 'incomplete', 'blank', 'empty']
        };
    }

    /**
     * Get template by name
     */
    getTemplate(name) {
        return this.templates[name];
    }

    /**
     * Find best matching template based on keywords
     */
    findBestTemplate(keywords, intent = null) {
        const scores = new Map();

        // Score each template based on keyword matches
        for (const [templateName, pattern] of Object.entries(this.patterns)) {
            let score = 0;
            for (const keyword of keywords) {
                if (pattern.includes(keyword)) {
                    score += 1;
                }
            }
            if (score > 0) {
                scores.set(templateName, score);
            }
        }

        // Use intent if available
        if (intent && intent.queryType && this.templates[intent.queryType]) {
            const intentScore = scores.get(intent.queryType) || 0;
            scores.set(intent.queryType, intentScore + 2); // Boost intent match
        }

        // Return highest scoring template
        if (scores.size > 0) {
            const [bestTemplate] = [...scores.entries()].reduce((a, b) => a[1] > b[1] ? a : b);
            return bestTemplate;
        }

        return 'order_details'; // Default fallback
    }

    /**
     * Get all available templates
     */
    getAllTemplates() {
        return Object.keys(this.templates);
    }

    /**
     * Get template suggestions based on partial match
     */
    getSuggestions(input) {
        const lowerInput = input.toLowerCase();
        const suggestions = [];

        for (const [templateName, template] of Object.entries(this.templates)) {
            const pattern = this.patterns[templateName] || [];
            for (const keyword of pattern) {
                if (lowerInput.includes(keyword)) {
                    suggestions.push({
                        name: templateName,
                        title: template.name,
                        description: template.description
                    });
                    break;
                }
            }
        }

        return suggestions.slice(0, 5); // Return top 5 suggestions
    }

    /**
     * Process template parameters
     */
    processTemplate(templateName, params = {}) {
        const template = this.templates[templateName];
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        let query = template.query;
        const finalParams = { ...template.defaultParams, ...params };

        // Replace parameter placeholders
        for (const [key, value] of Object.entries(finalParams)) {
            const placeholder = `{${key}}`;
            query = query.replace(new RegExp(placeholder, 'g'), value);
        }

        // Handle special cases
        query = this.processSpecialPlaceholders(query, finalParams);

        return {
            query: query,
            params: finalParams,
            requiredTables: template.requiredTables
        };
    }

    /**
     * Process special template placeholders
     */
    processSpecialPlaceholders(query, params) {
        // Handle period selector for trends
        if (query.includes('{period_selector}')) {
            const periodSelector = params.period === 'quarter' ?
                'DATEPART(quarter, soh.SODate)' :
                'MONTH(soh.SODate)';
            query = query.replace(/{period_selector}/g, periodSelector);
        }

        // Handle where clause placeholders
        if (query.includes('{where_clause}') && !params.where_conditions) {
            query = query.replace('{where_clause}', '');
        }

        if (query.includes('{additional_where}') && !params.additional_conditions) {
            query = query.replace('{additional_where}', '');
        }

        return query;
    }

    /**
     * Format query with proper line breaks and indentation
     */
    formatQuery(query) {
        return query
            // First, fix broken JOINs that got split across lines
            .replace(/LEFT\s*\n\s*JOIN/gi, 'LEFT JOIN')
            .replace(/INNER\s*\n\s*JOIN/gi, 'INNER JOIN')
            .replace(/RIGHT\s*\n\s*JOIN/gi, 'RIGHT JOIN')
            .replace(/FULL\s*\n\s*JOIN/gi, 'FULL JOIN')
            // Fix any remaining broken JOINs
            .replace(/\n\s*JOIN\b/gi, ' JOIN')
            // Now ensure major SQL keywords start on new lines (but don't break JOINs)
            .replace(/(\w)\s+FROM\b/gi, '$1\nFROM')
            .replace(/(\w)\s+(LEFT JOIN|RIGHT JOIN|INNER JOIN|FULL JOIN)\b/gi, '$1\n$2')
            .replace(/(\w)\s+WHERE\b/gi, '$1\nWHERE')
            .replace(/(\w)\s+GROUP BY\b/gi, '$1\nGROUP BY')
            .replace(/(\w)\s+HAVING\b/gi, '$1\nHAVING')
            .replace(/(\w)\s+ORDER BY\b/gi, '$1\nORDER BY')
            // Clean up extra spaces and normalize
            .replace(/\n\s*\n/g, '\n')
            .replace(/^\n/, '')
            .trim();
    }
}

// Export for use in other modules
window.QueryTemplates = QueryTemplates;