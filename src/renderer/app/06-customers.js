// =============================================
// CUSTOMER DATABASE SECTION
// =============================================
const customerState = {
  customers: [],
  selectedCustomer: null,
  filter: 'all',
  searchTerm: '',
  emailHistory: []
};

// Customer Database elements
const customerList = document.getElementById('customer-list');
const customerSearchInput = document.getElementById('customer-search-input');
const customerDetailsContent = document.getElementById('customer-details-content');
const addCustomerBtn = document.getElementById('add-customer-btn');
const addCustomerModal = document.getElementById('add-customer-modal');
const closeCustomerModalBtn = document.getElementById('close-customer-modal');
const saveCustomerBtn = document.getElementById('save-customer-btn');
const cancelCustomerBtn = document.getElementById('cancel-customer-btn');
const emailToInput = document.getElementById('email-to');
const emailSubjectInput = document.getElementById('email-subject');
const emailBodyInput = document.getElementById('email-body');
const emailTemplateSelect = document.getElementById('email-template-select');
const sendEmailBtn = document.getElementById('send-email-btn');
const sendBulkEmailBtn = document.getElementById('send-bulk-email-btn');
const bulkEmailModal = document.getElementById('bulk-email-modal');
const closeBulkEmailModalBtn = document.getElementById('close-bulk-email-modal');
const confirmBulkEmailBtn = document.getElementById('confirm-bulk-email-btn');
const cancelBulkEmailBtn = document.getElementById('cancel-bulk-email-btn');

// Email templates
const emailTemplates = {
  welcome: {
    subject: 'Welcome to VINCE Beats! ',
    body: `Hey {name}!

Thanks for checking out my beats! I'm glad you found your way here.

I drop new beats regularly, so make sure to follow me on Instagram @prodvince to stay updated.

If you have any questions about leasing or exclusive rights, just hit me up!

Stay creative,
VINCE`
  },
  followup: {
    subject: 'Just checking in! ',
    body: `Hey {name}!

Hope you're doing well! Just wanted to check in and see if you found what you were looking for.

I've got some new beats that might interest you. Let me know if you need anything!

Best,
VINCE`
  },
  promo: {
    subject: ' Special Deal Just For You!',
    body: `Hey {name}!

I've got a special offer for you today!

Get 50% OFF on any beat lease when you use code: VINCE50

This offer expires soon, so don't miss out!

Check out my latest beats: [YOUR LINK HERE]

- VINCE`
  },
  custom: {
    subject: '',
    body: ''
  }
};

/**
 * Initialize customer database
 */
async function initCustomerDatabase() {
  setupCustomerEventListeners();
  await loadCustomers();
}

/**
 * Load customers from storage
 */
async function loadCustomers() {
  if (isElectron) {
    try {
      const data = await ipcRenderer.invoke('load-customers');
      if (data && data.customers) {
        customerState.customers = data.customers;
        customerState.emailHistory = data.emailHistory || [];
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      customerState.customers = [];
    }
  } else {
    // Browser fallback
    const saved = localStorage.getItem('customers');
    if (saved) {
      const data = JSON.parse(saved);
      customerState.customers = data.customers || [];
      customerState.emailHistory = data.emailHistory || [];
    }
  }
  renderCustomerList();
  updateCustomerStats();
  renderEmailHistory();
}

/**
 * Save customers to storage
 */
async function saveCustomers() {
  const data = {
    customers: customerState.customers,
    emailHistory: customerState.emailHistory
  };

  if (isElectron) {
    try {
      await ipcRenderer.invoke('save-customers', data);
    } catch (error) {
      console.error('Error saving customers:', error);
    }
  } else {
    localStorage.setItem('customers', JSON.stringify(data));
  }
}

/**
 * Setup event listeners for customer database
 */
function setupCustomerEventListeners() {
  // Search
  if (customerSearchInput) {
    customerSearchInput.addEventListener('input', (e) => {
      customerState.searchTerm = e.target.value.toLowerCase();
      renderCustomerList();
    });
  }

  // Filter buttons
  document.querySelectorAll('.customer-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.customer-filters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      customerState.filter = btn.dataset.filter;
      renderCustomerList();
    });
  });

  // Add customer button
  if (addCustomerBtn) {
    addCustomerBtn.addEventListener('click', openAddCustomerModal);
  }

  // Modal close buttons
  if (closeCustomerModalBtn) {
    closeCustomerModalBtn.addEventListener('click', closeAddCustomerModal);
  }
  if (cancelCustomerBtn) {
    cancelCustomerBtn.addEventListener('click', closeAddCustomerModal);
  }

  // Save customer
  if (saveCustomerBtn) {
    saveCustomerBtn.addEventListener('click', saveNewCustomer);
  }

  // Email template change
  if (emailTemplateSelect) {
    emailTemplateSelect.addEventListener('change', (e) => {
      const template = emailTemplates[e.target.value];
      if (template) {
        emailSubjectInput.value = template.subject;
        emailBodyInput.value = template.body;
      }
    });
  }

  // Variable buttons
  document.querySelectorAll('.var-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const variable = btn.dataset.var;
      if (emailBodyInput) {
        const start = emailBodyInput.selectionStart;
        const end = emailBodyInput.selectionEnd;
        const text = emailBodyInput.value;
        emailBodyInput.value = text.substring(0, start) + variable + text.substring(end);
        emailBodyInput.focus();
        emailBodyInput.setSelectionRange(start + variable.length, start + variable.length);
      }
    });
  });

  // Send email button
  if (sendEmailBtn) {
    sendEmailBtn.addEventListener('click', sendEmail);
  }

  // Bulk email
  if (sendBulkEmailBtn) {
    sendBulkEmailBtn.addEventListener('click', openBulkEmailModal);
  }
  if (closeBulkEmailModalBtn) {
    closeBulkEmailModalBtn.addEventListener('click', closeBulkEmailModal);
  }
  if (cancelBulkEmailBtn) {
    cancelBulkEmailBtn.addEventListener('click', closeBulkEmailModal);
  }
  if (confirmBulkEmailBtn) {
    confirmBulkEmailBtn.addEventListener('click', sendBulkEmails);
  }

  // Bulk recipient checkboxes
  document.querySelectorAll('.recipient-filters input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateBulkRecipientCount);
  });
}

