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
  return true; // Important for async response
});

// Apply keywords to new tabs
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log("New tab completed loading. Sending keywords.");
    browser.storage.local.get("keywords", (data) => {
      browser.tabs.sendMessage(tabId, { action: "updateKeywords", keywords: data.keywords || [] })
        .catch(error => {
          // Likely the content script isn't ready yet, which is fine
          console.log("Note: Could not send keywords to tab yet:", tabId);
        });
    });
  }
});
