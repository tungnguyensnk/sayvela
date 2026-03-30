// src/providers/gptfree.js

let cachedToken = null;
let tokenExpiresAt = 0;
let tokenPromise = null;

async function fetchToken() {
  try {
    // 1. Fetch main page to find script
    const htmlRes = await fetch('https://gptfree.com/en');
    const html = await htmlRes.text();

    // Find script src
    const scriptMatch = html.match(/<script[^>]*src="(\/assets\/index-[^"]+\.js)"/);
    if (!scriptMatch) throw new Error("Could not find script URL in HTML");
    const scriptUrl = scriptMatch[1];

    // 2. Fetch script to find apiKey
    const scriptRes = await fetch(`https://gptfree.com${scriptUrl}`);
    const scriptContent = await scriptRes.text();

    const apiKeyMatch = scriptContent.match(/apiKey:"([^"]+)"/);
    if (!apiKeyMatch) throw new Error("Could not find apiKey in script");
    const apiKey = apiKeyMatch[1];

    // 3. Firebase anonymous auth
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    });
    const authData = await authRes.json();
    
    if (!authRes.ok) throw new Error(`Firebase auth failed: ${authData.error?.message || 'Unknown error'}`);

    return {
      idToken: authData.idToken,
      expiresIn: parseInt(authData.expiresIn, 10) || 3600
    };
  } catch (err) {
    console.error("gptfree fetchToken error:", err);
    throw err;
  }
}

export async function getValidToken() {
  const now = Date.now() / 1000;
  // Refresh if token is missing or expires in less than 5 minutes
  if (cachedToken && tokenExpiresAt > now + 300) {
    return cachedToken;
  }

  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = fetchToken().then(data => {
    cachedToken = data.idToken;
    // Set to expire in 30 minutes (1800s) as requested, or the actual token expiration if it's shorter
    const lifetime = Math.min(data.expiresIn, 1800);
    tokenExpiresAt = (Date.now() / 1000) + lifetime;
    tokenPromise = null;
    return cachedToken;
  }).catch(err => {
    tokenPromise = null;
    throw err;
  });

  return tokenPromise;
}

export async function sendStreamMessage(message, history = [], onEvent) {
  const token = await getValidToken();

  const res = await fetch('https://us-central1-gptfree-2.cloudfunctions.net/agent_stream', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      images: [],
      history
    })
  });

  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep the last incomplete line

    let currentEvent = null;

    for (const line of lines) {
      if (line.trim() === '') continue;
      
      if (line.startsWith('event:')) {
        currentEvent = line.replace('event:', '').trim();
      } else if (line.startsWith('data:')) {
        const dataStr = line.replace('data:', '').trim();
        if (!dataStr) continue;
        
        try {
          const data = JSON.parse(dataStr);
          if (onEvent) {
            onEvent({ event: currentEvent, data });
          }
        } catch (e) {
          // If JSON parse fails, it might be incomplete or just keepalive {}
        }
      }
    }
  }
}
