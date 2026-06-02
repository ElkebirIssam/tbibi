const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Doctor, Patient, Specialization, PaymentVerification, AuditLog } = require('../models');
const { generateVerificationCode, generateResetToken } = require('../utils/helpers');
const { sendConfirmationEmail } = require('../utils/email');

const authController = {
  async register(req, res) {
    try {
      const { email, password, role, firstName, lastName, phone, address, ...profileData } = req.body;

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered.' });
      }

      const allowedRoles = ['doctor', 'assistant', 'nurse', 'patient'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const verificationCode = generateVerificationCode();

      const user = await User.create({
        email,
        passwordHash,
        role,
        firstName,
        lastName,
        phone,
        address,
      });

      await User.update(user.id, { verification_code: verificationCode });

      if (role === 'doctor') {
        let specializationName = profileData.specialization;
        let specializationId = profileData.specializationId;
        // If specializationId is provided, resolve the name
        if (specializationId) {
          const spec = await Specialization.findById(specializationId);
          if (spec) specializationName = spec.name;
        }
        await Doctor.create({
          userId: user.id,
          specializationId,
          specialization: specializationName,
          licenseNumber: profileData.licenseNumber,
          consultationFee: profileData.consultationFee,
          bio: profileData.bio,
          availableDays: profileData.availableDays || [],
          cabinetAddress: profileData.cabinetAddress,
          city: profileData.city,
        });
      } else if (role === 'patient') {
        await Patient.create({
          userId: user.id,
          dateOfBirth: profileData.dateOfBirth,
          birthPlace: profileData.birthPlace,
          city: profileData.city,
          gender: profileData.gender,
          bloodGroup: profileData.bloodGroup,
          allergies: profileData.allergies,
          chronicDiseases: profileData.chronicDiseases,
          emergencyContactName: profileData.emergencyContactName,
          emergencyContactPhone: profileData.emergencyContactPhone,
          insuranceProvider: profileData.insuranceProvider,
          insuranceNumber: profileData.insuranceNumber,
        });
      }

      await AuditLog.create({
        userId: user.id,
        action: 'REGISTER',
        entityType: 'user',
        entityId: user.id,
        details: { role },
        ipAddress: req.ip,
      });

      // Send confirmation email (non-blocking)
      sendConfirmationEmail({
        to: email,
        firstName,
        lastName,
        verificationCode,
      }).then(result => {
        if (result?.previewUrl) {
          console.log(`[EMAIL] Preview: ${result.previewUrl}`);
        }
      }).catch(err => {
        console.error('[EMAIL] Background send failed:', err.message);
      });

      res.status(201).json({
        message: 'Inscription réussie ! Un email de confirmation vous a été envoyé.',
        userId: user.id,
        verificationCode,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Server error during registration.' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (!user.is_active) {
        return res.status(403).json({ error: 'Account not activated. Please complete payment verification.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      await AuditLog.create({
        userId: user.id,
        action: 'LOGIN',
        entityType: 'user',
        entityId: user.id,
        ipAddress: req.ip,
      });

      let profile = null;
      if (user.role === 'doctor') profile = await Doctor.findByUserId(user.id);
      if (user.role === 'patient') profile = await Patient.findByUserId(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          address: user.address,
          isVerified: user.is_verified,
          phoneVerified: user.phone_verified,
          profile,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error during login.' });
    }
  },

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });
      }

      const resetToken = generateResetToken();
      const expires = new Date(Date.now() + 3600000); // 1 hour

      await User.update(user.id, {
        reset_token: resetToken,
        reset_token_expires: expires,
      });

      // In production, send email with reset link
      console.log(`Reset token for ${email}: ${resetToken}`);

      res.json({ message: 'If the email exists, a reset link has been sent.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      const { rows } = require('../config/db').query(
        'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
        [token]
      );
      const result = await rows;

      if (!result[0]) {
        return res.status(400).json({ error: 'Invalid or expired reset token.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      await User.update(result[0].id, {
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null,
      });

      res.json({ message: 'Password reset successfully.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      let profile = null;
      if (user.role === 'doctor') profile = await Doctor.findByUserId(user.id);
      if (user.role === 'patient') profile = await Patient.findByUserId(user.id);

      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        address: user.address,
        isActive: user.is_active,
        isVerified: user.is_verified,
        phoneVerified: user.phone_verified,
        profile,
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async updateProfile(req, res) {
    try {
      const allowedUserFields = ['phone', 'address'];
      const userUpdates = {};
      for (const field of allowedUserFields) {
        if (req.body[field] !== undefined) {
          userUpdates[field] = req.body[field];
        }
      }

      if (Object.keys(userUpdates).length > 0) {
        await User.update(req.user.id, userUpdates);
      }

      if (req.user.role === 'patient') {
        const patientFields = ['date_of_birth', 'birth_place', 'city', 'gender', 'blood_group', 'allergies', 'chronic_diseases', 'emergency_contact_name', 'emergency_contact_phone', 'insurance_provider', 'insurance_number'];
        const patientUpdates = {};
        for (const field of patientFields) {
          if (req.body[field] !== undefined) {
            patientUpdates[field] = req.body[field];
          }
        }
        if (Object.keys(patientUpdates).length > 0) {
          const db = require('../config/db');
          const patient = await Patient.findByUserId(req.user.id);
          if (patient) {
            const keys = Object.keys(patientUpdates);
            const values = Object.values(patientUpdates);
            const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
            await db.query(
              `UPDATE patients SET ${setClause} WHERE id = $1`,
              [patient.id, ...values]
            );
          }
        }
      }

      const updatedUser = await User.findById(req.user.id);
      res.json({
        message: 'Profile updated.',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          phone: updatedUser.phone,
          address: updatedUser.address,
          isVerified: updatedUser.is_verified,
          phoneVerified: updatedUser.phone_verified,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async verifyPayment(req, res) {
    try {
      const { userId, amount, transactionRef } = req.body;

      const payment = await PaymentVerification.create({
        userId,
        amount,
        transactionRef,
        proofUrl: req.file ? req.file.path : null,
      });

      res.status(201).json({ message: 'Payment proof submitted. Awaiting admin verification.', payment });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async resetPasswordFixed(req, res) {
    try {
      const { token, newPassword } = req.body;
      const { query } = require('../config/db');
      const result = await query(
        'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
        [token]
      );

      if (!result.rows[0]) {
        return res.status(400).json({ error: 'Invalid or expired reset token.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      await User.update(result.rows[0].id, {
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null,
      });

      res.json({ message: 'Password reset successfully.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async sendPhoneCode(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      if (!user.phone) return res.status(400).json({ error: 'Aucun numéro de téléphone enregistré.' });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 5 * 60 * 1000);

      await User.update(user.id, {
        phone_verification_code: code,
        phone_verification_expires: expires,
      });

      const whatsapp = require('../utils/whatsapp');
      const result = await whatsapp.sendVerificationCode(user.phone, code);

      if (result.sent) {
        res.json({ message: 'Code de vérification envoyé par WhatsApp.' });
      } else {
        // Fallback: log to console so user can still test
        console.log(`[WHATSAPP-FALLBACK] Code pour ${user.phone}: ${code}`);
        res.json({ message: `Code disponible dans la console (WhatsApp: ${result.reason || 'non disponible'}).` });
      }
    } catch (error) {
      console.error('Send phone code error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'envoi du code.' });
    }
  },

  async verifyPhone(req, res) {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Code requis.' });

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      if (user.phone_verification_code !== code) {
        return res.status(400).json({ error: 'Code invalide.' });
      }
      if (new Date() > new Date(user.phone_verification_expires)) {
        return res.status(400).json({ error: 'Code expiré. Veuillez en demander un nouveau.' });
      }

      await User.update(user.id, {
        phone_verified: true,
        phone_verification_code: null,
        phone_verification_expires: null,
      });

      res.json({ message: 'Téléphone vérifié avec succès.' });
    } catch (error) {
      console.error('Verify phone error:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification.' });
    }
  },

  async sendEmailVerification(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      if (user.is_verified) {
        return res.json({ message: 'Email déjà vérifié.' });
      }

      const verificationCode = require('../utils/helpers').generateVerificationCode();
      await User.update(user.id, { verification_code: verificationCode });

      const { sendConfirmationEmail } = require('../utils/email');
      sendConfirmationEmail({
        to: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        verificationCode,
      }).then(result => {
        if (result?.previewUrl) console.log(`[EMAIL] Preview: ${result.previewUrl}`);
      }).catch(err => {
        console.error('[EMAIL] Background send failed:', err.message);
      });

      res.json({ message: 'Email de vérification envoyé.' });
    } catch (error) {
      console.error('Send email verification error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'envoi.' });
    }
  },

  async verifyEmail(req, res) {
    try {
      const { code, email } = req.query;
      console.log('[VERIFY] Params reçus:', { email, code: code?.substring(0, 20) + '...' });

      if (!code || !email) {
        return res.status(400).json({ error: 'Code de vérification et email requis.' });
      }

      const db = require('../config/db');

      const check = await db.query('SELECT id, email, verification_code FROM users WHERE email = $1', [email]);
      if (check.rows.length === 0) {
        console.log('[VERIFY] Aucun utilisateur trouvé pour:', email);
        return res.status(400).json({ error: 'Lien de vérification invalide ou expiré.' });
      }

      const result = await db.query(
        'SELECT * FROM users WHERE email = $1 AND verification_code = $2',
        [email, code]
      );

      if (!result.rows[0]) {
        return res.status(400).json({ error: 'Lien de vérification invalide ou expiré.' });
      }

      await db.query(
        'UPDATE users SET is_verified = true, verification_code = NULL WHERE id = $1',
        [result.rows[0].id]
      );

      res.json({ message: 'Email confirmé avec succès ! Vous pouvez maintenant vous connecter.' });
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification.' });
    }
  },
};

module.exports = authController;