/**
 * Render customer list
 */
function renderCustomerList() {
  if (!customerList) return;

  let filtered = customerState.customers;

  // Apply filter
  if (customerState.filter !== 'all') {
    filtered = filtered.filter(c => c.type === customerState.filter);
  }

  // Apply search
  if (customerState.searchTerm) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(customerState.searchTerm) ||
      c.email.toLowerCase().includes(customerState.searchTerm) ||
      (c.instagram && c.instagram.toLowerCase().includes(customerState.searchTerm))
    );
  }

  if (filtered.length === 0) {
    customerList.innerHTML = '<div class="empty-state">No customers found</div>';
    return;
  }

  customerList.innerHTML = filtered.map(customer => `
    <div class="customer-item ${customerState.selectedCustomer?.id === customer.id ? 'selected' : ''}"
         data-id="${customer.id}">
      <div class="customer-avatar">${customer.name.charAt(0).toUpperCase()}</div>
      <div class="customer-info">
        <div class="customer-name">${customer.name}</div>
        <div class="customer-email">${customer.email}</div>
      </div>
      <span class="customer-type-badge ${customer.type}">${customer.type}</span>
    </div>
  `).join('');

  // Add click handlers
  customerList.querySelectorAll('.customer-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      selectCustomer(id);
    });
  });
}

/**
 * Select a customer
 */
function selectCustomer(id) {
  const customer = customerState.customers.find(c => c.id === id);
  customerState.selectedCustomer = customer;
  renderCustomerList();
  renderCustomerDetails();

  // Update email panel
  if (customer && emailToInput) {
    emailToInput.value = customer.email;
    sendEmailBtn.disabled = false;
  }
}

/**
 * Render customer details
 */
