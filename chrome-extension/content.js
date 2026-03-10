function injectButton() {
  if (document.getElementById('scg-sync-btn')) return;
  var btn = document.createElement('button');
  btn.id = 'scg-sync-btn';
  btn.textContent = 'SCG Sync';
  btn.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
  document.body.appendChild(btn);
}

injectButton();

new MutationObserver(function() {
  if (!document.getElementById('scg-sync-btn')) injectButton();
}).observe(document.body, { childList: true, subtree: true });
