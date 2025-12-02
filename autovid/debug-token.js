// Debug script - print token trực tiếp
require('dotenv').config();

const token = process.env.PINTEREST_ACCESS_TOKEN;

console.log('Full token from .env:');
console.log(token);
console.log('\nToken length:', token ? token.length : 0);
console.log('First 30 chars:', token ? token.substring(0, 30) : 'N/A');
console.log('Last 20 chars:', token ? token.substring(token.length - 20) : 'N/A');
