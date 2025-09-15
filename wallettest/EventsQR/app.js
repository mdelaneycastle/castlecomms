let excelData = [];
let qrCodes = [];

document.getElementById('excelFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('processBtn').disabled = false;
    }
});

const uploadArea = document.getElementById('uploadArea');
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        document.getElementById('excelFile').files = files;
        document.getElementById('processBtn').disabled = false;
    }
});

function processFile() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showError('Please select an Excel file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            parseExcelData(jsonData);
        } catch (error) {
            showError('Error reading Excel file: ' + error.message);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function parseExcelData(data) {
    excelData = [];
    
    if (data.length < 2) {
        showError('Excel file must have at least 2 rows (header + data)');
        return;
    }
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.length >= 2 && row[0] && row[1]) {
            const clientName = String(row[0]).trim();
            const guests = parseInt(row[1]) || 0;
            
            if (clientName && guests >= 0) {
                excelData.push({
                    id: generateId(),
                    clientName: clientName,
                    guests: guests,
                    checkInTime: null,
                    checkedIn: false
                });
            }
        }
    }
    
    if (excelData.length === 0) {
        showError('No valid data found. Make sure your Excel has Client Name in column A and Guest count in column B');
        return;
    }
    
    generateQRCodes();
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function generateQRCodes() {
    // Check if QRCode library is loaded
    if (typeof QRCode === 'undefined') {
        showError('QR Code library not loaded. Please refresh the page and try again.');
        return;
    }
    
    qrCodes = [];
    const qrGrid = document.getElementById('qrGrid');
    qrGrid.innerHTML = '';
    
    excelData.forEach((client, index) => {
        const qrData = JSON.stringify({
            id: client.id,
            clientName: client.clientName,
            guests: client.guests,
            eventId: 'EVENT_' + Date.now()
        });
        
        const qrContainer = document.createElement('div');
        qrContainer.className = 'qr-item';
        
        const clientInfo = document.createElement('div');
        clientInfo.className = 'client-info';
        clientInfo.textContent = client.clientName;
        
        const guestCount = document.createElement('div');
        guestCount.className = 'guest-count';
        guestCount.textContent = `${client.guests} guest${client.guests !== 1 ? 's' : ''}`;
        
        const canvas = document.createElement('canvas');
        canvas.id = `qr-${index}`;
        
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download QR';
        downloadBtn.style.fontSize = '12px';
        downloadBtn.style.padding = '5px 10px';
        downloadBtn.onclick = () => downloadSingleQR(canvas, client.clientName);
        
        qrContainer.appendChild(clientInfo);
        qrContainer.appendChild(guestCount);
        qrContainer.appendChild(canvas);
        qrContainer.appendChild(downloadBtn);
        qrGrid.appendChild(qrContainer);
        
        QRCode.toCanvas(canvas, qrData, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, function(error) {
            if (error) {
                console.error('QR Code generation error:', error);
                showError(`Error generating QR code for ${client.clientName}`);
            } else {
                qrCodes.push({
                    canvas: canvas,
                    clientName: client.clientName
                });
            }
        });
    });
    
    document.getElementById('results').style.display = 'block';
    showSuccess(`Generated ${excelData.length} QR codes successfully!`);
}

function downloadSingleQR(canvas, clientName) {
    const link = document.createElement('a');
    link.download = `QR_${sanitizeFilename(clientName)}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

function downloadAllQRCodes() {
    if (qrCodes.length === 0) {
        showError('No QR codes to download');
        return;
    }
    
    if (typeof JSZip === 'undefined') {
        showError('JSZip library not loaded. Please refresh the page and try again.');
        return;
    }
    
    const zip = new JSZip();
    
    qrCodes.forEach(qr => {
        const canvas = qr.canvas;
        const dataURL = canvas.toDataURL();
        const base64Data = dataURL.split(',')[1];
        
        zip.file(`QR_${sanitizeFilename(qr.clientName)}.png`, base64Data, { base64: true });
    });
    
    zip.generateAsync({ type: 'blob' }).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `EventQRCodes_${new Date().toISOString().split('T')[0]}.zip`;
        link.click();
    });
}

function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function showError(message) {
    const existingError = document.querySelector('.error');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    
    document.querySelector('.container').insertBefore(errorDiv, document.querySelector('.upload-section'));
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showSuccess(message) {
    const existingSuccess = document.querySelector('.success');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    
    document.querySelector('.container').insertBefore(successDiv, document.querySelector('.results'));
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}