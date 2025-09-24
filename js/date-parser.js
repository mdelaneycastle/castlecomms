/**
 * Enhanced Date Parser - Sophisticated date and time period parsing
 */
class DateParser {
    constructor() {
        this.monthNames = {
            'january': 1, 'jan': 1,
            'february': 2, 'feb': 2,
            'march': 3, 'mar': 3,
            'april': 4, 'apr': 4,
            'may': 5,
            'june': 6, 'jun': 6,
            'july': 7, 'jul': 7,
            'august': 8, 'aug': 8,
            'september': 9, 'sep': 9, 'sept': 9,
            'october': 10, 'oct': 10,
            'november': 11, 'nov': 11,
            'december': 12, 'dec': 12
        };

        this.patterns = {
            // Specific dates
            specificYear: /\b(20[0-9]{2})\b/g,
            monthYear: /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(20[0-9]{2})/gi,
            dateRange: /between\s+(\d{4})-(\d{2})-(\d{2})\s+and\s+(\d{4})-(\d{2})-(\d{2})/gi,

            // Relative periods
            lastPeriods: /(?:last|past|previous|over the last|in the last|over)\s+(\d+)\s*(days?|weeks?|months?|years?)/gi,
            thisPeriod: /this\s+(week|month|quarter|year)/gi,
            lastPeriod: /last\s+(week|month|quarter|year)/gi,

            // Quarters
            quarter: /q([1-4])\s*(20[0-9]{2})?/gi,
            quarterText: /(first|second|third|fourth)\s+quarter\s*(20[0-9]{2})?/gi,

            // Financial year patterns
            financialYear: /(?:financial\s+year|fy)\s*(20[0-9]{2})/gi,

            // Recent periods
            recentDays: /(today|yesterday|this\s+week|last\s+week)/gi,

            // Year to date
            ytd: /(?:ytd|year\s+to\s+date|this\s+year\s+so\s+far)/gi
        };
    }

    /**
     * Parse date expressions from input text
     */
    parseDates(input) {
        const dateFilters = [];
        const keywords = [];

        const lowerInput = input.toLowerCase();

        // Specific years
        const yearMatches = [...lowerInput.matchAll(this.patterns.specificYear)];
        for (const match of yearMatches) {
            const year = parseInt(match[1]);
            dateFilters.push(`YEAR(soh.SODate) = ${year}`);
            keywords.push(`Year ${year}`);
        }

        // Month and year combinations
        const monthYearMatches = [...lowerInput.matchAll(this.patterns.monthYear)];
        for (const match of monthYearMatches) {
            const month = this.monthNames[match[1].toLowerCase()];
            const year = parseInt(match[2]);
            if (month) {
                dateFilters.push(`YEAR(soh.SODate) = ${year} AND MONTH(soh.SODate) = ${month}`);
                keywords.push(`${this.capitalize(match[1])} ${year}`);
            }
        }

        // Date ranges
        const rangeMatches = [...lowerInput.matchAll(this.patterns.dateRange)];
        for (const match of rangeMatches) {
            const startDate = `${match[1]}-${match[2]}-${match[3]}`;
            const endDate = `${match[4]}-${match[5]}-${match[6]}`;
            dateFilters.push(`soh.SODate BETWEEN '${startDate}' AND '${endDate}'`);
            keywords.push(`Between ${startDate} and ${endDate}`);
        }

        // Relative periods (last X days/weeks/months/years)
        const relativePeriods = [...lowerInput.matchAll(this.patterns.lastPeriods)];
        for (const match of relativePeriods) {
            const amount = parseInt(match[1]);
            const unit = match[2].replace(/s$/, ''); // Remove plural 's'

            let sqlUnit;
            switch (unit) {
                case 'day': sqlUnit = 'day'; break;
                case 'week': sqlUnit = 'week'; break;
                case 'month': sqlUnit = 'month'; break;
                case 'year': sqlUnit = 'year'; break;
                default: continue;
            }

            dateFilters.push(`soh.SODate >= DATEADD(${sqlUnit}, -${amount}, GETDATE())`);
            keywords.push(`Last ${amount} ${match[2]}`);
        }

        // This period (week/month/quarter/year)
        const thisPeriodMatches = [...lowerInput.matchAll(this.patterns.thisPeriod)];
        for (const match of thisPeriodMatches) {
            const period = match[1];
            const condition = this.buildThisPeriodCondition(period);
            if (condition) {
                dateFilters.push(condition);
                keywords.push(`This ${period}`);
            }
        }

        // Last period (week/month/quarter/year)
        const lastPeriodMatches = [...lowerInput.matchAll(this.patterns.lastPeriod)];
        for (const match of lastPeriodMatches) {
            const period = match[1];
            const condition = this.buildLastPeriodCondition(period);
            if (condition) {
                dateFilters.push(condition);
                keywords.push(`Last ${period}`);
            }
        }

        // Quarters (Q1, Q2, etc.)
        const quarterMatches = [...lowerInput.matchAll(this.patterns.quarter)];
        for (const match of quarterMatches) {
            const quarter = parseInt(match[1]);
            const year = match[2] ? parseInt(match[2]) : new Date().getFullYear();

            dateFilters.push(`DATEPART(quarter, soh.SODate) = ${quarter} AND YEAR(soh.SODate) = ${year}`);
            keywords.push(`Q${quarter} ${year}`);
        }

        // Quarter text (first quarter, etc.)
        const quarterTextMatches = [...lowerInput.matchAll(this.patterns.quarterText)];
        for (const match of quarterTextMatches) {
            const quarterMap = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 };
            const quarter = quarterMap[match[1]];
            const year = match[2] ? parseInt(match[2]) : new Date().getFullYear();

            if (quarter) {
                dateFilters.push(`DATEPART(quarter, soh.SODate) = ${quarter} AND YEAR(soh.SODate) = ${year}`);
                keywords.push(`${this.capitalize(match[1])} quarter ${year}`);
            }
        }

