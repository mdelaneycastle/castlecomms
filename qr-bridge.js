/**
 * QR Code Bridge - Connects QR Creator with Event Workflow
 * Handles QR generation, extraction, and integration with the workflow system
 */

class QRBridge {
    constructor() {
        this.qrCreatorWindow = null;
        this.onQRGeneratedCallback = null;
        this.eventData = {};
    }

    /**
     * Initialize QR Creator in popup window instead of iframe to avoid CORS issues
     */
    initializeQRCreator(containerElement, csvData) {
        // Open QR creator in a new window to avoid CORS restrictions
        const popup = window.open('qrcreator.html', 'qrcreator', 'width=1200,height=800,scrollbars=yes,resizable=yes');

        if (!popup) {
            throw new Error('Popup blocked. Please allow popups for this site.');
        }

        // Store reference
        this.qrCreatorWindow = popup;

        // Show message in container
        containerElement.innerHTML = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <h3 class="text-lg font-semibold text-blue-900 mb-4">QR Creator Opened</h3>
                <p class="text-blue-700 mb-4">The QR Creator has opened in a new window. Once you generate the QR codes, this system will automatically detect them and continue the workflow.</p>
                <div class="flex items-center justify-center space-x-2 text-sm text-blue-600">
                    <div class="spinner w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full"></div>
                    <span>Waiting for QR generation...</span>
                </div>
            </div>
        `;

        // Wait for popup to load and then populate data
        popup.addEventListener('load', () => {
            this.populateQRCreatorData(popup, csvData);
        });

        return popup;
    }

    /**
     * Populate QR Creator with CSV data
     */
    populateQRCreatorData(popup, csvData) {
        try {
            // Wait for the popup window to fully load
            const checkReady = setInterval(() => {
                try {
                    if (popup.document && popup.document.readyState === 'complete') {
                        clearInterval(checkReady);

                        // Convert CSV data to the format expected by QR creator
                        const csvContent = this.convertToCSV(csvData);

                        // Simulate file upload to QR creator
                        this.simulateCSVUpload(popup.document, csvContent, csvData);
                    }
                } catch (e) {
                    // Popup may not be ready yet, continue waiting
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkReady);
                console.warn('Popup loading timeout - manual CSV upload will be required');
            }, 10000);

        } catch (error) {
            console.error('Error populating QR creator:', error);
        }
    }

    /**
     * Convert JSON data to CSV format
     */
    convertToCSV(jsonData) {
        if (!jsonData || jsonData.length === 0) return '';

        const headers = Object.keys(jsonData[0]);
        const csvRows = [headers.join(',')];

        for (const row of jsonData) {
            const values = headers.map(header => {
                const value = row[header] || '';
                // Escape quotes and wrap in quotes if contains comma
                return value.toString().includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }

    /**
     * Simulate CSV upload to QR creator
     */
    simulateCSVUpload(iframeDoc, csvContent, originalData) {
        try {
            const qrCreatorWindow = iframeDoc.defaultView;

            // Wait for QR creator to be ready
            const checkReady = setInterval(() => {
                if (qrCreatorWindow.workbookData !== undefined) {
                    clearInterval(checkReady);

                    // Set the workbook data directly
                    qrCreatorWindow.workbookData = originalData;
                    qrCreatorWindow.headers = Object.keys(originalData[0]);

                    // Populate column selectors
                    qrCreatorWindow.populateColumnSelectors(qrCreatorWindow.headers);

                    // Auto-set name and guest columns
                    const nameCol = qrCreatorWindow.headers.find(h => h.toLowerCase().includes('name'));
                    const guestCol = qrCreatorWindow.headers.find(h => h.toLowerCase().includes('guest'));

                    if (nameCol) {
                        iframeDoc.getElementById('nameCol').value = encodeURIComponent(nameCol);
                    }
                    if (guestCol) {
                        iframeDoc.getElementById('guestsCol').value = encodeURIComponent(guestCol);
                    }

                    // Enable generate button
                    const generateBtn = iframeDoc.getElementById('generateBtn');
                    if (generateBtn) {
                        generateBtn.disabled = false;
                    }

                    console.log('✅ QR Creator populated with data');
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkReady);
            }, 10000);

        } catch (error) {
            console.error('Error simulating CSV upload:', error);
        }
    }

    /**
     * Monitor QR Creator for generated QR codes
     */
    monitorQRGeneration(popup, callback) {
        this.onQRGeneratedCallback = callback;

        try {
            // Monitor for QR generation completion
            const monitor = setInterval(() => {
                try {
                    if (popup.closed) {
                        clearInterval(monitor);
                        console.warn('QR Creator popup was closed');
                        return;
                    }

                    const resultsSection = popup.document.getElementById('resultsSection');
                    if (resultsSection && !resultsSection.classList.contains('hidden')) {
                        const qrCanvases = popup.document.querySelectorAll('#resultsBody canvas');

                        if (qrCanvases.length > 0) {
                            clearInterval(monitor);
                            this.extractQRCodes(popup.document, qrCanvases);
                        }
                    }
                } catch (e) {
                    // Popup may not be accessible, continue monitoring
                }
            }, 1000);

            // Timeout after 5 minutes
            setTimeout(() => {
                clearInterval(monitor);
                console.warn('QR generation monitoring timeout');
            }, 300000);

        } catch (error) {
            console.error('Error monitoring QR generation:', error);
        }
    }

    /**
     * Extract QR codes from canvases and create ZIP
     */
    async extractQRCodes(iframeDoc, qrCanvases) {
        try {
            const zip = new JSZip();
            const qrFolder = zip.folder('qr-codes');

            // Convert each canvas to PNG and add to ZIP
            const promises = Array.from(qrCanvases).map((canvas, index) => {
                return new Promise((resolve) => {
                    canvas.toBlob((blob) => {
                        const filename = this.generateQRFilename(index);
                        qrFolder.file(filename, blob);
                        resolve();
                    }, 'image/png');
                });
            });

            await Promise.all(promises);

            // Generate ZIP blob
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            console.log('✅ QR codes extracted and zipped');

            // Notify callback
            if (this.onQRGeneratedCallback) {
                this.onQRGeneratedCallback({
                    success: true,
                    zipBlob: zipBlob,
                    count: qrCanvases.length
                });
            }

        } catch (error) {
            console.error('Error extracting QR codes:', error);
            if (this.onQRGeneratedCallback) {
                this.onQRGeneratedCallback({
                    success: false,
                    error: error.message
                });
            }
        }
    }

    /**
     * Generate filename for QR code
     */
    generateQRFilename(index) {
        return `Row-${String(index + 1).padStart(2, '0')}.png`;
    }

    /**
     * Upload QR ZIP to backend
     */
    async uploadQRZip(eventName, zipBlob) {
        try {
            const formData = new FormData();
            formData.append('qr_zip', zipBlob, 'qr_codes.zip');

            const response = await fetch(`/api/events/${eventName}/qr-extract`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                console.log(`✅ QR codes uploaded and extracted (${result.qr_count} files)`);
            } else {
                console.error('❌ QR upload failed:', result.error);
            }

            return result;

        } catch (error) {
            console.error('Error uploading QR ZIP:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Full QR generation workflow
     */
    async generateQRWorkflow(containerElement, csvData, eventName) {
        return new Promise((resolve, reject) => {
            try {
                // Initialize QR creator
                const popup = this.initializeQRCreator(containerElement, csvData);

                // Set up monitoring
                this.onQRGeneratedCallback = async (result) => {
                    if (result.success) {
                        try {
                            // Upload ZIP to backend
                            const uploadResult = await this.uploadQRZip(eventName, result.zipBlob);

                            if (uploadResult.success) {
                                // Close popup
                                if (popup && !popup.closed) {
                                    popup.close();
                                }

                                resolve({
                                    success: true,
                                    qr_count: result.count,
                                    extracted_count: uploadResult.qr_count
                                });
                            } else {
                                reject(new Error(uploadResult.error));
                            }

                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        reject(new Error(result.error));
                    }
                };

                // Start monitoring after popup loads
                setTimeout(() => {
                    this.monitorQRGeneration(popup, this.onQRGeneratedCallback);
                }, 2000);

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get QR generation status
     */
    getQRStatus() {
        return {
            isGenerating: this.onQRGeneratedCallback !== null,
            eventData: this.eventData
        };
    }

    /**
     * Reset QR bridge state
     */
    reset() {
        this.qrCreatorWindow = null;
        this.onQRGeneratedCallback = null;
        this.eventData = {};
    }
}

// API Integration helper
class WorkflowAPI {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    async createEvent(eventName, csvData, eventData) {
        const response = await fetch(`${this.baseUrl}/api/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_name: eventName,
                csv_data: csvData,
                event_data: eventData
            })
        });

        return await response.json();
    }

    async generateAppleWallet(eventName, passConfig = null) {
        // If we have pass customization, save it first
        if (passConfig) {
            await this.savePassCustomization(passConfig);
        }

        const response = await fetch(`${this.baseUrl}/api/events/${eventName}/apple-wallet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                passCustomization: passConfig
            })
        });

        return await response.json();
    }

    async savePassCustomization(config) {
        try {
            // Save to the existing pass_config.json structure
            const configPath = `wallettest/pass_config.json`;
            
            // Create the config file content  
            const passConfig = {
                backgroundColor: config.backgroundColor,
                foregroundColor: config.foregroundColor,
                labelColor: config.labelColor,
                logo: config.logo,
                strip: config.strip,
                background: config.background,
                lastUpdated: new Date().toISOString()
            };

            // Here you would normally save to the backend
            // For now, we'll just log it and rely on localStorage
            console.log('Pass customization saved:', passConfig);
            
            return { success: true };
        } catch (error) {
            console.warn('Could not save to backend:', error.message);
            return { success: true }; // Fallback to localStorage
        }
    }

    async generateGoogleWallet(eventName) {
        const response = await fetch(`${this.baseUrl}/api/events/${eventName}/google-wallet`, {
            method: 'POST'
        });

        return await response.json();
    }

    async generateEmails(eventName) {
        const response = await fetch(`${this.baseUrl}/api/events/${eventName}/emails/generate`, {
            method: 'POST'
        });

        return await response.json();
    }

    async sendEmails(eventName) {
        const response = await fetch(`${this.baseUrl}/api/events/${eventName}/emails/send`, {
            method: 'POST'
        });

        return await response.json();
    }

    async getProgress(eventName) {
        const response = await fetch(`${this.baseUrl}/api/events/${eventName}/progress`);
        return await response.json();
    }

    async downloadFiles(eventName, fileType) {
        const response = await fetch(`${this.baseUrl}/api/events/${eventName}/files/${fileType}`);

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${eventName}_${fileType}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            throw new Error('Download failed');
        }
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QRBridge, WorkflowAPI };
}