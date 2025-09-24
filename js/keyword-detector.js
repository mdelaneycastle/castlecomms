/**
 * Keyword Detector - Enhanced tokenization and keyword matching
 */
class KeywordDetector {
    constructor(schemaParser) {
        this.schema = schemaParser;
        this.synonyms = this.buildSynonyms();
        this.patterns = this.buildPatterns();
    }

    /**
     * Build comprehensive synonym mappings
     */
    buildSynonyms() {
        return {
            // Actions
            'show': ['show', 'display', 'list', 'find', 'get', 'fetch', 'retrieve'],
            'top': ['top', 'best', 'highest', 'maximum', 'most', 'leading', 'biggest'],
            'bottom': ['bottom', 'worst', 'lowest', 'minimum', 'least'],
            'average': ['average', 'avg', 'mean'],
            'total': ['total', 'sum', 'aggregate'],
            'count': ['count', 'number', 'quantity', 'amount'],

            // Entities
            'customer': ['customer', 'customers', 'client', 'clients', 'buyer', 'buyers', 'people', 'person'],
            'gallery': ['gallery', 'galleries', 'location', 'locations', 'store', 'stores', 'branch', 'branches', 'shop', 'shops'],
            'order': ['order', 'orders', 'sale', 'sales', 'transaction', 'transactions', 'purchase', 'purchases'],
            'item': ['item', 'items', 'product', 'products', 'artwork', 'artworks', 'piece', 'pieces'],
            'salesperson': ['salesperson', 'salespeople', 'staff', 'employee', 'employees', 'rep', 'reps', 'agent', 'agents'],

            // Attributes
            'name': ['name', 'names', 'title', 'titles'],
            'email': ['email', 'emails', 'mail', 'address', 'addresses'],
            'phone': ['phone', 'phones', 'mobile', 'cell', 'telephone', 'number'],
            'address': ['address', 'addresses', 'location', 'street'],
            'date': ['date', 'dates', 'time', 'when'],
            'price': ['price', 'prices', 'cost', 'costs', 'amount', 'amounts', 'value', 'values'],
            'status': ['status', 'state', 'condition'],

            // Comparisons
            'over': ['over', 'above', 'more', 'greater', 'higher', 'exceeding', '>', 'gt'],
            'under': ['under', 'below', 'less', 'lower', 'smaller', '<', 'lt'],
            'equal': ['equal', 'equals', 'same', '=', 'eq'],
            'between': ['between', 'from', 'range'],
            'like': ['like', 'contains', 'includes', 'similar', 'matching'],

            // Time periods
            'today': ['today', 'now'],
            'yesterday': ['yesterday'],
            'week': ['week', 'weekly'],
            'month': ['month', 'monthly'],
            'quarter': ['quarter', 'quarterly', 'q1', 'q2', 'q3', 'q4'],
            'year': ['year', 'yearly', 'annual', 'annually'],
            'recent': ['recent', 'latest', 'newest'],
            'old': ['old', 'oldest', 'earliest'],

            // Business terms
            'spending': ['spending', 'spent', 'expenditure', 'outlay', 'spenders', 'buyers', 'purchasing'],
            'revenue': ['revenue', 'income', 'earnings', 'takings'],
            'commission': ['commission', 'bonus', 'incentive'],
            'discount': ['discount', 'reduction', 'saving', 'offer'],
            'balance': ['balance', 'outstanding', 'owing', 'due'],
            'pending': ['pending', 'outstanding', 'incomplete', 'unfinished'],

            // Location names (common UK galleries/cities)
            'london': ['london'],
            'manchester': ['manchester'],
            'birmingham': ['birmingham'],
            'glasgow': ['glasgow'],
            'edinburgh': ['edinburgh'],
            'bristol': ['bristol'],
            'liverpool': ['liverpool'],
            'leeds': ['leeds'],
            'cardiff': ['cardiff'],
            'newcastle': ['newcastle']
        };
    }

