const DEFAULT_PROMPT = `Extract and present all information from the video without omitting any detail. Follow these instructions:

1. Go through the entire video thoroughly.
2. Capture and present everything spoken, including definitions, explanations, examples, references, and any background context.
3. Include any on-screen text, slides, charts, or visual elements — describe them clearly if relevant to understanding.
4. Maintain full detail; do not condense or summarize during the main extraction.
5. Organize the output into logical sections based on the flow of the video.
6. Translate any non-English words or phrases if they appear.
7. At the end, write a concise summary (up to 200 words) covering the core message and major takeaways.

Output format:


Title: <Insert video title here if available>

=== Summary ===
<200-word summary of the full video>

===============
Introduction
- ...

Section 1: <Descriptive title>
- ...

Section 2: <Descriptive title>
- ...

...

Conclusion
- ...
`;

async function getPromptText() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['customPrompt'], (result) => {
      resolve(result.customPrompt || DEFAULT_PROMPT);
    });
  });
}

async function processAndPasteInGemini(urlToProcess) {
  if (!urlToProcess) {
    console.error("Gemini Summarize Extension: No URL provided for processing.");
    return;
  }

  const promptText = await getPromptText();
  const textToPaste = `${urlToProcess}\n\n${promptText}`;

  chrome.tabs.create({ url: "https://gemini.google.com/app" }, (newTab) => {
    if (!newTab || !newTab.id) {
      console.error("Gemini Summarize Extension: Failed to create new Gemini tab or get its ID.");
      return;
    }

    function tabUpdateListener(tabId, changeInfo, tab) {
      if (tabId === newTab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(tabUpdateListener);

        setTimeout(() => {
          chrome.scripting.executeScript({
            target: { tabId: newTab.id },
            files: ['content.js']
          }, () => {
            chrome.tabs.sendMessage(newTab.id, {
              action: "pasteUrlToActiveElement",
              textToPaste: textToPaste
            }, (response) => {
              if (chrome.runtime.lastError) {
                // Tab may have navigated away or closed
                console.warn("Gemini Summarize Extension: Error sending message to Gemini tab:", chrome.runtime.lastError.message);
              } else if (response && response.success) {
                // Success
              } else {
                console.warn("Gemini Summarize Extension: Content script reported pasting was not successful or no suitable element found.", response ? response.reason : "No response details.");
              }
            });
          });
        }, 500);
      }
    }
    chrome.tabs.onUpdated.addListener(tabUpdateListener);
  });
}

// Listener for browser action (toolbar icon)
chrome.action.onClicked.addListener(async (tab) => {
  let currentTabUrl = tab && tab.url ? tab.url : null;
  if (!currentTabUrl) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        currentTabUrl = tabs[0].url;
      }
    });
  }

  // Only proceed if the URL is a YouTube video link
  const youtubePatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?/,
    /^https?:\/\/youtu\.be\//
  ];
  const isYoutube = youtubePatterns.some(pattern => pattern.test(currentTabUrl));
  if (!isYoutube) {
    console.warn("Gemini Summarize Extension: Current tab is not a YouTube video. Action aborted.");
    return;
  }

  processAndPasteInGemini(currentTabUrl);
});

// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarize-with-gemini",
    title: "Summarize with Gemini",
    contexts: ["link"],
    targetUrlPatterns: ["*://*.youtube.com/watch*", "*://youtu.be/*"]
  });
});

// Listener for context menu item click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarize-with-gemini" && info.linkUrl) {
    processAndPasteInGemini(info.linkUrl);
  }
});

// Add message listener for content script requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "processYouTubeLink" && message.url) {
    processAndPasteInGemini(message.url);
    sendResponse({ success: true });
  }
  return true;
});
