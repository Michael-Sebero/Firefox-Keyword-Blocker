document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('keywords');
  const applyButton = document.getElementById('apply');
  const statusDiv = document.getElementById('status');
  const enableToggle = document.getElementById('enableBlocker');
  const toggleStatus = document.getElementById('toggle-status');

  function updateStatus(message) {
    statusDiv.textContent = message;
    console.log(message);
  }

  // Load existing keywords and enabled state
  browser.storage.local.get(["keywords", "enabled"], (data) => {
    updateStatus("Loading settings...");
    
    // Load keywords
    const keywords = data.keywords || [];
    textarea.value = keywords.join(', ');
    
    // Load enabled state (default to true if not set)
    const enabled = data.enabled !== undefined ? data.enabled : true;
    enableToggle.checked = enabled;
    toggleStatus.textContent = enabled ? "Enabled" : "Disabled";
    
    updateStatus(`Loaded ${keywords.length} keywords. Blocker is ${enabled ? "enabled" : "disabled"}.`);
  });

  // Toggle blocker enabled/disabled
  enableToggle.addEventListener('change', () => {
    const enabled = enableToggle.checked;
    toggleStatus.textContent = enabled ? "Enabled" : "Disabled";
    
    browser.storage.local.set({ enabled: enabled }, () => {
      if (browser.runtime.lastError) {
        updateStatus(`Error saving state: ${browser.runtime.lastError.message}`);
      } else {
        browser.runtime.sendMessage({ action: "toggleBlocker", enabled: enabled })
          .then(() => {
            updateStatus(`Blocker is now ${enabled ? "enabled" : "disabled"}`);
          })
          .catch(error => {
            updateStatus(`State saved but error notifying tabs: ${error}`);
          });
      }
    });
  });

  // Save keywords when Apply is clicked
  applyButton.addEventListener('click', () => {
    // Split by commas, trim whitespace, and filter out empty entries
    const keywordsInput = textarea.value;
    const keywords = keywordsInput
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    // Validate keywords
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