    /**
     * Build regex patterns for special detection
     */
    buildPatterns() {
        return {
            // Numbers and currencies
            currency: /[£$€]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
            number: /\b(\d+)\b/g,
            percentage: /(\d+(?:\.\d+)?)\s*%/g,

            // Dates
            specificYear: /\b(20[0-9]{2})\b/g,
            monthYear: /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20[0-9]{2})/gi,
            relativeTime: /(?:last|past|over|in)\s*(\d+)\s*(days?|weeks?|months?|years?)/gi,

            // Email domains
            emailDomain: /@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,

            // Comparisons with values
            comparison: /(over|above|under|below|more|less|greater|higher|lower)\s*[£$€]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,

            // Top/limit patterns
            topN: /(?:top|best|first|limit)\s*(\d+)/gi,
            bottomN: /(?:bottom|worst|last)\s*(\d+)/gi
        };
    }

    /**
     * Tokenize input text
     */
    tokenize(input) {
        // Normalize input
        const normalized = input.toLowerCase().trim();

        // Extract special patterns first
        const patterns = this.extractPatterns(normalized);

        // Split into words, removing punctuation but keeping meaningful symbols
        const words = normalized
            .replace(/[^\w\s£$€%@.-]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);

        return {
            words: words,
            patterns: patterns,
            original: input
        };
    }

    /**
     * Extract special patterns from input
     */
    extractPatterns(input) {
        const patterns = {};

        // Extract currency amounts
        const currencies = [];
        let match;
        while ((match = this.patterns.currency.exec(input)) !== null) {
            currencies.push({
                value: parseFloat(match[1].replace(/,/g, '')),
                original: match[0]
            });
        }
        if (currencies.length > 0) patterns.currencies = currencies;

        // Extract numbers
        const numbers = [];
        this.patterns.number.lastIndex = 0;
        while ((match = this.patterns.number.exec(input)) !== null) {
            numbers.push(parseInt(match[1]));
        }
        if (numbers.length > 0) patterns.numbers = numbers;

        // Extract years
        this.patterns.specificYear.lastIndex = 0;
        while ((match = this.patterns.specificYear.exec(input)) !== null) {
            if (!patterns.years) patterns.years = [];
            patterns.years.push(parseInt(match[1]));
        }

        // Extract month-year combinations
        this.patterns.monthYear.lastIndex = 0;
        while ((match = this.patterns.monthYear.exec(input)) !== null) {
            if (!patterns.monthYears) patterns.monthYears = [];
            patterns.monthYears.push({
                month: match[1].toLowerCase(),
                year: parseInt(match[2])
            });
        }

        // Extract relative time periods
        this.patterns.relativeTime.lastIndex = 0;
        while ((match = this.patterns.relativeTime.exec(input)) !== null) {
            if (!patterns.relativeTimes) patterns.relativeTimes = [];
            patterns.relativeTimes.push({
                amount: parseInt(match[1]),
                unit: match[2],
                original: match[0]
            });
        }

        // Extract top/limit patterns
        this.patterns.topN.lastIndex = 0;
        while ((match = this.patterns.topN.exec(input)) !== null) {
            patterns.limit = parseInt(match[1]);
            patterns.limitType = 'top';
        }

        this.patterns.bottomN.lastIndex = 0;
        while ((match = this.patterns.bottomN.exec(input)) !== null) {
            patterns.limit = parseInt(match[1]);
            patterns.limitType = 'bottom';
        }

        // Extract comparison patterns
        this.patterns.comparison.lastIndex = 0;
        while ((match = this.patterns.comparison.exec(input)) !== null) {
            if (!patterns.comparisons) patterns.comparisons = [];
            patterns.comparisons.push({
                operator: match[1].toLowerCase(),
                value: parseFloat(match[2].replace(/,/g, '')),
                original: match[0]
            });
        }

        return patterns;
    }

    /**
     * Detect keywords in tokenized input
     */
    detectKeywords(tokens) {
        const detectedKeywords = new Set();
        const matched = [];

        // Match individual words through synonyms
        for (const word of tokens.words) {
            for (const [canonical, synonyms] of Object.entries(this.synonyms)) {
                if (synonyms.includes(word)) {
                    detectedKeywords.add(canonical);
                    matched.push({
                        type: 'synonym',
                        keyword: canonical,
                        matched: word,
                        confidence: 1.0
                    });
                    break;
                }
            }

            // Direct schema keyword matching
            if (this.schema.keywordMappings.has(word)) {
                detectedKeywords.add(word);
                matched.push({
                    type: 'schema',
                    keyword: word,
                    matched: word,
                    confidence: 1.0,
                    mappings: this.schema.keywordMappings.get(word)
                });
            }
        }

        // Match compound phrases
        const phrases = this.extractPhrases(tokens.words);
        for (const phrase of phrases) {
            if (this.schema.keywordMappings.has(phrase)) {
                detectedKeywords.add(phrase);
                matched.push({
                    type: 'phrase',
                    keyword: phrase,
                    matched: phrase,
                    confidence: 0.9,
                    mappings: this.schema.keywordMappings.get(phrase)
                });
            }
        }

        return {
            keywords: Array.from(detectedKeywords),
            matched: matched,
            patterns: tokens.patterns
        };
    }

    /**
     * Extract meaningful phrases from words
     */
    extractPhrases(words) {
        const phrases = [];

        // 2-word phrases
        for (let i = 0; i < words.length - 1; i++) {
            phrases.push(`${words[i]} ${words[i + 1]}`);
        }

        // 3-word phrases
        for (let i = 0; i < words.length - 2; i++) {
            phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
        }

        return phrases;
    }

    /**
     * Analyze intent from detected keywords and patterns
     */
    analyzeIntent(detection, originalInput = '') {
        const intent = {
            queryType: 'unknown',
            entities: [],
            attributes: [],
            actions: [],
            filters: [],
            confidence: 0
        };

        // Analyze entities
        const entityKeywords = ['customer', 'gallery', 'order', 'item', 'salesperson'];
        for (const keyword of detection.keywords) {
            if (entityKeywords.includes(keyword)) {
                intent.entities.push(keyword);
            }
        }

        // Analyze actions
        const actionKeywords = ['show', 'top', 'bottom', 'average', 'total', 'count'];
        for (const keyword of detection.keywords) {
            if (actionKeywords.includes(keyword)) {
                intent.actions.push(keyword);
            }
        }

        // Determine query type based on patterns
        // Check for spending-related keywords that indicate top customers analysis
        const spendingKeywords = detection.keywords.filter(k =>
            ['top', 'best', 'biggest', 'highest', 'spending', 'spenders', 'buyers', 'value'].includes(k)
        );

        if ((intent.actions.includes('top') || spendingKeywords.length > 0) &&
            (intent.entities.includes('customer') || detection.keywords.includes('spenders') || detection.keywords.includes('buyers'))) {
            intent.queryType = 'top_customers';
            intent.confidence = 0.9;
        } else if ((intent.actions.includes('show') || detection.keywords.includes('list') || detection.keywords.includes('all')) && intent.entities.includes('salesperson')) {
            intent.queryType = 'list_salespeople';
            intent.confidence = 0.9;
        } else if (intent.entities.includes('gallery') && (intent.actions.includes('show') || detection.keywords.includes('sales'))) {
            intent.queryType = 'sales_by_gallery';
            intent.confidence = 0.8;
        } else if (intent.entities.includes('salesperson')) {
            intent.queryType = 'sales_by_salesperson';
            intent.confidence = 0.8;
        } else if (intent.entities.includes('order')) {
            intent.queryType = 'order_details';
            intent.confidence = 0.7;
        } else if (intent.entities.includes('customer')) {
            intent.queryType = 'customer_list';
            intent.confidence = 0.6;
        }

        // Add filters based on patterns
        if (detection.patterns.currencies) {
            for (const currency of detection.patterns.currencies) {
                intent.filters.push({
                    type: 'amount',
                    value: currency.value,
                    operator: this.inferAmountOperator(detection.keywords)
                });
            }
        }

        if (detection.patterns.relativeTimes) {
            for (const time of detection.patterns.relativeTimes) {
                intent.filters.push({
                    type: 'date',
                    period: time.unit,
                    amount: time.amount,
                    direction: 'past'
                });
            }
        }

        if (detection.patterns.years) {
            for (const year of detection.patterns.years) {
                intent.filters.push({
                    type: 'date',
                    year: year
                });
            }
        }

        // Gallery location filters - both predefined cities and detected gallery names
        const locationKeywords = ['london', 'manchester', 'birmingham', 'glasgow', 'edinburgh'];
        for (const keyword of detection.keywords) {
            if (locationKeywords.includes(keyword)) {
                intent.filters.push({
                    type: 'gallery',
                    name: keyword
                });
            }
        }

        // Detect gallery names in the input (words followed by "gallery", "center", etc.)
        const galleryNamePattern = /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+(gallery|center|centre|store|shop)/gi;
        let galleryMatch;
        while ((galleryMatch = galleryNamePattern.exec(originalInput)) !== null) {
            const galleryName = galleryMatch[1].trim();
            if (galleryName.length > 2) {
                const properGalleryName = galleryName.replace(/\b\w+/g, word =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                );
                intent.filters.push({
                    type: 'gallery',
                    name: properGalleryName
                });
            }
        }

        // Salesperson name filters - detect proper names
        const namePatterns = this.detectPersonNames(originalInput);
        for (const name of namePatterns) {
            intent.filters.push({
                type: 'salesperson',
                name: name
            });
        }

        return intent;
    }

    /**
     * Infer amount comparison operator from keywords
     */
    inferAmountOperator(keywords) {
        if (keywords.some(k => ['over', 'above', 'more', 'greater'].includes(k))) {
            return '>';
        }
        if (keywords.some(k => ['under', 'below', 'less', 'lower'].includes(k))) {
            return '<';
        }
        return '>';  // Default to greater than
    }

    /**
     * Detect person names in the input (for salesperson filtering)
     */
    detectPersonNames(input) {
        if (!input || typeof input !== 'string') {
            return [];
        }

        const names = [];

        // Enhanced pattern to detect names in various formats
        const salesKeywords = ['salesperson', 'sales', 'consultant', 'rep', 'staff', 'employee', 'by', 'person'];
        const words = input.split(/\s+/);

        for (let i = 0; i < words.length; i++) {
            const word = words[i].toLowerCase();

            // If we find a sales keyword, look for capitalized names after it
            if (salesKeywords.includes(word)) {
                // Check next several words for names (handles multi-part names)
                for (let j = i + 1; j < Math.min(i + 5, words.length); j++) {
                    const nextWord = words[j];

                    // Check if it looks like a name part (capitalized, mostly alphabetic, allows hyphens)
                    if (/^[A-Z][a-zA-Z-]+$/.test(nextWord) && nextWord.length > 2) {
                        // Collect consecutive name parts
                        const nameParts = [nextWord];

                        // Look for additional name parts
                        for (let k = j + 1; k < Math.min(j + 3, words.length); k++) {
                            const nameCandidate = words[k];
                            if (/^[A-Z][a-zA-Z-]+$/.test(nameCandidate) && nameCandidate.length > 1) {
                                nameParts.push(nameCandidate);
                            } else {
                                break; // Stop at first non-name word
                            }
                        }

                        // Add the full name
                        names.push(nameParts.join(' '));
                        break; // Found a name for this sales keyword
                    }
                }
            }
        }

        // Also detect quoted names like "John Smith" or 'Amber Pollard-Rea'
        const quotedMatches = input.match(/["']([A-Z][a-zA-Z\s-]+)["']/g);
        if (quotedMatches) {
            for (const match of quotedMatches) {
                const name = match.slice(1, -1); // Remove quotes
                if (name.length > 2) {
                    names.push(name);
                }
            }
        }

        // Primary pattern: "sales person [first] [last]" where last name might have hyphen
        const salesPersonPattern = /(?:sales\s*person|salesperson|consultant|rep)\s+([a-zA-Z]+)\s+([a-zA-Z-]+)(?:\s+(?:top|spending|clients|customers|orders))/gi;
        let match;
        while ((match = salesPersonPattern.exec(input)) !== null) {
            const firstName = match[1].trim();
            const lastName = match[2].trim();
            if (firstName.length > 1 && lastName.length > 1) {
                const properName = `${firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()} ${lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase()}`;
                names.push(properName);
                break; // Only take the first match to avoid duplicates
            }
        }

        // Alternative pattern: "[first] [last] [action]" - name at start of query
        // But exclude obvious gallery names
        const nameFirstPattern = /^([a-zA-Z]+)\s+([a-zA-Z-]+)\s+(?:top|highest|best|biggest|spending|buying|clients|customers)/gi;
        while ((match = nameFirstPattern.exec(input)) !== null) {
            const firstName = match[1].trim().toLowerCase();
            const lastName = match[2].trim().toLowerCase();

            // Skip if it looks like a gallery name (contains common gallery words)
            const galleryWords = ['gallery', 'center', 'centre', 'store', 'shop', 'house', 'studio', 'space', 'room'];
            const isGallery = galleryWords.some(word => firstName.includes(word) || lastName.includes(word));

            if (!isGallery && firstName.length > 1 && lastName.length > 1) {
                const properName = `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${lastName.charAt(0).toUpperCase() + lastName.slice(1)}`;
                names.push(properName);
                break; // Only take the first match
            }
        }

        return [...new Set(names)]; // Remove duplicates
    }

    /**
     * Get column mappings for detected keywords
     */
    getColumnMappings(keywords) {
        const mappings = [];

        for (const keyword of keywords) {
            const schemaMappings = this.schema.keywordMappings.get(keyword);
            if (schemaMappings) {
                mappings.push(...schemaMappings);
            }
        }

        return mappings;
    }

    /**
     * Generate suggestions when keywords don't match well
     */
    generateSuggestions(input) {
        const suggestions = [];

        // Common query type suggestions
        const commonQueries = [
            'Top customers by spending',
            'Sales by gallery this year',
            'Orders over £1000',
            'Customers from Manchester',
            'Sales by salesperson last month'
        ];

        // Simple keyword matching for suggestions
        const lowerInput = input.toLowerCase();
        if (lowerInput.includes('customer')) {
            suggestions.push('Top customers by spending', 'Customer list with contact details');
        }
        if (lowerInput.includes('gallery') || lowerInput.includes('location')) {
            suggestions.push('Sales by gallery', 'Customers by gallery location');
        }
        if (lowerInput.includes('sales') || lowerInput.includes('order')) {
            suggestions.push('Sales by salesperson', 'Orders over specific amount');
        }

        return suggestions.length > 0 ? suggestions : commonQueries.slice(0, 3);
    }
}

// Export for use in other modules
window.KeywordDetector = KeywordDetector;