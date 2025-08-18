/**
 * COFT Ticket Reports Module
 * Handles extraction and generation of COFT team ticket reports
 */

console.log('📊 COFT Ticket Reports module loaded');

// COFT team members based on the same logic used in tickets display
const COFT_TEAM_MEMBERS = ['Philippa', 'Amelia', 'Tara', 'Gerald', 'Katie Lewis'];

/**
 * Get COFT team member based on email address (same logic as tickets.html)
 */
function getCOFTTeamMember(email) {
  if (!email) return '-';
  
  const emailLower = email.toLowerCase();
  
  // Extract the prefix before @ symbol
  const emailPrefix = emailLower.split('@')[0];
  
  // Philippa's locations
  const philippaLocations = [
    'bluewater', 'brighton', 'chester', 'coventgarden', 'guildford', 
    'harrogate', 'leamington', 'liverpool', 'manchester', 'oxford', 
    'reading', 'scp', 'windsor'
  ];
  
  // Amelia's locations
  const ameliaLocations = [
    'bristol', 'cheltenham', 'edinburgh', 'exeter', 'glasgow', 
    'mailbox', 'marlow', 'newcastle', 'norwich', 'nottingham', 
    'tunbridgewells', 'winchester'
  ];
  
  // Tara's locations
  const taraLocations = [
    'bath', 'cambridge', 'canterbury', 'cardiff', 'derby', 'icc', 
    'leeds', 'meadowhall', 'miltonkeynes', 'sms', 'stamford', 
    'stratforduponavon', 'york'
  ];
  
  // Gerald's locations
  const geraldLocations = ['usa', 'web'];
  
  // Check which team member based on email prefix
  for (const location of philippaLocations) {
    if (emailPrefix.startsWith(location)) {
      return 'Philippa';
    }
  }
  
  for (const location of ameliaLocations) {
    if (emailPrefix.startsWith(location)) {
      return 'Amelia';
    }
  }
  
  for (const location of taraLocations) {
    if (emailPrefix.startsWith(location)) {
      return 'Tara';
    }
  }
  
  for (const location of geraldLocations) {
    if (emailPrefix.startsWith(location)) {
      return 'Gerald';
    }
  }
  
  // Default if no match found
  return '-';
}

/**
 * Get COFT team member from ticket
 */
function getCOFTTeamMemberFromTicket(ticket) {
  // Check for override first (for reprocessing tickets)
  if (ticket.coftTeamMemberOverride) {
    return ticket.coftTeamMemberOverride;
  }
  
  // Check assigned-to field
  if (ticket.assignedTo) {
    if (ticket.assignedTo.type === 'team' && ticket.assignedTo.teamMembers) {
      // Check team members for COFT assignment
      for (const member of ticket.assignedTo.teamMembers) {
        const memberName = getCOFTTeamMember(member.email);
        if (memberName !== '-') {
          return memberName;
        }
      }
    } else if (ticket.assignedTo.email) {
      // Check individual assignment
      const memberName = getCOFTTeamMember(ticket.assignedTo.email);
      if (memberName !== '-') {
        return memberName;
      }
    }
  }
  
  // Check created-by field as fallback
  if (ticket.createdBy && ticket.createdBy.email) {
    const memberName = getCOFTTeamMember(ticket.createdBy.email);
    if (memberName !== '-') {
      return memberName;
    }
  }
  
  return null;
}

/**
 * Filter tickets by month and year
 */
function filterTicketsByMonth(tickets, year, month) {
  return tickets.filter(ticket => {
    const ticketDate = ticket.createdAt?.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
    return ticketDate.getFullYear() === year && ticketDate.getMonth() === month;
  });
}

/**
 * Get months that have tickets
 */
