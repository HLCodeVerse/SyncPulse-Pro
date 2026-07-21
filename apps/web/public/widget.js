(function () {
  if (window.SyncPulseWidgetInitialized) return;
  window.SyncPulseWidgetInitialized = true;

  const currentScript = document.currentScript;
  const targetUrl = currentScript?.getAttribute('data-app-url') || 'https://syncpulse-pro.vercel.app';
  const position = currentScript?.getAttribute('data-position') || 'right';

  // Inject styles
  const style = document.createElement('style');
  style.innerHTML = `
    .syncpulse-widget-btn {
      position: fixed;
      bottom: 24px;
      ${position === 'left' ? 'left: 24px;' : 'right: 24px;'}
      width: 56px;
      height: 56px;
      border-radius: 28px;
      background: #3b82f6;
      box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.5);
      border: 2px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .syncpulse-widget-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 14px 30px -5px rgba(59, 130, 246, 0.7);
    }
    .syncpulse-widget-iframe {
      position: fixed;
      bottom: 92px;
      ${position === 'left' ? 'left: 24px;' : 'right: 24px;'}
      width: 400px;
      height: 620px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 120px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      z-index: 999998;
      display: none;
      background: #090a0f;
      overflow: hidden;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .syncpulse-widget-iframe.open {
      display: block;
      animation: syncpulsePop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes syncpulsePop {
      from { opacity: 0; transform: translateY(12px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);

  // Inject Iframe
  const iframe = document.createElement('iframe');
  iframe.className = 'syncpulse-widget-iframe';
  iframe.src = `${targetUrl}?embed=true`;
  iframe.allow = 'camera; microphone; display-capture; autoplay';
  document.body.appendChild(iframe);

  // Inject Floating Button
  const btn = document.createElement('button');
  btn.className = 'syncpulse-widget-btn';
  btn.title = 'Open Chat & Video Call';
  btn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  document.body.appendChild(btn);

  let isOpen = false;
  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframe.classList.add('open');
      btn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
    } else {
      iframe.classList.remove('open');
      btn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
    }
  });
})();