function renderCustomerDetails() {
  if (!customerDetailsContent) return;

  const customer = customerState.selectedCustomer;

  if (!customer) {
    customerDetailsContent.innerHTML = `
      <div class="empty-state-large">
        <span class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
        <h3>Select a customer</h3>
        <p>Choose a customer from the list to view details and send emails</p>
      </div>
    `;
    return;
  }

  customerDetailsContent.innerHTML = `
    <div class="customer-detail-card">
      <div class="customer-detail-header">
        <div class="customer-detail-avatar">${customer.name.charAt(0).toUpperCase()}</div>
        <div class="customer-detail-info">
          <h2>${customer.name}</h2>
          <div class="customer-email">${customer.email}</div>
        </div>
        <div class="customer-detail-actions">
          <button class="btn-secondary btn-sm" onclick="editCustomer('${customer.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>
          <button class="btn-danger btn-sm" onclick="deleteCustomer('${customer.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg> Delete</button>
        </div>
      </div>

      <div class="customer-detail-grid">
        <div class="detail-item">
          <label>Type</label>
          <div class="value"><span class="customer-type-badge ${customer.type}">${customer.type}</span></div>
        </div>
        <div class="detail-item">
          <label>Instagram</label>
          <div class="value">${customer.instagram || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <label>Added</label>
          <div class="value">${new Date(customer.createdAt).toLocaleDateString()}</div>
        </div>
        <div class="detail-item">
          <label>Emails Sent</label>
          <div class="value">${customerState.emailHistory.filter(e => e.to === customer.email).length}</div>
        </div>
      </div>

      ${customer.notes ? `
        <div class="customer-notes">
          <h4>Notes</h4>
          <p>${customer.notes}</p>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Update customer stats
 */
function updateCustomerStats() {
  const totalEl = document.getElementById('total-customers');
  const leadsEl = document.getElementById('total-leads');
  const vipEl = document.getElementById('total-vip');

  if (totalEl) totalEl.textContent = customerState.customers.length;
  if (leadsEl) leadsEl.textContent = customerState.customers.filter(c => c.type === 'lead').length;
  if (vipEl) vipEl.textContent = customerState.customers.filter(c => c.type === 'vip').length;
}

/**
 * Open add customer modal
 */
function openAddCustomerModal() {
  console.log('openAddCustomerModal called');

  const modal = document.getElementById('add-customer-modal');
  console.log('Modal element:', modal);

  if (!modal) {
    console.error('Add customer modal not found!');
    alert('Modal not found!');
    return;
  }

  // Reset form
  const emailInput = document.getElementById('new-customer-email');
  const instagramInput = document.getElementById('new-customer-instagram');
  const typeInput = document.getElementById('new-customer-type');
  const notesInput = document.getElementById('new-customer-notes');

  if (emailInput) emailInput.value = '';
  if (instagramInput) instagramInput.value = '';
  if (typeInput) typeInput.value = 'lead';
  if (notesInput) notesInput.value = '';

  modal.style.display = 'flex';
  console.log('Modal should be visible now');
}

/**
 * Close add customer modal
 */
function closeAddCustomerModal() {
  if (addCustomerModal) {
    addCustomerModal.style.display = 'none';
  }
}

/**
 * Save new customer
 */
async function saveNewCustomer() {
  const email = document.getElementById('new-customer-email').value.trim();
  const instagram = document.getElementById('new-customer-instagram').value.trim();
  const type = document.getElementById('new-customer-type').value;
  const notes = document.getElementById('new-customer-notes').value.trim();

  if (!email) {
    showNotification('Email is required', 'error');
    return;
  }

  // Use instagram or email prefix as name
  const name = instagram ? instagram.replace('@', '') : email.split('@')[0];

  // Check for duplicate email
  if (customerState.customers.some(c => c.email.toLowerCase() === email.toLowerCase())) {
    showNotification('A customer with this email already exists', 'error');
    return;
  }

  const newCustomer = {
    id: 'cust_' + Date.now(),
    name,
    email,
    instagram,
    type,
    notes,
    createdAt: new Date().toISOString()
  };

  customerState.customers.push(newCustomer);
  await saveCustomers();

  closeAddCustomerModal();
  renderCustomerList();
  updateCustomerStats();
  showNotification(`Customer "${name}" added successfully!`, 'success');
  notificationSound.playSuccess();
}

/**
 * Delete customer
 */
const _deleteCustomerArmed = new Map();
async function deleteCustomer(id) {
  const customer = customerState.customers.find(c => c.id === id);
  if (!customer) return;

  // Two-click confirm — confirm() blocked by Electron
  if (!_deleteCustomerArmed.get(id)) {
    _deleteCustomerArmed.set(id, true);
    const btn = document.querySelector(`[onclick*="deleteCustomer('${id}')"]`);
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Confirm?';
      btn.style.outline = '1px solid #f87171';
      setTimeout(() => {
        _deleteCustomerArmed.delete(id);
        btn.textContent = orig;
        btn.style.outline = '';
      }, 3000);
    }
    return;
  }
  _deleteCustomerArmed.delete(id);

  customerState.customers = customerState.customers.filter(c => c.id !== id);

  if (customerState.selectedCustomer?.id === id) {
    customerState.selectedCustomer = null;
  }

  await saveCustomers();
  renderCustomerList();
  renderCustomerDetails();
  updateCustomerStats();
  showNotification(`Customer "${customer.name}" deleted`, 'info');
}

/**
 * Edit customer (placeholder)
 */
function editCustomer(id) {
  showNotification('Edit feature coming soon!', 'info');
}

/**
 * Send email to selected customer
 */
