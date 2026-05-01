// ============================
// UTILITY FUNCTIONS
// ============================

// Format number with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format currency
function formatCurrency(amount) {
  return '$' + amount.toFixed(2);
}

// Format date
function formatDate(dateStr, format = 'short') {
  const date = new Date(dateStr + 'T12:00:00');
  if (format === 'short') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Export
window.formatNumber = formatNumber;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.debounce = debounce;
window.generateId = generateId;
