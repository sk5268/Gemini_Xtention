// Add click event listener for spacebar + click functionality
document.addEventListener('click', function(event) {
  // Check if spacebar was held during click (keyCode 32 or key ' ')
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
    // Don't interfere with other modifier key combinations
    return;
  }

  // Check if the clicked element is a link or has a link parent
  let linkElement = event.target;
  while (linkElement && linkElement.tagName !== 'A') {
    linkElement = linkElement.parentElement;
  }

  if (!linkElement || !linkElement.href) {
    return;
  }

  // Check if it's a YouTube link
  const youtubePatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?/, // youtube.com/watch
    /^https?:\/\/youtu\.be\//                     // youtu.be short links
  ];
  const isYoutube = youtubePatterns.some(pattern => pattern.test(linkElement.href));

  if (!isYoutube) {
    return;
  }

  // Check if spacebar is currently pressed
  // We'll use a keydown/keyup tracking approach
  if (window.spacebarPressed) {
    event.preventDefault();
    event.stopPropagation();
    
    // Send message to background script to process the YouTube link
    chrome.runtime.sendMessage({
      action: "processYouTubeLink",
      url: linkElement.href
    });
  }
}, true);

// Track spacebar state
window.spacebarPressed = false;

document.addEventListener('keydown', function(event) {
  if (event.code === 'Space' || event.keyCode === 32) {
    window.spacebarPressed = true;
  }
});

document.addEventListener('keyup', function(event) {
  if (event.code === 'Space' || event.keyCode === 32) {
    window.spacebarPressed = false;
  }
});

// Reset spacebar state when window loses focus
window.addEventListener('blur', function() {
  window.spacebarPressed = false;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "pasteUrlToActiveElement" && message.textToPaste) {
    const activeElement = document.activeElement;
    let pasted = false;

    if (activeElement) {
      const tagName = activeElement.tagName.toLowerCase();
      const isInput = tagName === 'input';
      const isTextArea = tagName === 'textarea';
      const isContentEditable = activeElement.isContentEditable;

      if (isTextArea || (isInput && (activeElement.type === 'text' || activeElement.type === 'search' || activeElement.type === 'url' || !activeElement.type))) {
        activeElement.value = message.textToPaste;
        pasted = true;
      } else if (isContentEditable) {
        activeElement.textContent = message.textToPaste;
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(activeElement);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e) {
          // Ignore errors during selection manipulation
        }
        pasted = true;
      }

      if (pasted) {
        activeElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        activeElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        activeElement.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));

        sendResponse({ success: true });
        return true;
      }
    }

    sendResponse({ success: false, reason: "No suitable focused textarea, input, or contentEditable element found." });
    return true;
  }
  return false;
});
