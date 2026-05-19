const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const TEMP_DIR = path.join(__dirname, '..', '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function generatePrescription(doctor, patient, consultation, prescriptions) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filePath = path.join(TEMP_DIR, `prescription_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(20).text('ORDONNANCE MÉDICALE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Dr. ${doctor.first_name} ${doctor.last_name}`);
    doc.fontSize(10).text(`Spécialité: ${doctor.specialization || 'Généraliste'}`);
    doc.text(`Tel: ${doctor.phone}`);
    doc.moveDown();
    doc.text(`Patient: ${patient.first_name} ${patient.last_name}`);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-TN')}`);
    doc.moveDown();
    doc.fontSize(12).text('Prescriptions:', { underline: true });
    doc.moveDown(0.5);

    prescriptions.forEach((p, i) => {
      doc.fontSize(11).text(`${i + 1}. ${p.medication_name}`);
      doc.fontSize(10).text(`   Dosage: ${p.dosage}`);
      doc.text(`   Fréquence: ${p.frequency}`);
      doc.text(`   Durée: ${p.duration}`);
      if (p.notes) doc.text(`   Notes: ${p.notes}`);
      doc.moveDown(0.5);
    });

    doc.moveDown(2);
    doc.text(`Signature: _________________________`, { align: 'right' });
    doc.text(`Dr. ${doctor.first_name} ${doctor.last_name}`, { align: 'right' });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

function generateSickCertificate(doctor, patient, consultation) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filePath = path.join(TEMP_DIR, `certificate_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(20).text('CERTIFICAT DE MALADIE', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12).text('Je soussigné, Dr. ' + doctor.first_name + ' ' + doctor.last_name + ',');
    doc.moveDown();
    doc.text(`certifie avoir examiné le patient ${patient.first_name} ${patient.last_name}`);
    doc.text(`et constaté les symptômes suivants: ${consultation.symptoms}`);
    doc.moveDown();
    if (consultation.prescribed_rest) {
      doc.text(`Prescrit un repos de: ${consultation.prescribed_rest}`);
    }
    doc.text(`Diagnostic: ${consultation.diagnosis || 'N/A'}`);
    doc.moveDown(2);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-TN')}`, { align: 'right' });
    doc.moveDown();
    doc.text('Signature et Cachet:', { align: 'right' });
    doc.moveDown();
    doc.text(`Dr. ${doctor.first_name} ${doctor.last_name}`, { align: 'right' });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

function generateReferralLetter(doctor, patient, consultation, referralDetails) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filePath = path.join(TEMP_DIR, `referral_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(20).text('LETTRE D\'AFFECTATION', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12).text(`Dr. ${doctor.first_name} ${doctor.last_name}`);
    doc.text(`Spécialité: ${doctor.specialization || 'Généraliste'}`);
    doc.moveDown();
    doc.text('À:');
    doc.text(`Dr. ${referralDetails.doctor_name}`);
    doc.text(`Spécialité: ${referralDetails.specialization}`);
    if (referralDetails.hospital) doc.text(`Établissement: ${referralDetails.hospital}`);
    doc.moveDown();
    doc.text(`Patient: ${patient.first_name} ${patient.last_name}`);
    doc.text(`Motif: ${referralDetails.reason}`);
    doc.text(`Diagnostic: ${consultation.diagnosis || 'N/A'}`);
    if (referralDetails.notes) doc.text(`Notes: ${referralDetails.notes}`);
    doc.moveDown(2);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-TN')}`, { align: 'right' });
    doc.text('Signature:', { align: 'right' });
    doc.text(`Dr. ${doctor.first_name} ${doctor.last_name}`, { align: 'right' });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

function generateInvoicePdf(invoice, items, patient, doctor) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filePath = path.join(TEMP_DIR, `invoice_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(20).text('FACTURE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`N°: ${invoice.invoice_number}`);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString('fr-TN')}`);
    doc.moveDown();

    if (doctor) {
      doc.text(`Médecin: Dr. ${doctor.first_name} ${doctor.last_name}`);
    }
    doc.text(`Patient: ${patient.first_name} ${patient.last_name}`);
    doc.moveDown();

    doc.fontSize(11).text('Détails:', { underline: true });
    doc.moveDown(0.5);

    const startY = doc.y;
    doc.fontSize(10);
    doc.text('Description', 50, startY, { width: 250 });
    doc.text('Qté', 300, startY, { width: 50, align: 'center' });
    doc.text('P.U.', 350, startY, { width: 80, align: 'right' });
    doc.text('Total', 430, startY, { width: 80, align: 'right' });
    doc.moveDown();

    let y = doc.y;
    items.forEach((item) => {
      doc.text(item.description, 50, y, { width: 250 });
      doc.text(String(item.quantity), 300, y, { width: 50, align: 'center' });
      doc.text(`${item.unit_price.toFixed(2)} TND`, 350, y, { width: 80, align: 'right' });
      doc.text(`${item.total.toFixed(2)} TND`, 430, y, { width: 80, align: 'right' });
      y += 20;
    });

    doc.moveDown();
    doc.text(`Montant: ${invoice.amount.toFixed(2)} TND`, { align: 'right' });
    doc.text(`Taxe: ${invoice.tax.toFixed(2)} TND`, { align: 'right' });
    doc.fontSize(14).text(`Total: ${invoice.total.toFixed(2)} TND`, { align: 'right' });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { generatePrescription, generateSickCertificate, generateReferralLetter, generateInvoicePdf, TEMP_DIR };
