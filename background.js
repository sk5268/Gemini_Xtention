const promptText = `Extract and present all information from the video without omitting any detail. Follow these instructions:

1. Go through the entire video thoroughly.
2. Capture and present everything spoken, including definitions, explanations, examples, references, and any background context.
3. Include any on-screen text, slides, charts, or visual elements — describe them clearly if relevant to understanding.
4. Maintain full detail; do not condense or summarize during the main extraction.
5. Organize the output into logical sections based on the flow of the video.
6. Translate any non-English words or phrases if they appear.
7. At the end, write a concise summary (up to 200 words) covering the core message and major takeaways.

Output format:


Title: <Insert video title here if available>

Introduction
- ...

Section 1: <Descriptive title>
- ...

Section 2: <Descriptive title>
- ...

...

Conclusion
- ...

=== Summary ===
<200-word summary of the full video>
`;

async function processAndPasteInGemini(urlToProcess) {
  if (!urlToProcess) {
    console.error("Gemini Summarize Extention: No URL provided for processing.");
    return;
  }

  const textToPaste = `${urlToProcess}\n\n${promptText}`;
  let newGeminiTab;

  try {
    newGeminiTab = await browser.tabs.create({ url: "https://gemini.google.com/app" });
  } catch (error) {
    console.error("Gemini Summarize Extention: Error opening new tab for Gemini:", error);
    return;
  }

  if (!newGeminiTab || !newGeminiTab.id) {
    console.error("Gemini Summarize Extention: Failed to create new Gemini tab or get its ID.");
    return;
  }

  const tabUpdateListener = async (tabId, changeInfo, tab) => {
    if (tabId === newGeminiTab.id && changeInfo.status === 'complete') {
      browser.tabs.onUpdated.removeListener(tabUpdateListener);

      setTimeout(async () => {
        try {
          await browser.tabs.executeScript(newGeminiTab.id, {
            file: 'content.js'
          });
          const response = await browser.tabs.sendMessage(newGeminiTab.id, {
            action: "pasteUrlToActiveElement",
            textToPaste: textToPaste
          });
          if (response && response.success) {
          } else {
            console.warn("Gemini Summarize Extention: Content script reported pasting was not successful or no suitable element found.", response ? response.reason : "No response details.");
          }
        } catch (error) {
          if (error.message.includes("No tab with id") || error.message.includes("Receiving end does not exist")) {
            console.warn(`Gemini Summarize Extention: Gemini tab (ID: ${newGeminiTab.id}) was closed or navigated away before action could complete.`);
          } else {
            console.error(`Gemini Summarize Extention: Error injecting script or sending message to Gemini tab ${newGeminiTab.id}:`, error);
          }
        }
      }, 500); // 500 milliseconds delay
    }
  };
  browser.tabs.onUpdated.addListener(tabUpdateListener);
}

// Listener for browser action (toolbar icon)
browser.browserAction.onClicked.addListener(async (initiatingTab) => {
  let currentTabUrl;
  try {
    // Get the URL from the tab where the action was clicked,
    // or fall back to the active tab in the current window.
    if (initiatingTab && initiatingTab.url) {
        currentTabUrl = initiatingTab.url;
    } else {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.url) {
            currentTabUrl = activeTab.url;
        }
    }

    if (!currentTabUrl) {
      console.error("Gemini Summarize Extention: Could not get current tab URL for browser action.");
      return;
    }
    // Call the function
    processAndPasteInGemini(currentTabUrl);
  } catch (error) {
    console.error("Gemini Summarize Extention: Error getting current tab URL for browser action:", error);
    return;
  }
});

// Create context menu item
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "summarize-with-gemini",
    title: "Summarize with Gemini",
    contexts: ["link"],
    targetUrlPatterns: ["*://*.youtube.com/watch*", "*://youtu.be/*"] // Only for YouTube links
  });
});

// Listener for context menu item click
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "summarize-with-gemini") {
    if (info.linkUrl) {
      processAndPasteInGemini(info.linkUrl);
    }
  }
});
