import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function testRegistration() {
  try {
    console.log('Testing registration endpoint...');
    
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        password: 'TestPassword123!'
      })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

async function testHealth() {
  try {
    console.log('Testing health endpoint...');
    
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    console.log('Health check status:', response.status);
    console.log('Health data:', data);
    
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
}

// Run tests
testHealth();
setTimeout(() => testRegistration(), 1000);