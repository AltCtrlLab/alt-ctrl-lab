export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/products/support-bot/widget?clientId=xxx
 * Returns embeddable JavaScript widget that clients add to their site.
 *
 * Usage on client site:
 * <script src="https://alt-ctrl-lab-production.up.railway.app/api/products/support-bot/widget?clientId=CLIENT_ID"></script>
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');

  if (!clientId) {
    return new NextResponse('// Error: Missing clientId parameter', {
      headers: { 'Content-Type': 'application/javascript' },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3000');

  const widgetJs = `
(function() {
  var CLIENT_ID = ${JSON.stringify(clientId)};
  var API_BASE = ${JSON.stringify(baseUrl)};
  var sessionId = null;
  var history = [];
  var config = null;

  // Fetch config
  fetch(API_BASE + '/api/products/support-bot?clientId=' + CLIENT_ID)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.success) {
        config = res.data;
        injectWidget();
      }
    })
    .catch(function() {
      config = { bot_name: 'Assistant', welcome_message: 'Bonjour !', primary_color: '#6366f1' };
      injectWidget();
    });

  function injectWidget() {
    // Styles
    var style = document.createElement('style');
    style.textContent = [
      '#altctrl-bot-btn { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 99999; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; background: ' + config.primary_color + '; }',
      '#altctrl-bot-btn:hover { transform: scale(1.1); }',
      '#altctrl-bot-btn svg { width: 28px; height: 28px; fill: white; }',
      '#altctrl-bot-panel { position: fixed; bottom: 90px; right: 24px; width: 380px; max-height: 520px; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); z-index: 99999; display: none; flex-direction: column; background: #1a1a2e; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow: hidden; }',
      '#altctrl-bot-panel.open { display: flex; }',
      '#altctrl-bot-header { padding: 16px; background: ' + config.primary_color + '; color: white; font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px; }',
      '#altctrl-bot-header .dot { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; }',
      '#altctrl-bot-msgs { flex: 1; overflow-y: auto; padding: 16px; max-height: 340px; }',
      '.altctrl-msg { margin-bottom: 12px; max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }',
      '.altctrl-msg.bot { background: #2a2a4a; border-bottom-left-radius: 4px; }',
      '.altctrl-msg.user { background: ' + config.primary_color + '33; margin-left: auto; border-bottom-right-radius: 4px; text-align: right; }',
      '.altctrl-msg.typing { opacity: 0.7; }',
      '#altctrl-bot-input { display: flex; border-top: 1px solid #333; padding: 12px; gap: 8px; }',
      '#altctrl-bot-input input { flex: 1; background: #2a2a4a; border: 1px solid #444; border-radius: 8px; padding: 10px 12px; color: white; font-size: 14px; outline: none; }',
      '#altctrl-bot-input input:focus { border-color: ' + config.primary_color + '; }',
      '#altctrl-bot-input button { background: ' + config.primary_color + '; border: none; border-radius: 8px; padding: 10px 16px; color: white; cursor: pointer; font-size: 14px; }',
      '#altctrl-bot-input button:disabled { opacity: 0.5; cursor: not-allowed; }',
      '@media (max-width: 480px) { #altctrl-bot-panel { width: calc(100vw - 32px); right: 16px; bottom: 80px; } }',
    ].join('\\n');
    document.head.appendChild(style);

    // Button
    var btn = document.createElement('button');
    btn.id = 'altctrl-bot-btn';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
    btn.onclick = togglePanel;
    document.body.appendChild(btn);

    // Panel
    var panel = document.createElement('div');
    panel.id = 'altctrl-bot-panel';
    panel.innerHTML = [
      '<div id="altctrl-bot-header"><span class="dot"></span>' + (config.bot_name || 'Assistant') + '</div>',
      '<div id="altctrl-bot-msgs"></div>',
      '<div id="altctrl-bot-input"><input type="text" placeholder="Votre question..." /><button>Envoyer</button></div>',
    ].join('');
    document.body.appendChild(panel);

    // Add welcome message
    addMessage('bot', config.welcome_message || 'Bonjour ! Comment puis-je vous aider ?');

    // Event listeners
    var input = panel.querySelector('input');
    var sendBtn = panel.querySelector('#altctrl-bot-input button');
    sendBtn.onclick = function() { sendMessage(input); };
    input.onkeydown = function(e) { if (e.key === 'Enter') sendMessage(input); };
  }

  function togglePanel() {
    var panel = document.getElementById('altctrl-bot-panel');
    panel.classList.toggle('open');
  }

  function addMessage(role, text) {
    var msgs = document.getElementById('altctrl-bot-msgs');
    var div = document.createElement('div');
    div.className = 'altctrl-msg ' + role;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function sendMessage(input) {
    var q = input.value.trim();
    if (!q) return;
    input.value = '';

    addMessage('user', q);
    var typing = addMessage('bot', '...');
    typing.classList.add('typing');

    var sendBtn = document.querySelector('#altctrl-bot-input button');
    sendBtn.disabled = true;

    fetch(API_BASE + '/api/products/support-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        question: q,
        sessionId: sessionId,
        history: history.slice(-6),
      }),
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      typing.remove();
      if (res.success && res.data) {
        sessionId = res.data.sessionId;
        addMessage('bot', res.data.answer);
        history.push({ role: 'user', content: q });
        history.push({ role: 'assistant', content: res.data.answer });
      } else {
        addMessage('bot', 'Désolé, une erreur est survenue.');
      }
    })
    .catch(function() {
      typing.remove();
      addMessage('bot', 'Erreur de connexion.');
    })
    .finally(function() {
      sendBtn.disabled = false;
    });
  }
})();
`;

  return new NextResponse(widgetJs, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