function getMonthsWithTickets(tickets) {
  const months = new Set();
  tickets.forEach(ticket => {
    const ticketDate = ticket.createdAt?.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
    const monthYear = `${ticketDate.getFullYear()}-${ticketDate.getMonth()}`;
    months.add(monthYear);
  });
  
  return Array.from(months).sort().map(monthYear => {
    const [year, month] = monthYear.split('-');
    return {
      year: parseInt(year),
      month: parseInt(month),
      label: new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  });
}

/**
 * Generate COFT team ticket report data
 */
function generateCOFTReportData(tickets, year, month) {
  console.log(`📊 Generating COFT report for ${new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}`);
  
  // Filter tickets by month
  const monthlyTickets = filterTicketsByMonth(tickets, year, month);
  console.log(`Found ${monthlyTickets.length} tickets for the selected month`);
  
  // Initialize report data for each COFT member
  const reportData = {};
  COFT_TEAM_MEMBERS.forEach(memberName => {
    reportData[memberName] = {
      name: memberName,
      open: 0,
      'in-progress': 0,
      'on-hold': 0,
      resolved: 0,
      total: 0
    };
  });
  
  // Process tickets
  monthlyTickets.forEach(ticket => {
    const coftMember = getCOFTTeamMemberFromTicket(ticket);
    if (coftMember && reportData[coftMember]) {
      const status = ticket.status || 'open';
      reportData[coftMember][status] = (reportData[coftMember][status] || 0) + 1;
      reportData[coftMember].total++;
    }
  });
  
  // Calculate resolution percentages
  Object.keys(reportData).forEach(memberName => {
    const member = reportData[memberName];
    const totalRaised = member.total;
    const totalResolved = member.resolved;
    member.resolutionRate = totalRaised > 0 ? Math.round((totalResolved / totalRaised) * 100) : 0;
  });
  
  return {
    month: new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' }),
    data: Object.values(reportData),
    summary: {
      totalTickets: monthlyTickets.length,
      totalResolved: Object.values(reportData).reduce((sum, member) => sum + member.resolved, 0),
      overallResolutionRate: monthlyTickets.length > 0 ? 
        Math.round((Object.values(reportData).reduce((sum, member) => sum + member.resolved, 0) / monthlyTickets.length) * 100) : 0
    }
  };
}

/**
 * Convert report data to CSV format
 */
function generateCSV(reportData) {
  const headers = [
    'COFT Team Member',
    'Open',
    'In Progress',
    'On Hold',
    'Resolved',
    'Total Tickets',
    'Resolution Rate (%)'
  ];
  
  let csv = headers.join(',') + '\n';
  
  reportData.data.forEach(member => {
    const row = [
      `"${member.name}"`,
      member.open,
      member['in-progress'],
      member['on-hold'],
      member.resolved,
      member.total,
      member.resolutionRate
    ];
    csv += row.join(',') + '\n';
  });
  
  // Add summary row
  csv += '\n';
  csv += '"SUMMARY",,,,,\n';
  csv += `"Total Tickets",,,,${reportData.summary.totalTickets},\n`;
  csv += `"Total Resolved",,,,${reportData.summary.totalResolved},\n`;
  csv += `"Overall Resolution Rate (%)",,,,${reportData.summary.overallResolutionRate},\n`;
  
  return csv;
}

/**
 * Generate HTML report for viewing/copying
 */
function generateHTMLReport(reportData) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2 style="text-align: center; color: #667eea; margin-bottom: 30px;">
        🎫 COFT Team Ticket Report - ${reportData.month}
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">COFT Team Member</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Open</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">In Progress</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">On Hold</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Resolved</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Total</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Resolution %</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.data.map((member, index) => `
            <tr style="background-color: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">${member.name}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${member.open}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${member['in-progress']}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${member['on-hold']}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #28a745; font-weight: 500;">${member.resolved}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: 500;">${member.total}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: ${member.resolutionRate >= 80 ? '#28a745' : member.resolutionRate >= 60 ? '#ffc107' : '#dc3545'}; font-weight: 500;">${member.resolutionRate}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <h3 style="margin-top: 0; color: #495057;">📊 Summary</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #667eea;">${reportData.summary.totalTickets}</div>
            <div style="color: #6c757d;">Total Tickets</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #28a745;">${reportData.summary.totalResolved}</div>
            <div style="color: #6c757d;">Total Resolved</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: ${reportData.summary.overallResolutionRate >= 80 ? '#28a745' : reportData.summary.overallResolutionRate >= 60 ? '#ffc107' : '#dc3545'};">${reportData.summary.overallResolutionRate}%</div>
            <div style="color: #6c757d;">Overall Resolution Rate</div>
          </div>
        </div>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background: #d1ecf1; border-left: 4px solid #0c5460; border-radius: 4px;">
        <small style="color: #0c5460;">
          📅 Report generated on ${new Date().toLocaleString()}<br>
          🎯 Resolution rate calculated as: (Resolved tickets / Total tickets) × 100
        </small>
      </div>
    </div>
  `;
  
  return html;
}

/**
 * Download CSV file
 */
function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Show report in modal
 */
function showReportModal(html) {
  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 8px;
    max-width: 90%;
    max-height: 90%;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  `;
  
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 15px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6c757d;
    z-index: 1;
  `;
  
  closeButton.onclick = () => document.body.removeChild(modal);
  
  modalContent.innerHTML = html;
  modalContent.appendChild(closeButton);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Close on click outside
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
}

/**
 * Main function to extract COFT ticket report
 */
async function extractCOFTTicketReport(tickets, selectedYear, selectedMonth, format = 'both') {
  try {
    console.log('📊 Starting COFT ticket report extraction...');
    
    // Generate report data
    const reportData = generateCOFTReportData(tickets, selectedYear, selectedMonth);
    
    if (format === 'csv' || format === 'both') {
      // Generate and download CSV
      const csv = generateCSV(reportData);
      const filename = `coft-ticket-report-${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}.csv`;
      downloadCSV(csv, filename);
      console.log('📥 CSV report downloaded:', filename);
    }
    
    if (format === 'html' || format === 'both') {
      // Generate and show HTML report
      const html = generateHTMLReport(reportData);
      showReportModal(html);
      console.log('📋 HTML report displayed in modal');
    }
    
    return reportData;
    
  } catch (error) {
    console.error('❌ Error extracting COFT ticket report:', error);
    alert('Failed to generate report. Please try again.');
    throw error;
  }
}

// Export functions for use in other files
window.COFTTicketReports = {
  extractCOFTTicketReport,
  generateCOFTReportData,
  getMonthsWithTickets,
  getCOFTTeamMemberFromTicket,
  COFT_TEAM_MEMBERS
};