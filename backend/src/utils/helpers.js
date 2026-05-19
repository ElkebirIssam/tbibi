const crypto = require('crypto');

function generateVerificationCode() {
  return crypto.randomBytes(32).toString('hex');
}

function generateInvoiceNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INV-${y}${m}${d}-${rand}`;
}

function generateResetToken() {
  return crypto.randomBytes(20).toString('hex');
}

module.exports = { generateVerificationCode, generateInvoiceNumber, generateResetToken };
