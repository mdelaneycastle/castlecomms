/**
 * PowerBI Row Capture System for PDF Generation
 * Handles row selection events from embedded PowerBI reports and generates PDFs
 */

class PowerBIRowCapture {
  constructor() {
    this.selectedRowData = null;
    this.pdfGenerator = null;
    this.isListening = false;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * Initialize the row capture system
   */
  initialize() {
    console.log('PowerBI Row Capture: Initializing...');
    this.setupClipboardCapture();
    this.createPDFButton();
    this.loadPDFGenerator();
    this.showInstructions();
  }

  /**
   * Setup clipboard capture for PowerBI copy operations
   */
  setupClipboardCapture() {
    console.log('Setting up clipboard capture for PowerBI data...');
    
    // Create clipboard capture button
    this.createClipboardButton();
    
    // Listen for paste events to capture PowerBI data
    document.addEventListener('paste', (event) => {
      this.handleClipboardPaste(event);
    });
    
    // Also listen for copy events within PowerBI iframes
    document.addEventListener('copy', (event) => {
      this.handlePowerBICopy(event);
    });
  }

  /**
   * Create clipboard capture button
   */
  createClipboardButton() {
    const button = document.createElement('button');
    button.id = 'powerbi-clipboard-btn';
    button.className = 'powerbi-clipboard-button';
    button.innerHTML = `
      <span class="clipboard-icon">📋</span>
      <span class="clipboard-text">Paste PowerBI Data Here</span>
    `;
    
    button.addEventListener('click', () => this.showClipboardInterface());

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .powerbi-clipboard-button {
        position: fixed;
        top: 120px;
        right: 20px;
        z-index: 1000;
        background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(23, 162, 184, 0.3);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 250px;
      }
      
      .powerbi-clipboard-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(23, 162, 184, 0.4);
      }
      
      .clipboard-interface {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
      }
      
      .clipboard-content {
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-width: 600px;
        width: 90%;
        max-height: 70vh;
        overflow-y: auto;
      }
      
      .paste-area {
        width: 100%;
        min-height: 200px;
        padding: 15px;
        border: 2px dashed #17a2b8;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        resize: vertical;
        background: #f8f9fa;
        margin: 15px 0;
      }
      
      .paste-instructions {
        background: #e3f2fd;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 15px;
        border-left: 4px solid #2196f3;
      }
    `;

    if (!document.getElementById('clipboard-capture-styles')) {
      style.id = 'clipboard-capture-styles';
      document.head.appendChild(style);
    }
    
    document.body.appendChild(button);
  }

  /**
   * Show clipboard interface for pasting PowerBI data
   */
  showClipboardInterface() {
    // Remove existing interface if present
    const existing = document.getElementById('clipboard-interface');
    if (existing) {
      existing.remove();
    }

    const interface = document.createElement('div');
    interface.id = 'clipboard-interface';
    interface.className = 'clipboard-interface';
    
    interface.innerHTML = `
      <div class="clipboard-content">
        <h3>📋 PowerBI Data Capture</h3>
        
        <div class="paste-instructions">
          <strong>How to use:</strong>
          <ol style="margin: 10px 0; padding-left: 20px;">
            <li>Right-click on a PowerBI table row</li>
            <li>Select "Copy" or "Copy selection"</li>
            <li>Click in the text area below and paste (Ctrl+V)</li>
            <li>Click "Generate PDF"</li>
          </ol>
        </div>
        
        <textarea 
          class="paste-area" 
          id="clipboard-paste-area" 
          placeholder="Right-click a PowerBI row → Copy → Paste here (Ctrl+V)"
          autofocus></textarea>
        
        <div class="button-group">
          <button type="button" class="btn-secondary" onclick="document.getElementById('clipboard-interface').remove()">Cancel</button>
          <button type="button" class="btn-primary" onclick="powerBIRowCapture.processClipboardData()">Generate PDF</button>
          <button type="button" class="btn-info" onclick="powerBIRowCapture.showSampleData()" style="background: #17a2b8;">Show Sample</button>
        </div>
      </div>
    `;

    // Add button styles
    const style = document.createElement('style');
    style.textContent = `
      .button-group {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #e1e5e9;
      }
      
      .btn-primary, .btn-secondary, .btn-info {
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        color: white;
      }
      
      .btn-primary { background: #667eea; }
      .btn-secondary { background: #6c757d; }
      .btn-info { background: #17a2b8; }
    `;
    
    if (!document.getElementById('button-styles')) {
      style.id = 'button-styles';
      document.head.appendChild(style);
    }

    // Close on outside click
    interface.addEventListener('click', (e) => {
      if (e.target === interface) {
        interface.remove();
      }
    });

    document.body.appendChild(interface);
    
    // Focus the textarea
    setTimeout(() => {
      const textarea = document.getElementById('clipboard-paste-area');
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  }

  /**
   * Show sample data for testing
   */
  showSampleData() {
    const textarea = document.getElementById('clipboard-paste-area');
    if (textarea) {
      textarea.value = `Gallery	Qty Sold	SO Total	%of Sales by Gallery
WEB	1402	£1,503,702.26	19.13%
MAI	276	£541,356.49	6.89%
CDF	172	£287,659.00	3.66%`;
    }
  }

  /**
   * Handle clipboard paste events
   */
  handleClipboardPaste(event) {
    // Only process if we're in our interface
    if (!document.getElementById('clipboard-interface')) {
      return;
    }

    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('text');
    
    if (pastedData && this.isPowerBITableData(pastedData)) {
      console.log('PowerBI table data detected in clipboard:', pastedData);
      // The data will be processed when user clicks "Generate PDF"
    }
  }

  /**
   * Check if pasted data looks like PowerBI table data
   */
  isPowerBITableData(data) {
    // Check for common PowerBI table patterns
    const patterns = [
      /Gallery.*Qty Sold.*SO Total/i,
      /\t.*\t.*£/,  // Tab separated with currency
      /[A-Z]{3}\s+\d+.*£/,  // Gallery code, number, currency
    ];
    
    return patterns.some(pattern => pattern.test(data));
  }

  /**
   * Handle PowerBI copy events
   */
  handlePowerBICopy(event) {
    // This might not work due to security restrictions, but worth trying
    console.log('Copy event detected');
  }

  /**
   * Process clipboard data and generate PDF
   */
  processClipboardData() {
    const textarea = document.getElementById('clipboard-paste-area');
    const data = textarea?.value?.trim();
    
    if (!data) {
      alert('Please paste some PowerBI data first.');
      return;
    }

    try {
      const parsedData = this.parseTabDelimitedData(data);
      
      if (!parsedData || parsedData.length === 0) {
        alert('Could not parse the pasted data. Please make sure you copied from a PowerBI table.');
        return;
      }

      // Convert to our expected format
      this.selectedRowData = {
        timestamp: new Date().toISOString(),
        source: 'PowerBI Clipboard Data',
        rows: parsedData.map((row, index) => ({
          rowIndex: index,
          data: row
        }))
      };

      // Close interface and update PDF button
      document.getElementById('clipboard-interface').remove();
      this.updatePDFButton();
      
      console.log('Clipboard data processed:', this.selectedRowData);
      
      // Auto-generate PDF
      this.generatePDF();

    } catch (error) {
      console.error('Error processing clipboard data:', error);
      alert('Error processing the pasted data. Please try again.');
    }
  }

  /**
   * Parse tab-delimited data from PowerBI clipboard
   */
  parseTabDelimitedData(data) {
    const lines = data.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return null; // Need at least header and one data row
    }

    const headers = lines[0].split('\t').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t').map(v => v.trim());
      
      if (values.length !== headers.length) {
        continue; // Skip malformed rows
      }

      const row = {};
      headers.forEach((header, index) => {
        let value = values[index];
        
        // Clean up currency values
        if (value.startsWith('£')) {
          value = value.replace(/[£,]/g, '');
          if (!isNaN(value)) {
            value = parseFloat(value);
          }
        }
        
        // Clean up percentage values
        if (value.endsWith('%')) {
          value = value.replace('%', '');
          if (!isNaN(value)) {
            value = parseFloat(value) / 100; // Convert to decimal
          }
        }
        
        // Convert numbers
        if (typeof value === 'string' && !isNaN(value) && value !== '') {
          value = parseFloat(value);
        }
        
        row[header] = value;
      });
      
      rows.push(row);
    }

    return rows;
  }

  /**
   * Setup PowerBI SDK event listeners
   */
  setupPowerBIEventListeners() {
    console.log('Setting up PowerBI SDK event listeners...');
    
    // Wait for iframes to be available
    setTimeout(() => {
      this.attachToReports();
    }, 2000);
  }

  /**
   * Attach event listeners to PowerBI reports
   */
  attachToReports() {
    const reportIframes = document.querySelectorAll('iframe[src*="powerbi.com"]');
    console.log('Found PowerBI iframes:', reportIframes.length);
    
    reportIframes.forEach((iframe, index) => {
      try {
        // Get the embedded report using PowerBI SDK
        const report = window.powerbi?.get(iframe);
        
        if (report) {
          console.log(`Attaching to report ${index + 1}`);
          
          // Listen for data selection events
          report.on("dataSelected", (event) => {
            console.log('PowerBI dataSelected event:', event);
            this.handlePowerBIDataSelected(event);
          });

          // Optional: listen for selection changes
          report.on("selectionChanged", (event) => {
            console.log('PowerBI selectionChanged event:', event);
          });

          // Listen for report loaded
          report.on("loaded", () => {
            console.log('PowerBI report loaded');
            this.showInstructions();
          });

        } else {
          console.warn(`Could not get PowerBI report from iframe ${index + 1}`);
        }
      } catch (error) {
        console.warn(`Error attaching to PowerBI report ${index + 1}:`, error);
      }
    });

    // If no reports found or SDK issues, show manual entry
    if (reportIframes.length === 0) {
      console.log('No PowerBI iframes found, showing manual entry option');
      this.showManualDataEntry();
    }
  }

  /**
   * Handle PowerBI report loaded event
   */
  handleReportLoaded(data) {
    console.log('PowerBI Row Capture: Report loaded');
    this.enableRowCapture();
  }

  /**
   * Handle PowerBI report rendered event
   */
  handleReportRendered(data) {
    console.log('PowerBI Row Capture: Report rendered');
    this.showInstructions();
  }

  /**
   * Handle PowerBI SDK data selection events
   */
  handlePowerBIDataSelected(event) {
    console.log('PowerBI Row Capture: Data selected via SDK', event);
    
    const dataPoint = event?.detail?.dataPoints?.[0];
    if (!dataPoint) {
      console.log('No data points found in selection');
      return;
    }

    // Process the selected data
    this.selectedRowData = this.processPowerBIDataPoint(dataPoint);
    this.updatePDFButton();
    this.showSelectedDataPreview();
  }

  /**
   * Process PowerBI data point from SDK
   */
  processPowerBIDataPoint(dataPoint) {
    const processedData = {
      timestamp: new Date().toISOString(),
      source: 'PowerBI Report (SDK)',
      rows: []
    };

    const row = {
      rowIndex: 0,
      data: {}
    };

    // Extract values from dataPoint
    const values = dataPoint.values || {};
    const identity = dataPoint.identity || [];

    // Map common field names - adjust these based on your PowerBI table columns
    const fieldMappings = {
      'Gallery': ['Gallery', 'Table.Gallery'],
      'Qty Sold': ['Qty Sold', 'Table.Qty Sold', 'QtySold'],
      'SO Total': ['SO Total', 'Table.SO Total', 'SOTotal'],
      '% of Sales by Gallery': ['%of Sales by Gallery', 'Table.%of Sales by Gallery', 'PctByGallery', 'Percentage']
    };

    // Extract values using field mappings
    Object.entries(fieldMappings).forEach(([displayName, possibleKeys]) => {
      for (const key of possibleKeys) {
        if (values[key] !== undefined) {
          row.data[displayName] = values[key];
          break;
        }
      }
    });

    // Also extract identity values
    identity.forEach(id => {
      const key = id.source?.displayName || id.source?.queryName || 'field';
      if (id.equals !== undefined) {
        row.data[key] = id.equals;
      }
    });

    // Extract any other values that weren't mapped
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && !Object.values(row.data).includes(value)) {
        row.data[key] = value;
      }
    });

    processedData.rows.push(row);
    return processedData;
  }

  /**
   * Handle data selection events from PowerBI (legacy postMessage)
   */
  handleDataSelected(data) {
    console.log('PowerBI Row Capture: Data selected via postMessage', data);
    
    if (data.detail && data.detail.dataPoints) {
      this.selectedRowData = this.processDataPoints(data.detail.dataPoints);
      this.updatePDFButton();
      this.showSelectedDataPreview();
    }
  }

  /**
   * Handle selection changed events from PowerBI
   */
  handleSelectionChanged(data) {
    console.log('PowerBI Row Capture: Selection changed', data);
    this.handleDataSelected(data);
  }

  /**
   * Process PowerBI data points into usable format
   */
  processDataPoints(dataPoints) {
    const processedData = {
      timestamp: new Date().toISOString(),
      source: 'PowerBI Report',
      rows: []
    };

    dataPoints.forEach((point, index) => {
      const row = {
        rowIndex: index,
        data: {}
      };

      // Extract identity and values
      if (point.identity) {
        point.identity.forEach(identity => {
          const key = identity.source ? identity.source.displayName || identity.source.queryName : 'field';
          row.data[key] = identity.equals;
        });
      }

      if (point.values) {
        point.values.forEach(value => {
          const key = value.source ? value.source.displayName || value.source.queryName : 'value';
          row.data[key] = value.value;
        });
      }

      processedData.rows.push(row);
    });

    return processedData;
  }

  /**
   * Create PDF generation button
   */
  createPDFButton() {
    // Check if button already exists
    if (document.getElementById('powerbi-pdf-btn')) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'powerbi-pdf-btn';
    button.className = 'powerbi-pdf-button hidden';
    button.innerHTML = `
      <span class="pdf-icon">📄</span>
      <span class="pdf-text">Generate PDF from Selected Data</span>
    `;
    
    button.addEventListener('click', () => this.generatePDF());

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .powerbi-pdf-button {
        position: fixed;
        top: 120px;
        right: 20px;
        z-index: 1000;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 250px;
      }
      
      .powerbi-pdf-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      }
      
      .powerbi-pdf-button.hidden {
        display: none;
      }
      
      .powerbi-pdf-button.enabled {
        display: flex;
        animation: slideInRight 0.3s ease;
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .pdf-icon {
        font-size: 16px;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(button);
  }

  /**
   * Update PDF button visibility and state
   */
  updatePDFButton() {
    const button = document.getElementById('powerbi-pdf-btn');
    if (button && this.selectedRowData) {
      button.className = 'powerbi-pdf-button enabled';
      const text = button.querySelector('.pdf-text');
      if (text) {
        const rowCount = this.selectedRowData.rows.length;
        text.textContent = `Generate PDF (${rowCount} row${rowCount !== 1 ? 's' : ''} selected)`;
      }
    }
  }

  /**
   * Show instructions to user
   */
  showInstructions() {
    // Create temporary instruction overlay
    const overlay = document.createElement('div');
    overlay.id = 'powerbi-instructions';
    overlay.innerHTML = `
      <div class="instruction-content">
        <h3>📋 PowerBI Data to PDF</h3>
        <p><strong>New Method:</strong> Use the blue "Paste PowerBI Data Here" button!</p>
        <div style="text-align: left; margin: 15px 0; padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
          <strong>Steps:</strong>
          <ol style="margin: 10px 0; padding-left: 20px;">
            <li>Right-click on a PowerBI table row</li>
            <li>Select "Copy" or "Copy selection"</li>
            <li>Click the blue "Paste PowerBI Data Here" button</li>
            <li>Paste the data and click "Generate PDF"</li>
          </ol>
        </div>
        <p style="font-size: 14px; color: #666;">This works with the exact same right-click → Copy method you showed in the screenshot!</p>
        <button onclick="this.parentElement.parentElement.remove()">Got it!</button>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      #powerbi-instructions {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      
      .instruction-content {
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        text-align: center;
        max-width: 500px;
      }
      
      .instruction-content h3 {
        margin: 0 0 15px 0;
        color: #333;
      }
      
      .instruction-content p {
        margin: 10px 0;
        color: #666;
        line-height: 1.5;
      }
      
      .instruction-content button {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        margin-top: 15px;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.remove();
      }
    }, 10000);
  }

  /**
   * Show manual data entry interface as fallback
   */
  showManualDataEntry() {
    // Create manual data entry modal
    const modal = document.createElement('div');
    modal.id = 'manual-data-entry';
    modal.innerHTML = `
      <div class="manual-entry-content">
        <h3>📝 Enter PowerBI Data Manually</h3>
        <p>Copy data from your PowerBI table and paste it here:</p>
        
        <div class="entry-form">
          <div class="form-group">
            <label>Gallery:</label>
            <input type="text" id="manual-gallery" placeholder="e.g. Castle Gallery">
          </div>
          <div class="form-group">
            <label>Qty Sold:</label>
            <input type="number" id="manual-qty" placeholder="e.g. 25">
          </div>
          <div class="form-group">
            <label>SO Total:</label>
            <input type="number" id="manual-total" placeholder="e.g. 15000">
          </div>
          <div class="form-group">
            <label>% of Sales by Gallery:</label>
            <input type="number" id="manual-percent" placeholder="e.g. 19.13" step="0.01">
          </div>
          
          <div class="form-actions">
            <button onclick="window.powerBIRowCapture.processManualData()" style="background: #28a745;">Generate PDF</button>
            <button onclick="document.getElementById('manual-data-entry').remove()" style="background: #dc3545; margin-left: 10px;">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      #manual-data-entry {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      
      .manual-entry-content {
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
      }
      
      .manual-entry-content h3 {
        margin: 0 0 15px 0;
        color: #333;
      }
      
      .form-group {
        margin: 15px 0;
        text-align: left;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: #555;
      }
      
      .form-group input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .form-actions {
        margin-top: 20px;
        text-align: center;
      }
      
      .form-actions button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        color: white;
        cursor: pointer;
        font-size: 14px;
      }
    `;
    
    if (!document.getElementById('manual-data-entry-styles')) {
      style.id = 'manual-data-entry-styles';
      document.head.appendChild(style);
    }
    
    document.body.appendChild(modal);
  }

  /**
   * Process manually entered data
   */
  processManualData() {
    const gallery = document.getElementById('manual-gallery')?.value || '';
    const qty = document.getElementById('manual-qty')?.value || '';
    const total = document.getElementById('manual-total')?.value || '';
    const percent = document.getElementById('manual-percent')?.value || '';

    if (!gallery && !qty && !total && !percent) {
      alert('Please enter at least one field of data.');
      return;
    }

    // Create data structure
    this.selectedRowData = {
      timestamp: new Date().toISOString(),
      source: 'Manual Entry',
      rows: [{
        rowIndex: 0,
        data: {
          'Gallery': gallery,
          'Qty Sold': qty ? Number(qty) : '',
          'SO Total': total ? Number(total) : '',
          '% of Sales by Gallery': percent ? Number(percent) / 100 : '' // Convert to decimal
        }
      }]
    };

    // Remove empty values
    Object.keys(this.selectedRowData.rows[0].data).forEach(key => {
      if (this.selectedRowData.rows[0].data[key] === '') {
        delete this.selectedRowData.rows[0].data[key];
      }
    });

    // Update UI and close modal
    this.updatePDFButton();
    document.getElementById('manual-data-entry')?.remove();
    
    console.log('Manual data processed:', this.selectedRowData);
  }

  /**
   * Show selected data preview
   */
  showSelectedDataPreview() {
    if (!this.selectedRowData) return;
    
    console.log('Selected Data Preview:', this.selectedRowData);
    
    // Create preview modal (optional - for debugging)
    if (window.location.search.includes('debug=true')) {
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="position: fixed; top: 20px; left: 20px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 9999; max-width: 400px; max-height: 300px; overflow-y: auto;">
          <h4>Selected Data Preview</h4>
          <pre style="font-size: 12px; background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(this.selectedRowData, null, 2)}</pre>
          <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        </div>
      `;
      document.body.appendChild(modal);
      
      setTimeout(() => modal.remove(), 8000);
    }
  }

  /**
   * Enable row capture functionality
   */
  enableRowCapture() {
    // Send configuration message to PowerBI iframe
    const iframes = document.querySelectorAll('iframe[src*="powerbi.com"]');
    
    iframes.forEach(iframe => {
      const config = {
        type: 'config',
        settings: {
          enableSelection: true,
          enableDataSelection: true,
          multiSelect: false
        }
      };
      
      try {
        iframe.contentWindow.postMessage(config, '*');
      } catch (error) {
        console.warn('Could not configure PowerBI iframe:', error);
      }
    });
  }

  /**
   * Load PDF generator (integrate with existing jsPDF system)
   */
  async loadPDFGenerator() {
    // Load jsPDF if not already loaded
    if (!window.jspdf) {
      await this.loadJSPDF();
    }
    
    this.pdfGenerator = {
      generateFromRowData: (data) => {
        return this.createPowerBIPDF(data);
      }
    };
  }

  /**
   * Load jsPDF library dynamically
   */
  async loadJSPDF() {
    return new Promise((resolve, reject) => {
      if (window.jspdf) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        console.log('jsPDF loaded successfully');
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load jsPDF'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Generate PDF from selected row data
   */
  async generatePDF() {
    if (!this.selectedRowData) {
      alert('No data selected. Please click on a row in the PowerBI table first.');
      return;
    }

    try {
      const button = document.getElementById('powerbi-pdf-btn');
      if (button) {
        button.innerHTML = `<span class="pdf-icon">⏳</span><span class="pdf-text">Generating PDF...</span>`;
        button.disabled = true;
      }

      const pdfBlob = await this.pdfGenerator.generateFromRowData(this.selectedRowData);
      
      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `powerbi-data-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Reset button
      if (button) {
        button.innerHTML = `<span class="pdf-icon">✅</span><span class="pdf-text">PDF Generated!</span>`;
        setTimeout(() => {
          this.updatePDFButton();
          button.disabled = false;
        }, 2000);
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
      
      const button = document.getElementById('powerbi-pdf-btn');
      if (button) {
        button.innerHTML = `<span class="pdf-icon">❌</span><span class="pdf-text">Error - Try Again</span>`;
        button.disabled = false;
      }
    }
  }

  /**
   * Create PowerBI data PDF using jsPDF
   */
  createPowerBIPDF(data) {
    return new Promise((resolve, reject) => {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set default font (using Helvetica like LOP system for compatibility)
        doc.setFont('helvetica', 'normal');
        
        let yPosition = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        
        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        const title = 'PowerBI Data Export';
        const titleWidth = doc.getTextWidth(title);
        doc.text(title, (pageWidth - titleWidth) / 2, yPosition);
        yPosition += 15;
        
        // Generated timestamp
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const timestamp = `Generated: ${new Date().toLocaleString()}`;
        const timestampWidth = doc.getTextWidth(timestamp);
        doc.text(timestamp, (pageWidth - timestampWidth) / 2, yPosition);
        yPosition += 20;
        
        // Data section
        if (data.rows && data.rows.length > 0) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Selected Data:', margin, yPosition);
          yPosition += 10;
          
          // Process each row
          data.rows.forEach((row, index) => {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Row ${index + 1}:`, margin, yPosition);
            yPosition += 8;
            
            // Display row data
            if (row.data && typeof row.data === 'object') {
              Object.entries(row.data).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(10);
                  
                  const text = `${key}: ${String(value)}`;
                  const textLines = doc.splitTextToSize(text, contentWidth - 10);
                  
                  textLines.forEach(line => {
                    if (yPosition > 280) { // Near bottom of page
                      doc.addPage();
                      yPosition = 20;
                    }
                    doc.text(line, margin + 5, yPosition);
                    yPosition += 5;
                  });
                }
              });
            }
            
            yPosition += 5; // Space between rows
            
            // Check if we need a new page
            if (yPosition > 270 && index < data.rows.length - 1) {
              doc.addPage();
              yPosition = 20;
            }
          });
        } else {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          doc.text('No data selected', margin, yPosition);
        }
        
        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          const footerText = `Page ${i} of ${pageCount} - Generated by Castle Comms PowerBI Integration`;
          const footerWidth = doc.getTextWidth(footerText);
          doc.text(footerText, (pageWidth - footerWidth) / 2, 290);
        }
        
        // Convert to blob
        const pdfBlob = doc.output('blob');
        resolve(pdfBlob);
        
      } catch (error) {
        console.error('Error creating PDF:', error);
        reject(error);
      }
    });
  }
}

// Initialize the PowerBI Row Capture system
window.powerBIRowCapture = new PowerBIRowCapture();

console.log('PowerBI Row Capture System Loaded');