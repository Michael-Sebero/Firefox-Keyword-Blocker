console.log("Background script loaded");

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message);
  
  if (message.action === "keywordsUpdated") {
    browser.tabs.query({active: true}, (tabs) => {
      tabs.forEach((tab) => {
        console.log("Sending updateKeywords message to tab:", tab.id);
        browser.tabs.sendMessage(tab.id, { action: "updateKeywords", keywords: message.keywords })
          .catch(error => console.log("Error sending message to tab:", tab.id, error));
      });
    });
  }
  
  if (message.action === "toggleBlocker") {
    browser.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        console.log("Sending toggleBlocker message to tab:", tab.id);
        browser.tabs.sendMessage(tab.id, { action: "toggleBlocker", enabled: message.enabled })
          .catch(error => console.log("Error sending message to tab:", tab.id, error));
      });
    });
  }
  
  return true; // Important for async response
});

// Apply settings to new tabs
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log("New tab completed loading. Sending settings.");
    browser.storage.local.get(["keywords", "enabled"], (data) => {
      // Send both keywords and enabled state
      browser.tabs.sendMessage(tabId, { 
        action: "initialize", 
        keywords: data.keywords || [],
        enabled: data.enabled !== undefined ? data.enabled : true
      }).catch(error => {
        // Likely the content script isn't ready yet, which is fine
        console.log("Note: Could not send settings to tab yet:", tabId);
      });
    });
  }
});
