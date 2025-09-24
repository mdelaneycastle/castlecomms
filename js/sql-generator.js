/**
 * Main SQL Generator Application - Orchestrates all components
 */
class SQLGenerator {
    constructor() {
        this.schemaParser = new SchemaParser();
        this.dateParser = new DateParser();
        this.queryTemplates = new QueryTemplates();
        this.keywordDetector = null; // Will be initialized after schema is loaded
        this.queryBuilder = null;   // Will be initialized after schema is loaded

        this.isInitialized = false;
        this.lastQuery = null;
        this.queryHistory = [];
    }

    /**
     * Initialize the generator with CSV schema
     */
    async initialize(csvText) {
        try {
            // Parse schema
            const schemaResult = this.schemaParser.parseSchema(csvText);

            // Initialize dependent components
            this.keywordDetector = new KeywordDetector(this.schemaParser);
            this.queryBuilder = new QueryBuilder(this.schemaParser);

            this.isInitialized = true;

            console.log('SQL Generator initialized with:', {
                tables: schemaResult.tables.size,
                keywordMappings: schemaResult.keywordMappings.size,
                relationships: schemaResult.relationships.size
            });

            return {
                success: true,
                stats: {
                    tables: schemaResult.tables.size,
                    keywords: schemaResult.keywordMappings.size,
                    relationships: schemaResult.relationships.size
                }
            };

        } catch (error) {
            console.error('Failed to initialize SQL Generator:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate SQL query from natural language input
     */
    generateQuery(input) {
        if (!this.isInitialized) {
            return {
                success: false,
                error: 'Generator not initialized. Please load schema first.',
                suggestions: ['Load the schema file first']
            };
        }

        try {
            // Step 1: Tokenize and detect keywords
            const tokens = this.keywordDetector.tokenize(input);
            const detection = this.keywordDetector.detectKeywords(tokens);

            // Step 2: Parse dates
            const dateInfo = this.dateParser.parseDates(input);

            // Step 3: Analyze intent
            const intent = this.keywordDetector.analyzeIntent(detection, input);

            // Step 4: Find best template
            const templateName = this.queryTemplates.findBestTemplate(detection.keywords, intent);

            // Step 5: Build query using template or custom approach
            let result;
            if (intent.confidence > 0.6) {
                result = this.buildFromTemplate(templateName, intent, dateInfo, detection);
            } else {
                result = this.buildCustomQuery(detection, dateInfo, intent);
            }

            // Step 6: Add metadata and return
            result.metadata = {
                detectedKeywords: detection.keywords,
                matchedTerms: detection.matched,
                dateFilters: dateInfo.keywords,
                intent: intent,
                templateUsed: templateName,
                confidence: intent.confidence
            };

            // Store in history
            this.lastQuery = result;
            this.queryHistory.push({
                input: input,
                result: result,
                timestamp: new Date()
            });

            return result;

        } catch (error) {
            console.error('Error generating query:', error);
            return {
                success: false,
                error: error.message,
                suggestions: this.keywordDetector.generateSuggestions(input)
            };
        }
    }

    /**
     * Build query from template
     */
    buildFromTemplate(templateName, intent, dateInfo, detection) {
        try {
            // Prepare template parameters
            const params = this.prepareTemplateParams(intent, dateInfo, detection);

            // Process template
            const templateResult = this.queryTemplates.processTemplate(templateName, params);
            let query = templateResult.query;

            // Add date filters
            if (dateInfo.conditions.length > 0) {
                query = this.addDateFiltersToQuery(query, dateInfo.conditions);
            }

            // Add other filters
            query = this.addFiltersToQuery(query, intent.filters);

            // Clean up and format query
            query = this.cleanupQuery(query);
            query = this.queryTemplates.formatQuery(query);

            return {
                success: true,
                query: query,
                type: 'template',
                template: templateName,
                explanation: this.generateExplanation(templateName, params, dateInfo, intent)
            };

        } catch (error) {
            throw new Error(`Template processing failed: ${error.message}`);
        }
    }

    /**
     * Build custom query when template confidence is low
     */
    buildCustomQuery(detection, dateInfo, intent) {
        try {
            // Reset query builder
            this.queryBuilder.reset();

            // Determine query type based on entities
            if (intent.entities.includes('customer')) {
                this.queryBuilder.applyTemplate('customer_list');
            } else if (intent.entities.includes('order')) {
                this.queryBuilder.applyTemplate('order_details');
            } else {
                // Fallback to customer list
                this.queryBuilder.applyTemplate('customer_list');
            }

            // Add date filters
            if (dateInfo.conditions.length > 0) {
                this.queryBuilder.addDateFilter(dateInfo.conditions);
            }

            // Add other filters from intent
            for (const filter of intent.filters) {
                this.applyFilter(filter);
            }

            let query = this.queryBuilder.build();
            query = this.queryTemplates.formatQuery(query);

            return {
                success: true,
                query: query,
                type: 'custom',
                explanation: this.generateCustomExplanation(intent, dateInfo)
            };

        } catch (error) {
            throw new Error(`Custom query building failed: ${error.message}`);
        }
    }

    /**
     * Prepare parameters for template processing
     */
    prepareTemplateParams(intent, dateInfo, detection) {
        const params = {};

        // Extract limit from patterns
        if (detection.patterns && detection.patterns.limit) {
            params.limit = detection.patterns.limit;
        }

        // Extract amount filters
        if (detection.patterns && detection.patterns.comparisons) {
            for (const comp of detection.patterns.comparisons) {
                if (comp.operator === 'over' || comp.operator === 'above') {
                    params.min_amount = comp.value;
                }
            }
        }

        // Extract time periods for inactive customers
        if (detection.patterns && detection.patterns.relativeTimes) {
            for (const time of detection.patterns.relativeTimes) {
                if (time.unit.includes('month')) {
                    params.months = time.amount;
                }
            }
        }

        return params;
    }

    /**
     * Add date filters to existing query
     */
    addDateFiltersToQuery(query, dateConditions) {
        if (dateConditions.length === 0) return query;

        const whereClause = dateConditions.join(' AND ');

        if (query.includes('{where_clause}')) {
            query = query.replace('{where_clause}', `WHERE ${whereClause}`);
        } else if (query.includes('{additional_where}')) {
            query = query.replace('{additional_where}', `AND ${whereClause}`);
        } else if (query.includes('WHERE')) {
            // Insert after existing WHERE clause
            query = query.replace(/WHERE/, `WHERE ${whereClause} AND`);
        } else {
            // Add new WHERE clause before GROUP BY
            const groupByIndex = query.indexOf('GROUP BY');
            if (groupByIndex !== -1) {
                query = query.substring(0, groupByIndex) +
                       `WHERE ${whereClause}\n` +
                       query.substring(groupByIndex);
            } else {
                query += `\nWHERE ${whereClause}`;
            }
        }

        return query;
    }

    /**
     * Add various filters to query
     */
    addFiltersToQuery(query, filters) {
        // Group filters by type to avoid duplicates
        const groupedFilters = {};
        for (const filter of filters) {
            if (!groupedFilters[filter.type]) {
                groupedFilters[filter.type] = [];
            }
            groupedFilters[filter.type].push(filter);
        }

        // Apply one filter per type (use the most specific/longest one)
        for (const [type, filterList] of Object.entries(groupedFilters)) {
            switch (type) {
                case 'gallery':
                    // Use the longest/most specific gallery name
                    const bestGallery = filterList.sort((a, b) => b.name.length - a.name.length)[0];
                    query = this.addGalleryFilter(query, bestGallery.name);
                    break;
                case 'salesperson':
                    // Use the longest/most specific salesperson name (likely the full name)
                    const bestSalesperson = filterList.sort((a, b) => b.name.length - a.name.length)[0];
                    query = this.addSalespersonFilter(query, bestSalesperson.name);
                    break;
                case 'amount':
                    // Use the first amount filter
                    const amountFilter = filterList[0];
                    query = this.addAmountFilter(query, amountFilter.operator, amountFilter.value);
                    break;
            }
        }
        return query;
    }

    /**
     * Add gallery name filter
     */
    addGalleryFilter(query, galleryName) {
        const condition = `g.Name LIKE '%${galleryName}%'`;
        return this.addConditionToQuery(query, condition);
    }

    /**
     * Add salesperson name filter
     */
    addSalespersonFilter(query, salespersonName) {
        const condition = `sp.Name LIKE '%${salespersonName}%'`;
        return this.addConditionToQuery(query, condition);
    }

    /**
     * Add amount filter
     */
    addAmountFilter(query, operator, amount) {
        const condition = `soh.SOTotal ${operator} ${amount}`;
        return this.addConditionToQuery(query, condition);
    }

    /**
     * Add condition to query WHERE clause
     */
    addConditionToQuery(query, condition) {
        if (query.includes('WHERE')) {
            query = query.replace(/WHERE/, `WHERE ${condition} AND`);
        } else {
            const groupByIndex = query.indexOf('GROUP BY');
            if (groupByIndex !== -1) {
                query = query.substring(0, groupByIndex) +
                       `WHERE ${condition}\n` +
                       query.substring(groupByIndex);
            } else {
                query += `\nWHERE ${condition}`;
            }
        }
        return query;
    }

    /**
     * Apply filter using query builder
     */
    applyFilter(filter) {
        switch (filter.type) {
            case 'gallery':
                this.queryBuilder.addGalleryFilter(filter.name);
                break;
            case 'salesperson':
                this.queryBuilder.addSalespersonFilter(filter.name);
                break;
            case 'amount':
                this.queryBuilder.addAmountFilter(filter.operator, filter.value);
                break;
            case 'date':
                // Date filters are handled separately
                break;
        }
    }

    /**
     * Clean up generated query
     */
    cleanupQuery(query) {
        return query
            .replace(/\{[^}]+\}/g, '') // Remove any remaining placeholders
            .replace(/WHERE\s+AND/gi, 'WHERE') // Fix WHERE AND
            .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
            .replace(/[ \t]+/g, ' ') // Normalize horizontal whitespace only
            .replace(/\n /g, '\n') // Remove spaces after line breaks
            .trim();
    }

    /**
     * Generate explanation for template-based query
     */
    generateExplanation(templateName, params, dateInfo, intent) {
        const template = this.queryTemplates.getTemplate(templateName);
        let explanation = template.description;

        // Add parameter details
        if (params.limit) {
            explanation += ` (showing top ${params.limit})`;
        }
        if (params.min_amount) {
            explanation += ` with minimum amount £${params.min_amount}`;
        }

        // Add date filter details
        if (dateInfo.keywords.length > 0) {
            explanation += ` for ${dateInfo.keywords.join(', ')}`;
        }

        // Add gallery filter details
        const galleryFilters = intent.filters.filter(f => f.type === 'gallery');
        if (galleryFilters.length > 0) {
            const galleries = galleryFilters.map(f => f.name).join(', ');
            explanation += ` from ${galleries} gallery`;
        }

        return explanation;
    }

    /**
     * Generate explanation for custom query
     */
    generateCustomExplanation(intent, dateInfo) {
        let explanation = 'Custom query based on detected entities: ';
        explanation += intent.entities.join(', ');

        if (dateInfo.keywords.length > 0) {
            explanation += ` filtered by ${dateInfo.keywords.join(', ')}`;
        }

        return explanation;
    }

    /**
     * Get query suggestions based on input
     */
    getSuggestions(input) {
        if (!this.isInitialized) {
            return ['Please load schema first'];
        }

        // Get template suggestions
        const templateSuggestions = this.queryTemplates.getSuggestions(input);

        // Get keyword suggestions
        const keywordSuggestions = this.keywordDetector.generateSuggestions(input);

        return [...templateSuggestions.map(s => s.title), ...keywordSuggestions];
    }

    /**
     * Get available query templates
     */
    getAvailableTemplates() {
        return Object.values(this.queryTemplates.templates).map(template => ({
            name: template.name,
            description: template.description
        }));
    }

    /**
     * Get query history
     */
    getQueryHistory() {
        return this.queryHistory.slice(-10); // Last 10 queries
    }

    /**
     * Get schema information
     */
    getSchemaInfo() {
        if (!this.isInitialized) return null;

        return {
            tables: Array.from(this.schemaParser.tables.keys()),
            relationships: Array.from(this.schemaParser.relationships.keys()),
            keywordCount: this.schemaParser.keywordMappings.size
        };
    }

    /**
     * Validate query input
     */
    validateInput(input) {
        const issues = [];

        if (!input || input.trim().length === 0) {
            issues.push('Please enter a question');
        }

        if (input.length < 3) {
            issues.push('Question too short - please be more specific');
        }

        if (input.length > 500) {
            issues.push('Question too long - please simplify');
        }

        // Validate dates
        const dateIssues = this.dateParser.validateDates(input);
        issues.push(...dateIssues);

        return issues;
    }

    /**
     * Get debugging information for last query
     */
    getDebugInfo() {
        if (!this.lastQuery) return null;

        return {
            metadata: this.lastQuery.metadata,
            schemaStats: this.getSchemaInfo(),
            timestamp: new Date()
        };
    }
}

// Export for use in main application
window.SQLGenerator = SQLGenerator;