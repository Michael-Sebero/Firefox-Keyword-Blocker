let keywords = [];

function hideElements() {
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
  } else {
    element.style.display = 'none';
  }
  
  // Find and hide associated media
  const media = findAssociatedMedia(container || element);
  if (media) {
    media.style.display = 'none';
  }

  // Try to find and hide associated description
  let nextSibling = container ? container.nextElementSibling : element.nextElementSibling;
  if (nextSibling && nextSibling.tagName.toLowerCase() === 'p') {
    nextSibling.style.display = 'none';
  }
}

function updateKeywords(newKeywords) {
  console.log("Updating keywords:", newKeywords);
  keywords = newKeywords;
  hideElements();
}

// Load initial keywords
browser.storage.local.get("keywords", (data) => {
  console.log("Initial keywords load:", data.keywords);
  updateKeywords(data.keywords || []);
});

// Listen for keyword updates
browser.runtime.onMessage.addListener((message) => {
  console.log("Received message:", message);
  if (message.action === "updateKeywords") {
    updateKeywords(message.keywords);
  }
});

// Run hideElements when the page loads and whenever it's updated
window.addEventListener('load', hideElements);
document.addEventListener('DOMContentLoaded', hideElements);

// Use a MutationObserver to watch for DOM changes
const observer = new MutationObserver((mutations) => {
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
