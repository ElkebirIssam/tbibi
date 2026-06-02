function init() {
  // WhatsApp client désactivé. Les codes sont affichés dans la console.
  console.log('[WHATSAPP] Mode console activé (aucun client réel).');
}

async function sendVerificationCode(phone, code) {
  const cleaned = phone.replace(/\D/g, '');
  const fullNumber = cleaned.startsWith('216') ? cleaned : `216${cleaned}`;
  console.log(`[WHATSAPP] Code pour ${phone} (+216${cleaned}): ${code}`);
  return { sent: true };
}

async function isReady() {
  return true;
}

module.exports = { init, sendVerificationCode, isReady };