async function sendEmail() {
  if (!customerState.selectedCustomer) {
    showNotification('Please select a customer first', 'error');
    return;
  }

  const subject = emailSubjectInput.value.trim();
  const body = emailBodyInput.value.trim();

  if (!subject || !body) {
    showNotification('Please fill in subject and message', 'error');
    return;
  }

  // Replace variables
  const customer = customerState.selectedCustomer;
  const personalizedBody = body
    .replace(/{name}/g, customer.name)
    .replace(/{email}/g, customer.email)
    .replace(/{instagram}/g, customer.instagram || '');

  // Open email client
  const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(personalizedBody)}`;

  if (isElectron) {
    const { shell } = require('electron');
    shell.openExternal(mailtoLink);
  } else {
    window.open(mailtoLink);
  }

  // Log to history
  customerState.emailHistory.push({
    id: 'email_' + Date.now(),
    to: customer.email,
    subject,
    sentAt: new Date().toISOString()
  });

  await saveCustomers();
  renderEmailHistory();
  showNotification(`Email prepared for ${customer.name}`, 'success');
  notificationSound.playSuccess();
}

/**
 * Render email history
 */
function renderEmailHistory() {
  const historyList = document.getElementById('email-history-list');
  if (!historyList) return;

  if (customerState.emailHistory.length === 0) {
    historyList.innerHTML = '<div class="empty-state">No emails sent yet</div>';
    return;
  }

  const recent = customerState.emailHistory.slice(-10).reverse();
  historyList.innerHTML = recent.map(email => `
    <div class="email-history-item">
      <span class="email-to">${email.to}</span>
      <span class="email-date">${new Date(email.sentAt).toLocaleDateString()}</span>
    </div>
  `).join('');
}

/**
 * Open bulk email modal
 */
function openBulkEmailModal() {
  updateBulkRecipientCount();
  if (bulkEmailModal) {
    bulkEmailModal.style.display = 'flex';
  }
}

/**
 * Close bulk email modal
 */
function closeBulkEmailModal() {
  if (bulkEmailModal) {
    bulkEmailModal.style.display = 'none';
  }
}

/**
 * Update bulk recipient count
 */
function updateBulkRecipientCount() {
  const allChecked = document.getElementById('bulk-all')?.checked;
  const leadsChecked = document.getElementById('bulk-leads')?.checked;
  const customersChecked = document.getElementById('bulk-customers')?.checked;
  const vipChecked = document.getElementById('bulk-vip')?.checked;

  let count = 0;
  if (allChecked) {
    count = customerState.customers.length;
  } else {
    if (leadsChecked) count += customerState.customers.filter(c => c.type === 'lead').length;
    if (customersChecked) count += customerState.customers.filter(c => c.type === 'customer').length;
    if (vipChecked) count += customerState.customers.filter(c => c.type === 'vip').length;
  }

  const countEl = document.getElementById('bulk-recipient-count');
  if (countEl) countEl.textContent = count;
}

/**
 * Send bulk emails
 */
async function sendBulkEmails() {
  const subject = document.getElementById('bulk-email-subject')?.value.trim();
  const body = document.getElementById('bulk-email-body')?.value.trim();

  if (!subject || !body) {
    showNotification('Please fill in subject and message', 'error');
    return;
  }

  const allChecked = document.getElementById('bulk-all')?.checked;
  let recipients = [];

  if (allChecked) {
    recipients = customerState.customers;
  } else {
    const leadsChecked = document.getElementById('bulk-leads')?.checked;
    const customersChecked = document.getElementById('bulk-customers')?.checked;
    const vipChecked = document.getElementById('bulk-vip')?.checked;

    if (leadsChecked) recipients.push(...customerState.customers.filter(c => c.type === 'lead'));
    if (customersChecked) recipients.push(...customerState.customers.filter(c => c.type === 'customer'));
    if (vipChecked) recipients.push(...customerState.customers.filter(c => c.type === 'vip'));
  }

  if (recipients.length === 0) {
    showNotification('No recipients selected', 'error');
    return;
  }

  // Create mailto with BCC
  const emails = recipients.map(r => r.email).join(',');
  const mailtoLink = `mailto:?bcc=${emails}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  if (isElectron) {
    const { shell } = require('electron');
    shell.openExternal(mailtoLink);
  } else {
    window.open(mailtoLink);
  }

  // Log to history
  recipients.forEach(r => {
    customerState.emailHistory.push({
      id: 'email_' + Date.now() + '_' + r.id,
      to: r.email,
      subject,
      sentAt: new Date().toISOString(),
      bulk: true
    });
  });

  await saveCustomers();
  closeBulkEmailModal();
  renderEmailHistory();
  showNotification(`Bulk email prepared for ${recipients.length} recipients`, 'success');
  notificationSound.playComplete();
}

// Make functions globally available
window.deleteCustomer = deleteCustomer;
window.editCustomer = editCustomer;
window.openAddCustomerModal = openAddCustomerModal;
window.closeAddCustomerModal = closeAddCustomerModal;
window.saveNewCustomer = saveNewCustomer;

// Initialize customer database immediately
// DOMContentLoaded may have already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomerDatabase);
} else {
  // DOM already loaded, init immediately
  initCustomerDatabase();
}
