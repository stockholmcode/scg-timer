chrome.runtime.onInstalled.addListener(function() {
  chrome.action.disable();

  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostEquals: 'my.kleer.se' }
        })
      ],
      actions: [new chrome.declarativeContent.ShowAction()]
    }]);
  });
});

chrome.runtime.onMessage.addListener(function(msg) {
  if (msg.action === 'openPopup') {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 700,
      height: 520
    });
  }
});
