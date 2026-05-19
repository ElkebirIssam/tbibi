const { pool } = require('../config/db');

const data = [
  {
    ville: 'Tunis',
    delegations: [
      { nom: 'Tunis Ville', code: '1000' },
      { nom: 'Bab Bhar', code: '1000' },
      { nom: 'Bab Souika', code: '1002' },
      { nom: 'Cite El Khadra', code: '1003' },
      { nom: 'Djebel Jelloud', code: '1004' },
      { nom: 'El Kabaria', code: '1005' },
      { nom: 'El Menzah', code: '1004' },
      { nom: 'El Omrane', code: '1005' },
      { nom: 'El Omrane Superieur', code: '1006' },
      { nom: 'El Ouardia', code: '1007' },
      { nom: 'Ettahrir', code: '1000' },
      { nom: 'Hrairia', code: '1008' },
      { nom: 'La Medina', code: '1000' },
      { nom: 'Le Bardo', code: '2000' },
      { nom: 'Sidi El Bechir', code: '1009' },
      { nom: 'Sidi Hassine', code: '1010' },
    ],
  },
  {
    ville: 'Ariana',
    delegations: [
      { nom: 'Ariana Ville', code: '2000' },
      { nom: 'Ettadhamen', code: '2041' },
      { nom: 'Kalâat el-Andalous', code: '2022' },
      { nom: 'La Soukra', code: '2036' },
      { nom: 'Mnihla', code: '2037' },
      { nom: 'Raoued', code: '2050' },
      { nom: 'Sidi Thabet', code: '2020' },
    ],
  },
  {
    ville: 'Ben Arous',
    delegations: [
      { nom: 'Ben Arous Ville', code: '2013' },
      { nom: 'Bou Mhel el-Bassatine', code: '2014' },
      { nom: 'El Mourouj', code: '2074' },
      { nom: 'Ezzahra', code: '2035' },
      { nom: 'Fouchana', code: '2082' },
      { nom: 'Hammam Chatt', code: '2055' },
      { nom: 'Hammam Lif', code: '2050' },
      { nom: 'Mohamedia', code: '2082' },
      { nom: 'Mégrine', code: '2033' },
      { nom: 'Mornag', code: '2055' },
      { nom: 'Nouvelle Medina', code: '2070' },
      { nom: 'Rades', code: '2040' },
    ],
  },
  {
    ville: 'La Manouba',
    delegations: [
      { nom: 'La Manouba Ville', code: '2010' },
      { nom: 'Borj El Amri', code: '1185' },
      { nom: 'Den Den', code: '2010' },
      { nom: 'Douar Hicher', code: '2009' },
      { nom: 'El Battan', code: '1114' },
      { nom: 'Jedaida', code: '1120' },
      { nom: 'Mornaguia', code: '1115' },
      { nom: 'Oued Ellil', code: '1105' },
      { nom: 'Tebourba', code: '1130' },
    ],
  },
  {
    ville: 'Nabeul',
    delegations: [
      { nom: 'Nabeul Ville', code: '8000' },
      { nom: 'Béni Khiar', code: '8023' },
      { nom: 'Bou Argoub', code: '8040' },
      { nom: 'Dar Chaabane', code: '8012' },
      { nom: 'El Haouaria', code: '8045' },
      { nom: 'El Mida', code: '8042' },
      { nom: 'Grombalia', code: '8030' },
      { nom: 'Hammam El Ghezaz', code: '8041' },
      { nom: 'Hammamet', code: '8050' },
      { nom: 'Korba', code: '8050' },
      { nom: 'Kélibia', code: '8090' },
      { nom: 'Menzel Bouzelfa', code: '8010' },
      { nom: 'Menzel Temime', code: '8060' },
      { nom: 'Qurbus', code: '8043' },
      { nom: 'Soliman', code: '8020' },
      { nom: 'Takelsa', code: '8044' },
    ],
  },
  {
    ville: 'Zaghouan',
    delegations: [
      { nom: 'Zaghouan Ville', code: '1100' },
      { nom: 'Bir Mcherga', code: '1113' },
      { nom: 'El Fahs', code: '1110' },
      { nom: 'Nadhour', code: '1112' },
      { nom: 'Saouaf', code: '1111' },
      { nom: 'Zriba', code: '1125' },
    ],
  },
  {
    ville: 'Bizerte',
    delegations: [
      { nom: 'Bizerte Ville', code: '7000' },
      { nom: 'El Alia', code: '7016' },
      { nom: 'Ghar El Melh', code: '7012' },
      { nom: 'Ghezala', code: '7040' },
      { nom: 'Jarjuna', code: '7035' },
      { nom: 'Joumine', code: '7030' },
      { nom: 'Mateur', code: '7030' },
      { nom: 'Menzel Abderrahmane', code: '7035' },
      { nom: 'Menzel Bourguiba', code: '7050' },
      { nom: 'Menzel Jemil', code: '7015' },
      { nom: 'Ras Jebel', code: '7011' },
      { nom: 'Sejnane', code: '7013' },
      { nom: 'Tinja', code: '7034' },
      { nom: 'Utique', code: '7070' },
      { nom: 'Zarzouna', code: '7020' },
    ],
  },
  {
    ville: 'Beja',
    delegations: [
      { nom: 'Beja Ville', code: '9000' },
      { nom: 'Amdoun', code: '9050' },
      { nom: 'Goubellat', code: '9070' },
      { nom: 'Medjez El Bab', code: '9070' },
      { nom: 'Nefza', code: '9030' },
      { nom: 'Teboursouk', code: '9040' },
      { nom: 'Testour', code: '9060' },
      { nom: 'Thibar', code: '9020' },
    ],
  },
  {
    ville: 'Jendouba',
    delegations: [
      { nom: 'Jendouba Ville', code: '8100' },
      { nom: 'Ain Draham', code: '8110' },
      { nom: 'Balta Bou Aouene', code: '8130' },
      { nom: 'Bou Salem', code: '8170' },
      { nom: 'Fernana', code: '8114' },
      { nom: 'Ghardimaou', code: '8111' },
      { nom: 'Oued Meliz', code: '8120' },
      { nom: 'Tabarka', code: '8115' },
    ],
  },
  {
    ville: 'Le Kef',
    delegations: [
      { nom: 'Le Kef Ville', code: '7100' },
      { nom: 'Dahmani', code: '7140' },
      { nom: 'Jerissa', code: '7150' },
      { nom: 'Kalaa Djerda', code: '7120' },
      { nom: 'Kalaa Khasba', code: '7113' },
      { nom: 'Ksar El Lamsa', code: '7135' },
      { nom: 'Nebeur', code: '7110' },
      { nom: 'Sakiet Sidi Youssef', code: '7125' },
      { nom: 'Sers', code: '7160' },
      { nom: 'Tajerouine', code: '7130' },
      { nom: 'Touiref', code: '7115' },
    ],
  },
  {
    ville: 'Siliana',
    delegations: [
      { nom: 'Siliana Ville', code: '6100' },
      { nom: 'Bou Arada', code: '6114' },
      { nom: 'El Aroussa', code: '6111' },
      { nom: 'El Krib', code: '6140' },
      { nom: 'Gaâfour', code: '6113' },
      { nom: 'Kesra', code: '6115' },
      { nom: 'Makthar', code: '6140' },
      { nom: 'Rohia', code: '6135' },
      { nom: 'Sidi Bou Rouis', code: '6120' },
      { nom: 'Sbikha', code: '6130' },
    ],
  },
  {
    ville: 'Kairouan',
    delegations: [
      { nom: 'Kairouan Ville', code: '3100' },
      { nom: 'Bou Hajla', code: '3130' },
      { nom: 'Chebika', code: '3140' },
      { nom: 'Cherarda', code: '3113' },
      { nom: 'El Alaa', code: '3120' },
      { nom: 'Haffouz', code: '3150' },
      { nom: 'Hajeb El Ayoun', code: '3145' },
      { nom: 'Nasrallah', code: '3135' },
      { nom: 'Oueslatia', code: '3125' },
      { nom: 'Sbikha', code: '3111' },
    ],
  },
  {
    ville: 'Kasserine',
    delegations: [
      { nom: 'Kasserine Ville', code: '1200' },
      { nom: 'Ayoun', code: '1216' },
      { nom: 'El Ayoun', code: '1210' },
      { nom: 'Ennour', code: '1250' },
      { nom: 'Ezzouhour', code: '1240' },
      { nom: 'Feriana', code: '1220' },
      { nom: 'Foussana', code: '1215' },
      { nom: 'Haïdra', code: '1225' },
      { nom: 'Hassi El Frid', code: '1225' },
      { nom: 'Jedelienne', code: '1214' },
      { nom: 'Magel Bel Abbes', code: '1230' },
      { nom: 'Sbiba', code: '1210' },
      { nom: 'Sbeitla', code: '1250' },
      { nom: 'Thala', code: '1213' },
    ],
  },
  {
    ville: 'Sidi Bouzid',
    delegations: [
      { nom: 'Sidi Bouzid Ville', code: '9100' },
      { nom: 'Bir El Hafey', code: '9150' },
      { nom: 'Cebbala', code: '9130' },
      { nom: 'Jilma', code: '9125' },
      { nom: 'Meknassi', code: '9140' },
      { nom: 'Menzel Bouzaiane', code: '9115' },
      { nom: 'Mezzouna', code: '9120' },
      { nom: 'Ouled Haffouz', code: '9110' },
      { nom: 'Regueb', code: '9110' },
      { nom: 'Sidi Ali Ben Aoun', code: '9111' },
      { nom: 'Souk Jedid', code: '9125' },
    ],
  },
  {
    ville: 'Sousse',
    delegations: [
      { nom: 'Sousse Ville', code: '4000' },
      { nom: 'Akouda', code: '4021' },
      { nom: 'Bouficha', code: '4090' },
      { nom: 'Enfidha', code: '4030' },
      { nom: 'Hammam Sousse', code: '4011' },
      { nom: 'Hergla', code: '4040' },
      { nom: 'Kalaa Kebira', code: '4060' },
      { nom: 'Kalaa Sghira', code: '4024' },
      { nom: 'Kondar', code: '4050' },
      { nom: 'M\'saken', code: '4070' },
      { nom: 'Sidi Bou Ali', code: '4080' },
      { nom: 'Sidi El Heni', code: '4055' },
      { nom: 'Zaouia Ksiba Thrayet', code: '4090' },
    ],
  },
  {
    ville: 'Monastir',
    delegations: [
      { nom: 'Monastir Ville', code: '5000' },
      { nom: 'Amirat El Fehoul', code: '5025' },
      { nom: 'Amirat Haouj', code: '5026' },
      { nom: 'Amirat Touazra', code: '5024' },
      { nom: 'Bekalta', code: '5090' },
      { nom: 'Bembla', code: '5020' },
      { nom: 'Beni Hassen', code: '5013' },
      { nom: 'Djemmal', code: '5020' },
      { nom: 'Ksar Hellal', code: '5070' },
      { nom: 'Ksibet El Mediouni', code: '5030' },
      { nom: 'Lemta', code: '5015' },
      { nom: 'Menzel Ennour', code: '5033' },
      { nom: 'Menzel Fersi', code: '5075' },
      { nom: 'Menzel Hayet', code: '5035' },
      { nom: 'Moknine', code: '5050' },
      { nom: 'Ouerdanine', code: '5060' },
      { nom: 'Sayada', code: '5030' },
      { nom: 'Sahline', code: '5012' },
      { nom: 'Teboulba', code: '5080' },
      { nom: 'Zéramdine', code: '5055' },
    ],
  },
  {
    ville: 'Mahdia',
    delegations: [
      { nom: 'Mahdia Ville', code: '5100' },
      { nom: 'Bou Merdes', code: '5180' },
      { nom: 'Chebba', code: '5170' },
      { nom: 'Chorbane', code: '5160' },
      { nom: 'El Bradaa', code: '5190' },
      { nom: 'El Jem', code: '5160' },
      { nom: 'Essouassi', code: '5150' },
      { nom: 'Hadjeb El Ayoun', code: '5145' },
      { nom: 'Kerker', code: '5140' },
      { nom: 'Kesra', code: '5120' },
      { nom: 'Melloulech', code: '5130' },
      { nom: 'Ouled Chamekh', code: '5110' },
      { nom: 'Sidi Alouane', code: '5125' },
      { nom: 'Souassi', code: '5155' },
      { nom: 'Tlelsa', code: '5155' },
      { nom: 'Zinda', code: '5120' },
    ],
  },
  {
    ville: 'Sfax',
    delegations: [
      { nom: 'Sfax Ville', code: '3000' },
      { nom: 'Agareb', code: '3011' },
      { nom: 'Bir Ali Ben Khelifa', code: '3020' },
      { nom: 'El Ain', code: '3070' },
      { nom: 'El Hencha', code: '3040' },
      { nom: 'Graiba', code: '3060' },
      { nom: 'Jebiniana', code: '3050' },
      { nom: 'Kerkennah', code: '3012' },
      { nom: 'Mahrès', code: '3060' },
      { nom: 'Menzel Chaker', code: '3015' },
      { nom: 'Sakiet Eddaier', code: '3012' },
      { nom: 'Sakiet Ezzit', code: '3011' },
      { nom: 'Sfax Ouest', code: '3030' },
      { nom: 'Sfax Sud', code: '3003' },
      { nom: 'Thyna', code: '3040' },
    ],
  },
  {
    ville: 'Gabes',
    delegations: [
      { nom: 'Gabes Ville', code: '6000' },
      { nom: 'El Hamma', code: '6050' },
      { nom: 'Ghannouch', code: '6024' },
      { nom: 'Mareth', code: '6060' },
      { nom: 'Matmata', code: '6070' },
      { nom: 'Menzel Habib', code: '6035' },
      { nom: 'Mhamdia', code: '6080' },
      { nom: 'Metouia', code: '6011' },
      { nom: 'Nouvelle Matmata', code: '6085' },
      { nom: 'Oudhref', code: '6040' },
      { nom: 'Zarat', code: '6010' },
    ],
  },
  {
    ville: 'Medenine',
    delegations: [
      { nom: 'Medenine Ville', code: '4100' },
      { nom: 'Ajim', code: '4130' },
      { nom: 'Ben Gardane', code: '4160' },
      { nom: 'Beni Khedache', code: '4170' },
      { nom: 'Djerba - Houmet Souk', code: '4180' },
      { nom: 'Djerba - Midoun', code: '4116' },
      { nom: 'Djerba - Ajim', code: '4130' },
      { nom: 'Médenine Nord', code: '4100' },
      { nom: 'Médenine Sud', code: '4110' },
      { nom: 'Sidi Makhlouf', code: '4150' },
      { nom: 'Zarzis', code: '4170' },
    ],
  },
  {
    ville: 'Tataouine',
    delegations: [
      { nom: 'Tataouine Ville', code: '4200' },
      { nom: 'Bir Lahmar', code: '4230' },
      { nom: 'Dehiba', code: '4240' },
      { nom: 'Ghomrassen', code: '4225' },
      { nom: 'Remada', code: '4230' },
      { nom: 'Smar', code: '4221' },
    ],
  },
  {
    ville: 'Gafsa',
    delegations: [
      { nom: 'Gafsa Ville', code: '2100' },
      { nom: 'Belkhir', code: '2110' },
      { nom: 'El Guettar', code: '2140' },
      { nom: 'El Ksar', code: '2111' },
      { nom: 'Mdhila', code: '2120' },
      { nom: 'Metlaoui', code: '2130' },
      { nom: 'Moulares', code: '2135' },
      { nom: 'Redeyef', code: '2140' },
      { nom: 'Sened', code: '2125' },
      { nom: 'Sidi Aich', code: '2115' },
    ],
  },
  {
    ville: 'Tozeur',
    delegations: [
      { nom: 'Tozeur Ville', code: '2200' },
      { nom: 'Degache', code: '2210' },
      { nom: 'El Hamma du Jerid', code: '2220' },
      { nom: 'Nefta', code: '2230' },
      { nom: 'Tameghza', code: '2215' },
    ],
  },
  {
    ville: 'Kebili',
    delegations: [
      { nom: 'Kebili Ville', code: '4200' },
      { nom: 'Douz', code: '4260' },
      { nom: 'El Golaa', code: '4250' },
      { nom: 'Faouar', code: '4230' },
      { nom: 'Souk El Ahad', code: '4240' },
    ],
  },
];

async function seed() {
  console.log('Seeding Tunisian cities and delegations...');

  for (const entry of data) {
    const villeResult = await pool.query(
      'INSERT INTO villes (nom, pays) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id',
      [entry.ville, 'Tunisie']
    );
    const villeId = villeResult.rows[0]?.id;

    if (!villeId) {
      // Ville already exists, fetch its id
      const existing = await pool.query('SELECT id FROM villes WHERE nom = $1', [entry.ville]);
      if (existing.rows[0]) {
        for (const del of entry.delegations) {
          await pool.query(
            'INSERT INTO delegations (ville_id, nom, code_postal) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [existing.rows[0].id, del.nom, del.code]
          );
        }
      }
    } else {
      for (const del of entry.delegations) {
        await pool.query(
          'INSERT INTO delegations (ville_id, nom, code_postal) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [villeId, del.nom, del.code]
        );
      }
    }
  }

  console.log('  ✅ Tunisian cities and delegations seeded');
  await pool.end();
}

seed().catch(e => { console.error(e.message); process.exit(1); });
