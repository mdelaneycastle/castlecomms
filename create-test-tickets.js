// Test script to create 30 COFT tickets for testing team member functionality
// Run this in the browser console on a page that has Firebase initialized

async function createTestTickets() {
  console.log('🎫 Starting creation of 30 test COFT tickets...');
  
  if (!firebase || !firebase.firestore) {
    console.error('❌ Firebase not initialized');
    return;
  }
  
  const db = firebase.firestore();
  
  // Gallery emails mapped to COFT team members
  const galleryEmails = {
    // Philippa's locations
    philippa: [
      'bluewater@castlefineart.com', 'brighton@castlefineart.com', 'chester@castlefineart.com',
      'coventgarden@castlefineart.com', 'guildford@castlefineart.com', 'harrogate@castlefineart.com',
      'leamington@castlefineart.com', 'liverpool@castlefineart.com', 'manchester@castlefineart.com',
      'oxford@castlefineart.com', 'reading@castlefineart.com', 'scp@castlefineart.com', 'windsor@castlefineart.com'
    ],
    // Amelia's locations  
    amelia: [
      'bristol@castlefineart.com', 'cheltenham@castlefineart.com', 'edinburgh@castlefineart.com',
      'exeter@castlefineart.com', 'glasgow@castlefineart.com', 'mailbox@castlefineart.com',
      'marlow@castlefineart.com', 'newcastle@castlefineart.com', 'norwich@castlefineart.com',
      'nottingham@castlefineart.com', 'tunbridgewells@castlefineart.com', 'winchester@castlefineart.com'
    ],
    // Tara's locations
    tara: [
      'bath@castlefineart.com', 'cambridge@castlefineart.com', 'canterbury@castlefineart.com',
      'cardiff@castlefineart.com', 'derby@castlefineart.com', 'icc@castlefineart.com',
      'leeds@castlefineart.com', 'meadowhall@castlefineart.com', 'miltonkeynes@castlefineart.com',
      'sms@castlefineart.com', 'stamford@castlefineart.com', 'stratforduponavon@castlefineart.com', 'york@castlefineart.com'
    ],
    // Gerald's locations
    gerald: ['usa@castlefineart.com', 'web@castlefineart.com']
  };
  
  // Flatten all emails for random selection
  const allEmails = [
    ...galleryEmails.philippa,
    ...galleryEmails.amelia, 
    ...galleryEmails.tara,
    ...galleryEmails.gerald
  ];
  
  // Sample data for realistic tickets
  const sampleClients = [
    'John Smith', 'Sarah Johnson', 'Michael Brown', 'Emma Wilson', 'David Lee',
    'Lisa Davis', 'Robert Miller', 'Jennifer Garcia', 'William Martinez', 'Ashley Rodriguez',
    'Christopher Lopez', 'Amanda Taylor', 'Matthew Anderson', 'Jessica Thomas', 'Daniel Jackson',
    'Emily White', 'James Harris', 'Michelle Martin', 'Ryan Thompson', 'Stephanie Garcia'
  ];
  
  const sampleArtworks = [
    'Blue Horizons', 'Golden Sunset', 'Urban Dreams', 'Forest Path', 'Ocean Waves',
    'Mountain View', 'City Lights', 'Spring Garden', 'Autumn Leaves', 'Winter Landscape',
    'Abstract Flow', 'Color Symphony', 'Modern Lines', 'Classic Portrait', 'Still Life',
    'Watercolor Study', 'Oil Painting', 'Mixed Media', 'Digital Art', 'Photography Print'
  ];
  
  const deliveryMethods = ['Standard Delivery', 'Express Delivery', 'Collection', 'Special Delivery'];
  const ticketReasons = [
    'Client requesting update on delivery',
    'Order delayed - need status',
    'Client needs the order by a specific date',
    'Quality issue reported',
    'Delivery address change required'
  ];
  
  // Get COFT team data
  const teamsSnapshot = await db.collection('teams').where('name', '==', 'COFT').get();
  if (teamsSnapshot.empty) {
    console.error('❌ COFT team not found');
    return;
  }
  
  const coftTeam = teamsSnapshot.docs[0].data();
  const coftTeamId = teamsSnapshot.docs[0].id;
  
  console.log('✅ Found COFT team:', coftTeam.name);
  
  const tickets = [];
  
  // Generate 25 Order Chasing tickets
  console.log('📝 Creating 25 Order Chasing tickets...');
  for (let i = 0; i < 25; i++) {
    const randomEmail = allEmails[Math.floor(Math.random() * allEmails.length)];
    const galleryName = randomEmail.split('@')[0].charAt(0).toUpperCase() + randomEmail.split('@')[0].slice(1);
    
    const ticketData = {
      ticketId: `TKT-${Date.now().toString().slice(-6)}${i.toString().padStart(2, '0')}`,
      title: `COFT Ticket - SO: SO${10000 + i} - ${sampleClients[i % sampleClients.length]}`,
      description: buildCOFTDescription({
        coftType: 'order-chasing',
        soNumber: `SO${10000 + i}`,
        clientName: sampleClients[i % sampleClients.length],
        itemCode: `ITEM${1000 + i}`,
        artworkTitle: sampleArtworks[i % sampleArtworks.length],
        editionNumber: `${i + 1}/100`,
        orderDate: '2025-01-15',
        deliveryMethod: deliveryMethods[i % deliveryMethods.length],
        ticketReason: ticketReasons[i % ticketReasons.length],
        clientAware: 'yes',
        etaDiscussed: 'yes',
        additionalInfo: `Test ticket ${i + 1} for order chasing testing`
      }),
      category: 'Client Order Fulfilment Team/Group',
      status: 'open',
      createdBy: {
        uid: `test-user-${i}`,
        email: randomEmail,
        name: `${galleryName} Gallery`
      },
      assignedTo: {
        type: 'team',
        teamId: coftTeamId,
        teamName: coftTeam.name,
        teamMembers: coftTeam.members
      },
      coftTeamMemberOverride: null, // No override for order chasing
      createdAt: firebase.firestore.Timestamp.now(),
      updatedAt: firebase.firestore.Timestamp.now(),
      messages: [],
      timer: {
        timeStarted: firebase.firestore.Timestamp.now(),
        timeElapsed: 0,
        timePaused: null,
        totalPausedTime: 0,
        isRunning: true
      }
    };
    
    tickets.push(ticketData);
  }
  
  // Generate 5 Reprocessing tickets (Katie Lewis override)
  console.log('📝 Creating 5 Reprocessing tickets with Katie Lewis override...');
  for (let i = 25; i < 30; i++) {
    const randomEmail = allEmails[Math.floor(Math.random() * allEmails.length)];
    const galleryName = randomEmail.split('@')[0].charAt(0).toUpperCase() + randomEmail.split('@')[0].slice(1);
    
    const ticketData = {
      ticketId: `TKT-${Date.now().toString().slice(-6)}${i.toString().padStart(2, '0')}`,
      title: `COFT Ticket - SO: SO${10000 + i} - ${sampleClients[i % sampleClients.length]}`,
      description: buildCOFTDescription({
        coftType: 'reprocessing',
        soNumber: `SO${10000 + i}`,
        clientName: sampleClients[i % sampleClients.length],
        itemCode: `ITEM${1000 + i}`,
        artworkTitle: sampleArtworks[i % sampleArtworks.length],
        editionNumber: `${i + 1}/100`,
        orderDate: '2025-01-15',
        deliveryMethod: deliveryMethods[i % deliveryMethods.length],
        ticketReason: ticketReasons[i % ticketReasons.length],
        clientAware: 'yes',
        etaDiscussed: 'yes',
        additionalInfo: `Test reprocessing ticket ${i - 24} - should assign Katie Lewis`
      }),
      category: 'Client Order Fulfilment Team/Group',
      status: 'open',
      createdBy: {
        uid: `test-user-${i}`,
        email: randomEmail,
        name: `${galleryName} Gallery`
      },
      assignedTo: {
        type: 'team',
        teamId: coftTeamId,
        teamName: coftTeam.name,
        teamMembers: coftTeam.members
      },
      coftTeamMemberOverride: 'Katie Lewis', // Override for reprocessing
      createdAt: firebase.firestore.Timestamp.now(),
      updatedAt: firebase.firestore.Timestamp.now(),
      messages: [],
      timer: {
        timeStarted: firebase.firestore.Timestamp.now(),
        timeElapsed: 0,
        timePaused: null,
        totalPausedTime: 0,
        isRunning: true
      }
    };
    
    tickets.push(ticketData);
  }
  
  // Add tickets to Firestore
  console.log('💾 Adding tickets to Firestore...');
  const batch = db.batch();
  
  tickets.forEach(ticket => {
    const docRef = db.collection('tickets').doc();
    batch.set(docRef, ticket);
  });
  
  try {
    await batch.commit();
    console.log('✅ Successfully created 30 test tickets!');
    console.log('📊 Summary:');
    console.log('  - 25 Order Chasing tickets (normal COFT assignment)');
    console.log('  - 5 Reprocessing tickets (Katie Lewis override)');
    console.log('  - Distributed across all gallery locations');
    console.log('🔍 Test the COFT Team Member filter to verify functionality');
  } catch (error) {
    console.error('❌ Error creating tickets:', error);
  }
}

