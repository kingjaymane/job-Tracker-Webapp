// Simple test script to debug the recategorization API
// Run this with: node test-recategorize.js

const testUserId = 'test-user-id';

async function testRecategorizeAPI() {
  try {
    console.log('Testing recategorization API...');
    
    // Test the GET endpoint
    const response = await fetch(`http://localhost:3000/api/jobs/recategorize?userId=${testUserId}`, {
      method: 'GET',
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    const data = await response.text();
    console.log('Response body:', data);

    if (response.ok) {
      try {
        const jsonData = JSON.parse(data);
        console.log('Parsed JSON:', jsonData);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
      }
    }

  } catch (error) {
    console.error('Error testing API:', error);
  }
}

// Only run if this is the main module
if (typeof window === 'undefined') {
  testRecategorizeAPI();
}
