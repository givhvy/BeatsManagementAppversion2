import React from 'react';
import './Customer.css';

function Customer() {
  return (
    <div className="tab-section">
      <div className="tab-header">
        <h1>Customer Management</h1>
        <p className="tab-description">Manage your customers and orders</p>
      </div>
      <div className="coming-soon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <h2>Customer Management</h2>
        <p>Track and manage your customer relationships</p>
      </div>
    </div>
  );
}

export default Customer;