// Helper function to build COFT description
function buildCOFTDescription(coftData) {
  return `
**COFT Request Type:** ${coftData.coftType === 'order-chasing' ? 'Order Chasing' : 'Items Sourced/Reprocessing'}

**Order Details:**
• SO Number: ${coftData.soNumber}
• Client Name: ${coftData.clientName}
• Item Code: ${coftData.itemCode}
• Artwork Title: ${coftData.artworkTitle}
• Edition Number: ${coftData.editionNumber}

**Delivery Information:**
• Order Date: ${coftData.orderDate}
• Delivery Method: ${coftData.deliveryMethod}
• Ticket Reason: ${coftData.ticketReason}

**Client Communication:**
• Client Aware of Issue: ${coftData.clientAware}
• ETA Discussed with Client: ${coftData.etaDiscussed}

**Additional Information:**
${coftData.additionalInfo}
  `.trim();
}

// Instructions
console.log(`
🎫 COFT Test Tickets Generator
=============================

To create 30 test tickets, run:
createTestTickets()

This will create:
- 25 Order Chasing tickets (normal COFT team assignment)
- 5 Reprocessing tickets (Katie Lewis override)
- Distributed across all gallery email addresses
- Realistic sample data for testing

Make sure you're on a page with Firebase initialized (like tickets.html)
`);