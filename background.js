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
      console.error("Gemini URL Paster: Could not get current tab URL.");
      return;
    }
  } catch (error) {
    console.error("Gemini URL Paster: Error getting current tab URL:", error);
    return;
  }

  // Hardcode the prompt
  const promptText = `**Extract and present all information from the video without omitting any detail. Follow these instructions:**

1. Go through the entire video thoroughly.
2. Capture and present **everything spoken**, including definitions, explanations, examples, references, and any background context.
3. Include **any on-screen text, slides, charts, or visual elements** — describe them clearly if relevant to understanding.
4. Maintain **full detail**; do **not** condense or summarize during the main extraction.
5. Organize the output into **logical sections** based on the flow of the video.
6. Translate any non-English words or phrases if they appear.
7. At the end, write a **concise summary (up to 200 words)** covering the core message and major takeaways.

**Output format:**

\`\`\`
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
\`\`\``;

  const textToPaste = `${currentTabUrl}\n\n${promptText}`;

  let newGeminiTab;
  try {
    newGeminiTab = await browser.tabs.create({ url: "https://gemini.google.com/app" });
  } catch (error) {
    console.error("Gemini URL Paster: Error opening new tab for Gemini:", error);
    return;
  }

  if (!newGeminiTab || !newGeminiTab.id) {
    console.error("Gemini URL Paster: Failed to create new Gemini tab or get its ID.");
    return;
  }

  const tabUpdateListener = async (tabId, changeInfo, tab) => {
    if (tabId === newGeminiTab.id && changeInfo.status === 'complete') {
      // Important: Remove listener to prevent multiple executions if the tab reloads or updates further.
      browser.tabs.onUpdated.removeListener(tabUpdateListener);

      // Add a delay before attempting to paste
      setTimeout(async () => {
        try {
          // Ensure content.js is loaded before sending a message
          // Changed for Manifest V2 compatibility
          await browser.tabs.executeScript(newGeminiTab.id, {
            file: 'content.js'
          });

          // Send the combined URL and prompt to the content script
          const response = await browser.tabs.sendMessage(newGeminiTab.id, {
            action: "pasteUrlToActiveElement",
            textToPaste: textToPaste // Changed from 'url' to 'textToPaste'
          });
          
          if (response && response.success) {
            console.log("Gemini URL Paster: Text pasted successfully into Gemini tab.");
          } else {
            console.warn("Gemini URL Paster: Content script reported pasting was not successful or no suitable element found.", response ? response.reason : "No response details.");
          }

        } catch (error) {
          // Check if the error is due to the tab being closed or navigated away before script execution/messaging
          if (error.message.includes("No tab with id") || error.message.includes("Receiving end does not exist")) {
            console.warn(`Gemini URL Paster: Gemini tab (ID: ${newGeminiTab.id}) was closed or navigated away before action could complete.`);
          } else {
            console.error(`Gemini URL Paster: Error injecting script or sending message to Gemini tab ${newGeminiTab.id}:`, error);
          }
        }
      }, 500); // 500 milliseconds delay
    }
  };

  browser.tabs.onUpdated.addListener(tabUpdateListener);
});
