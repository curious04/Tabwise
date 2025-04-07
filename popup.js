document.addEventListener('DOMContentLoaded', () => {
    // Initialize the popup
    initializePopup();

    // Add event listeners
    document.getElementById('searchTabs').addEventListener('input', handleSearch);
    document.getElementById('groupTabs').addEventListener('click', handleGroupTabs);
    document.getElementById('hibernateInactive').addEventListener('click', handleHibernate);
});

async function initializePopup() {
    const tabs = await chrome.tabs.query({});
    updateTabStats(tabs);
    renderTabs(tabs);
}

function updateTabStats(tabs) {
    document.getElementById('tabCount').textContent = tabs.length;
    // Estimate memory savings (rough estimate)
    const estimatedSavings = Math.round(localStorage.getItem('memorySaved') || 0);
    document.getElementById('memorySaved').textContent = `${estimatedSavings} MB`;
}

function renderTabs(tabs) {
    const tabList = document.getElementById('tabList');
    tabList.innerHTML = '';

    tabs.forEach(tab => {
        const tabElement = createTabElement(tab);
        tabList.appendChild(tabElement);
    });
}

function createTabElement(tab) {
    const div = document.createElement('div');
    div.className = 'tab-item';
    div.innerHTML = `
    <img class="tab-favicon" src="${tab.favIconUrl || 'icon16.png'}" alt="">
    <span class="tab-title">${tab.title}</span>
    <span class="tab-close">×</span>
  `;

    div.querySelector('.tab-title').addEventListener('click', () => {
        chrome.tabs.update(tab.id, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
    });

    div.querySelector('.tab-close').addEventListener('click', (e) => {
        e.stopPropagation();
        chrome.tabs.remove(tab.id);
        div.remove();
        updateTabStats(document.querySelectorAll('.tab-item').length);
    });

    return div;
}

async function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const tabs = await chrome.tabs.query({});
    const filteredTabs = tabs.filter(tab =>
        tab.title.toLowerCase().includes(query) ||
        tab.url.toLowerCase().includes(query)
    );
    renderTabs(filteredTabs);
}

async function handleGroupTabs() {
    const tabs = await chrome.tabs.query({});
    const groups = groupTabsByDomain(tabs);

    for (const [domain, domainTabs] of Object.entries(groups)) {
        if (domainTabs.length > 1) {
            const tabIds = domainTabs.map(tab => tab.id);
            chrome.tabs.group({ tabIds }, (groupId) => {
                chrome.tabGroups.update(groupId, {
                    title: domain,
                    color: getRandomColor()
                });
            });
        }
    }
}

function groupTabsByDomain(tabs) {
    const groups = {};
    tabs.forEach(tab => {
        const url = new URL(tab.url);
        const domain = url.hostname;
        if (!groups[domain]) {
            groups[domain] = [];
        }
        groups[domain].push(tab);
    });
    return groups;
}

function getRandomColor() {
    const colors = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
    return colors[Math.floor(Math.random() * colors.length)];
}

async function handleHibernate() {
    const tabs = await chrome.tabs.query({});
    const inactiveTabs = tabs.filter(tab => !tab.active);

    let memorySaved = parseInt(localStorage.getItem('memorySaved') || '0');

    inactiveTabs.forEach(tab => {
        // Estimate 50MB per tab (rough estimate)
        memorySaved += 50;
        chrome.tabs.discard(tab.id);
    });

    localStorage.setItem('memorySaved', memorySaved.toString());
    updateTabStats(tabs);
} 