document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('keywords');
  const applyButton = document.getElementById('apply');
  const statusDiv = document.getElementById('status');

  function updateStatus(message) {
    statusDiv.textContent = message;
    console.log(message);
  }

  // Load existing keywords
  browser.storage.local.get("keywords", (data) => {
    updateStatus("Loading keywords...");
    const keywords = data.keywords || [];
    textarea.value = keywords.join(', ');
    updateStatus(`Loaded ${keywords.length} keywords: ${keywords.join(', ')}`);
  });

  // Save keywords when Apply is clicked
  applyButton.addEventListener('click', () => {
    // Split by commas, trim whitespace, and filter out empty entries
    const keywordsInput = textarea.value;
    const keywords = keywordsInput
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    // Validate keywords (optional word validation could be added here)
    if (keywords.length === 0 && keywordsInput.length > 0) {
      updateStatus("Warning: No valid keywords found. Make sure they're comma-separated.");
      return;
    }
    
    updateStatus("Saving keywords...");
    browser.storage.local.set({ keywords: keywords }, () => {
      if (browser.runtime.lastError) {
        updateStatus(`Error saving keywords: ${browser.runtime.lastError.message}`);
      } else {
        browser.runtime.sendMessage({ action: "keywordsUpdated", keywords: keywords })
          .then(() => {
            updateStatus(`Saved ${keywords.length} keywords: ${keywords.join(', ')}`);
          })
          .catch(error => {
            updateStatus(`Keywords saved but error notifying tabs: ${error}`);
          });
      }
    });
  });
});
