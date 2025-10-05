const fetch = require('node-fetch');

async function testApi() {
  const baseUrl = 'http://localhost:4000';

  // Create game
  let response = await fetch(\`\${baseUrl}/game/create\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameCode: '1234',
      gameMode: 'NORMAL',
      host: { id: 'host1', name: 'Host Player', score: 0, isReady: false, isConnected: true }
    })
  });
  console.log('Create game status:', response.status);

  // Join game
  response = await fetch(\`\${baseUrl}/game/join\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameCode: '1234',
      player: { id: 'player2', name: 'Player 2', score: 0, isReady: false, isConnected: true }
    })
  });
  console.log('Join game status:', response.status);

  // Get game state
  response = await fetch(\`\${baseUrl}/game/1234\`);
  const gameState = await response.json();
  console.log('Game state:', gameState);
}

testApi().catch(console.error);
