// Quick script to make specific users admins via HTTP functions
// This avoids needing the service account key

const fetch = require('node-fetch');

async function makeUsersAdmin() {
  const usersToMakeAdmin = [
    'pchapman@washingtongreen.co.uk',
    'jdurrant@castlefineart.com'
  ];

  console.log('🔧 Making users admin via HTTP functions...');
  console.log('Note: You need to run this from a browser console while logged in as an admin');
  
  const script = `
    async function makeUsersAdmin() {
      const usersToMakeAdmin = [
        'pchapman@washingtongreen.co.uk', 
        'jdurrant@castlefineart.com'
      ];
      
      try {
        // Get current user token
        const user = firebase.auth().currentUser;
        if (!user) {
          console.error('❌ Not logged in');
          return;
        }
        
        const token = await user.getIdToken();
        
        // First, get all users to find their UIDs
        const listResponse = await fetch('https://listusershttp-pfzgkokola-ew.a.run.app', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${token}\`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!listResponse.ok) {
          throw new Error('Failed to list users');
        }
        
        const userData = await listResponse.json();
        const allUsers = userData.users || [];
        
        // Make each user admin
        for (const email of usersToMakeAdmin) {
          const targetUser = allUsers.find(u => u.email === email);
          if (!targetUser) {
            console.warn(\`⚠️ User not found: \${email}\`);
            continue;
          }
          
          if (targetUser.customClaims?.admin) {
            console.log(\`✅ \${email} is already an admin\`);
            continue;
          }
          
          console.log(\`🔄 Making \${email} an admin...\`);
          
          const updateResponse = await fetch('https://updateuserhttp-pfzgkokola-ew.a.run.app', {
            method: 'POST',
            headers: {
              'Authorization': \`Bearer \${token}\`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              uid: targetUser.uid,
              customClaims: { 
                ...targetUser.customClaims,
                admin: true 
              }
            })
          });
          
          if (updateResponse.ok) {
            console.log(\`✅ Successfully made \${email} an admin\`);
          } else {
            console.error(\`❌ Failed to make \${email} an admin\`);
          }
        }
        
        console.log('🎉 Admin setup complete!');
        
      } catch (error) {
        console.error('❌ Error:', error);
      }
    }
    
    // Run the function
    makeUsersAdmin();
  `;
  
  console.log('\n📋 Copy and paste this script into your browser console while logged in as an admin:\n');
  console.log(script);
  console.log('\n🌐 Navigate to the admin page and open browser developer tools (F12), then paste the script into the console.');
}

makeUsersAdmin();