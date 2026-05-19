const db = require('../config/db');

const locationController = {
  async getVilles(req, res) {
    try {
      const { rows } = await db.query('SELECT id, nom FROM villes ORDER BY nom');
      res.json(rows);
    } catch (error) {
      console.error('Get villes error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getDelegations(req, res) {
    try {
      const { villeId } = req.query;
      let query = 'SELECT d.id, d.nom, d.code_postal, d.ville_id FROM delegations d';
      const params = [];
      if (villeId) {
        query += ' WHERE d.ville_id = $1';
        params.push(villeId);
      }
      query += ' ORDER BY d.nom';
      const { rows } = await db.query(query, params);
      res.json(rows);
    } catch (error) {
      console.error('Get delegations error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = locationController;