        // Financial year
        const fyMatches = [...lowerInput.matchAll(this.patterns.financialYear)];
        for (const match of fyMatches) {
            const fyYear = parseInt(match[1]);
            // Assuming UK financial year (April to March)
            const startDate = `${fyYear}-04-01`;
            const endDate = `${fyYear + 1}-03-31`;
            dateFilters.push(`soh.SODate BETWEEN '${startDate}' AND '${endDate}'`);
            keywords.push(`Financial Year ${fyYear}`);
        }

        // Recent days
        const recentMatches = [...lowerInput.matchAll(this.patterns.recentDays)];
        for (const match of recentMatches) {
            const period = match[1] || match[0];
            const condition = this.buildRecentCondition(period);
            if (condition) {
                dateFilters.push(condition);
                keywords.push(this.capitalize(period));
            }
        }

        // Year to date
        if (this.patterns.ytd.test(lowerInput)) {
            dateFilters.push(`soh.SODate >= DATEFROMPARTS(YEAR(GETDATE()), 1, 1)`);
            keywords.push('Year to date');
        }

        // Handle special cases with context
        this.addContextualDateFilters(lowerInput, dateFilters, keywords);

        return {
            conditions: dateFilters,
            keywords: keywords
        };
    }

    /**
     * Build condition for "this" periods
     */
    buildThisPeriodCondition(period) {
        switch (period) {
            case 'week':
                return `DATEPART(week, soh.SODate) = DATEPART(week, GETDATE()) AND YEAR(soh.SODate) = YEAR(GETDATE())`;
            case 'month':
                return `YEAR(soh.SODate) = YEAR(GETDATE()) AND MONTH(soh.SODate) = MONTH(GETDATE())`;
            case 'quarter':
                return `DATEPART(quarter, soh.SODate) = DATEPART(quarter, GETDATE()) AND YEAR(soh.SODate) = YEAR(GETDATE())`;
            case 'year':
                return `YEAR(soh.SODate) = YEAR(GETDATE())`;
            default:
                return null;
        }
    }

    /**
     * Build condition for "last" periods
     */
    buildLastPeriodCondition(period) {
        switch (period) {
            case 'week':
                return `soh.SODate >= DATEADD(week, DATEDIFF(week, 0, GETDATE()) - 1, 0) AND soh.SODate < DATEADD(week, DATEDIFF(week, 0, GETDATE()), 0)`;
            case 'month':
                return `soh.SODate >= DATEADD(month, DATEDIFF(month, 0, GETDATE()) - 1, 0) AND soh.SODate < DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)`;
            case 'quarter':
                return `DATEPART(quarter, soh.SODate) = DATEPART(quarter, DATEADD(quarter, -1, GETDATE())) AND YEAR(soh.SODate) = YEAR(DATEADD(quarter, -1, GETDATE()))`;
            case 'year':
                return `YEAR(soh.SODate) = YEAR(GETDATE()) - 1`;
            default:
                return null;
        }
    }

    /**
     * Build condition for recent periods
     */
    buildRecentCondition(period) {
        switch (period.toLowerCase()) {
            case 'today':
                return `CAST(soh.SODate AS DATE) = CAST(GETDATE() AS DATE)`;
            case 'yesterday':
                return `CAST(soh.SODate AS DATE) = CAST(DATEADD(day, -1, GETDATE()) AS DATE)`;
            case 'this week':
                return `DATEPART(week, soh.SODate) = DATEPART(week, GETDATE()) AND YEAR(soh.SODate) = YEAR(GETDATE())`;
            case 'last week':
                return `soh.SODate >= DATEADD(week, DATEDIFF(week, 0, GETDATE()) - 1, 0) AND soh.SODate < DATEADD(week, DATEDIFF(week, 0, GETDATE()), 0)`;
            default:
                return null;
        }
    }

    /**
     * Add contextual date filters based on other keywords
     */
    addContextualDateFilters(input, dateFilters, keywords) {
        // If no specific date mentioned but "recent" is implied
        if (dateFilters.length === 0) {
            if (input.includes('recent') || input.includes('latest') || input.includes('newest')) {
                dateFilters.push(`soh.SODate >= DATEADD(month, -3, GETDATE())`);
                keywords.push('Recent (last 3 months)');
            }
        }

        // Handle "current" as synonym for "this"
        if (input.includes('current year') && !keywords.some(k => k.includes('year'))) {
            dateFilters.push(`YEAR(soh.SODate) = YEAR(GETDATE())`);
            keywords.push('Current year');
        }

        if (input.includes('current month') && !keywords.some(k => k.includes('month'))) {
            dateFilters.push(`YEAR(soh.SODate) = YEAR(GETDATE()) AND MONTH(soh.SODate) = MONTH(GETDATE())`);
            keywords.push('Current month');
        }
    }

    /**
     * Generate date range suggestions
     */
    generateDateSuggestions() {
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;

        return [
            `This year (${currentYear})`,
            `Last year (${lastYear})`,
            'This month',
            'Last month',
            'Last 3 months',
            'Last 6 months',
            'Year to date',
            'This quarter',
            'Last quarter'
        ];
    }

    /**
     * Validate date expressions
     */
    validateDates(input) {
        const issues = [];

        // Check for impossible dates
        const yearMatches = [...input.matchAll(/\b(20[0-9]{2})\b/g)];
        for (const match of yearMatches) {
            const year = parseInt(match[1]);
            if (year > new Date().getFullYear() + 1) {
                issues.push(`Future year ${year} might not have data`);
            }
            if (year < 2000) {
                issues.push(`Year ${year} seems too old for business data`);
            }
        }

        // Check for conflicting date ranges
        if (input.includes('this year') && input.includes('last year')) {
            issues.push('Conflicting date ranges: "this year" and "last year"');
        }

        return issues;
    }

    /**
     * Utility: Capitalize first letter
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Get human-readable description of date filters
     */
    describeDateFilters(keywords) {
        if (keywords.length === 0) return 'All time periods';
        if (keywords.length === 1) return keywords[0];
        return keywords.join(', ');
    }
}

// Export for use in other modules
window.DateParser = DateParser;