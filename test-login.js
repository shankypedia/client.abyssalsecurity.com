import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function testLogin() {
  try {
    console.log('Testing login endpoint...');
    
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        login: 'test@example.com',
        password: 'TestPassword123!'
      })
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Login successful:', data);
    } else {
      const error = await response.text();
      console.log('Login failed:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testLogin();