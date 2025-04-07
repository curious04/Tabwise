// Track tab activity
const tabActivity = new Map();

chrome.tabs.onActivated.addListener(({ tabId }) => {
    tabActivity.set(tabId, Date.now());
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        tabActivity.set(tabId, Date.now());
    }
});

// Auto-hibernate tabs that haven't been used for 2 hours
setInterval(async () => {
    const tabs = await chrome.tabs.query({});
    const now = Date.now();

    tabs.forEach(tab => {
        const lastAccess = tabActivity.get(tab.id) || now;
        if (!tab.active && (now - lastAccess > 2 * 60 * 60 * 1000)) {
            chrome.tabs.discard(tab.id);
        }
    });
}, 30 * 60 * 1000); // Check every 30 minutes 