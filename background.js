chrome.commands.onCommand.addListener((command) => {
  if (command === "manual-capture") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "MANUAL_CAPTURE" });
      }
    });
  }
});
