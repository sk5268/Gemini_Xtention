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
