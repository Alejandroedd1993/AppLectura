const testChatEndpoint = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/chat/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: 'deepseek',
        messages: [
          { role: 'system', content: 'Eres un tutor virtual.' },
          { role: 'user', content: 'Hola, ¿puedes ayudarme?' }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testChatEndpoint();
