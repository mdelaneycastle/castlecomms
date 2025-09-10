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
    this.setupMessageListener();
    this.createPDFButton();
    this.loadPDFGenerator();
  }

  /**
   * Set up postMessage listener for PowerBI events
   */
  setupMessageListener() {
    if (this.isListening) return;

    window.addEventListener('message', (event) => {
      // Only accept messages from PowerBI domains
      if (!this.isPowerBIDomain(event.origin)) {
        return;
      }

      console.log('PowerBI Message Received:', event.data);

      // Handle different PowerBI event types
      if (event.data && event.data.event) {
        switch (event.data.event) {
          case 'loaded':
            this.handleReportLoaded(event.data);
            break;
          case 'rendered':
            this.handleReportRendered(event.data);
            break;
          case 'dataSelected':
            this.handleDataSelected(event.data);
            break;
          case 'selectionChanged':
            this.handleSelectionChanged(event.data);
            break;
        }
      }
    });

    this.isListening = true;
    console.log('PowerBI Row Capture: Message listener ready');
  }

  /**
   * Check if origin is from PowerBI domain
   */
  isPowerBIDomain(origin) {
    const powerbiDomains = [
      'https://app.powerbi.com',
      'https://msit.powerbi.com',
      'https://powerbi.microsoft.com'
    ];
    
    return powerbiDomains.some(domain => origin.startsWith(domain));
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
   * Handle data selection events from PowerBI
   */
  handleDataSelected(data) {
    console.log('PowerBI Row Capture: Data selected', data);
    
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
        <h3>📋 PowerBI Row Selection</h3>
        <p>Click on any row in the PowerBI table to select data for PDF generation.</p>
        <p>The PDF button will appear when you select data.</p>
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
        max-width: 400px;
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
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.remove();
      }
    }, 5000);
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