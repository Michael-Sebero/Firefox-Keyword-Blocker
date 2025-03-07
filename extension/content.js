let keywords = [];
let blockerEnabled = true; // Default to enabled

function hideElements() {
  if (!blockerEnabled) {
    console.log("Blocker is disabled. Not hiding elements.");
    return;
  }
  
  console.log("Hiding elements. Current keywords:", keywords);
  const elements = document.body.getElementsByTagName('*');
  let hiddenCount = 0;

  for (let element of elements) {
    if (shouldHideElement(element)) {
      hideElementAndItsContent(element);
      hiddenCount++;
    }
  }

  console.log(`Hidden ${hiddenCount} elements`);
}

function showAllElements() {
  // Find all hidden elements by this extension and unhide them
  // We'll use a specific attribute to mark hidden elements
  const hiddenElements = document.querySelectorAll('[data-keyword-blocker-hidden="true"]');
  console.log(`Unhiding ${hiddenElements.length} elements`);
  
  hiddenElements.forEach(element => {
    element.style.display = '';
    element.removeAttribute('data-keyword-blocker-hidden');
  });
}

function shouldHideElement(element) {
  const text = element.textContent.toLowerCase();
  return keywords.some(keyword => {
    // Match whole words only
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`);
    return regex.test(text);
  }) && (element.childElementCount === 0 || 
        element.classList.contains('post') || 
        element.classList.contains('thread'));
}

function findAssociatedMedia(element) {
  // First check inside the element
  let media = element.querySelector('img, video, audio');
  
  if (!media) {
    // Check siblings
    if (element.parentElement) {
      const siblings = [...element.parentElement.children];
      const elementIndex = siblings.indexOf(element);
      
      // Check siblings within a reasonable range (previous and next)
      const relevantSiblings = siblings.slice(
        Math.max(0, elementIndex - 2), 
        Math.min(siblings.length, elementIndex + 3)
      );
      
      media = relevantSiblings.find(sibling => 
        sibling !== element && 
        (sibling.tagName.toLowerCase() === 'img' || 
         sibling.tagName.toLowerCase() === 'video' ||
         sibling.tagName.toLowerCase() === 'audio' ||
         sibling.querySelector('img, video, audio'))
      );
    }
  }
  
  return media;
}

function hideElementAndItsContent(element) {
  // Find closest meaningful container but don't go too high in the DOM
  let container = element.closest('article, .post, .comment, .thread, .content-item');
  
  // If no specific container found, limit to nearby parent to avoid hiding too much
  if (!container) {
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      if (parent.children.length > 1) {
        container = parent;
        break;
      }
      parent = parent.parentElement;
      depth++;
    }
  }
  
  // Don't hide the body or other critical elements
  if (container && container !== document.body && 
      !container.tagName.match(/^(HTML|BODY|HEAD|HEADER|NAV|FOOTER)$/i)) {
    container.style.display = 'none';
    container.setAttribute('data-keyword-blocker-hidden', 'true');
  } else {
    element.style.display = 'none';
    element.setAttribute('data-keyword-blocker-hidden', 'true');
  }
  
  // Find and hide associated media
  const media = findAssociatedMedia(container || element);
  if (media) {
    media.style.display = 'none';
    media.setAttribute('data-keyword-blocker-hidden', 'true');
  }

  // Try to find and hide associated description
  let nextSibling = container ? container.nextElementSibling : element.nextElementSibling;
  if (nextSibling && nextSibling.tagName.toLowerCase() === 'p') {
    nextSibling.style.display = 'none';
    nextSibling.setAttribute('data-keyword-blocker-hidden', 'true');
  }
}

function toggleBlocker(enabled) {
  console.log(`Toggling blocker: ${enabled ? "enabled" : "disabled"}`);
  blockerEnabled = enabled;
  
  if (enabled) {
    // Re-apply hiding
    hideElements();
  } else {
    // Show all hidden elements
    showAllElements();
  }
}

function updateKeywords(newKeywords) {
  console.log("Updating keywords:", newKeywords);
  keywords = newKeywords;
  
  // If the blocker is enabled, re-apply hiding
  if (blockerEnabled) {
    // First unhide everything
    showAllElements();
    // Then apply with new keywords
    hideElements();
  }
}

// Initialize settings
function initialize(settings) {
  console.log("Initializing with settings:", settings);
  keywords = settings.keywords || [];
  blockerEnabled = settings.enabled !== undefined ? settings.enabled : true;
  
  if (blockerEnabled) {
    hideElements();
  }
}

// Load initial settings
browser.storage.local.get(["keywords", "enabled"], (data) => {
  console.log("Initial settings load:", data);
  initialize({
    keywords: data.keywords || [],
    enabled: data.enabled !== undefined ? data.enabled : true
  });
});

// Listen for messages
browser.runtime.onMessage.addListener((message) => {
  console.log("Received message:", message);
  
  if (message.action === "updateKeywords") {
    updateKeywords(message.keywords);
  }
  
  if (message.action === "toggleBlocker") {
    toggleBlocker(message.enabled);
  }
  
  if (message.action === "initialize") {
    initialize({
      keywords: message.keywords,
      enabled: message.enabled
    });
  }
});

// Run hideElements when the page loads and whenever it's updated
window.addEventListener('load', () => {
  if (blockerEnabled) {
    hideElements();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if (blockerEnabled) {
    hideElements();
  }
});

// Use a MutationObserver to watch for DOM changes
const observer = new MutationObserver((mutations) => {
  if (!blockerEnabled) return;
  
  // Only process nodes that were added
  let elementsToCheck = [];
  
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          elementsToCheck.push(node);
          // Also get all child elements
          const children = node.getElementsByTagName('*');
          for (const child of children) {
            elementsToCheck.push(child);
          }
        }
      });
    }
  }
  
  // Now check collected elements
  let hiddenCount = 0;
  for (const element of elementsToCheck) {
    if (shouldHideElement(element)) {
      hideElementAndItsContent(element);
      hiddenCount++;
    }
  }
  
  if (hiddenCount > 0) {
    console.log(`Hidden ${hiddenCount} elements from mutation`);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

console.log("Content script loaded and running");
