const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login with admin credentials...');
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'np03cs4a230143@heraldcollege.edu.np',
      password: 'password'
    });
    
    console.log('✅ Login successful!');
    console.log('Token:', response.data.token);
    console.log('User:', response.data.user);
  } catch (error) {
    console.error('❌ Login failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin();
