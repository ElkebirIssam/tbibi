const { pool } = require('../config/db');

const descriptions = {
  'Acupuncture': 'Technique de soin utilisant des aiguilles fines pour rééquilibrer l\'énergie vitale du corps et soulager diverses pathologies.',
  'Addictologue': 'Prise en charge des addictions et dépendances à travers une approche médicale et psychothérapeutique globale.',
  'Algologue': 'Spécialiste de la prise en charge diagnostique et thérapeutique de la douleur chronique et complexe.',
  'Allergologue': 'Diagnostic et traitement des allergies et intolérances touchant les voies respiratoires, la peau et l\'alimentation.',
  'Anatomo-Cyto-Pathologiste': 'Analyse microscopique des tissus et cellules pour le diagnostic des maladies, notamment cancéreuses.',
  'Andrologue': 'Spécialiste des troubles de la reproduction et de la santé masculine.',
  'Anesthésiste-Réanimateur': 'Assure la sécurité des patients pendant les actes chirurgicaux et la réanimation en situation critique.',
  'Angiologue': 'Diagnostic et traitement des maladies des vaisseaux sanguins et lymphatiques.',
  'Audiologiste': 'Évaluation et prise en charge des troubles de l\'audition et de l\'équilibre.',
  'Audioprothésiste': 'Appareillage et suivi des patients souffrant de perte auditive avec des prothèses auditives.',
  'Auriculothérapeute': 'Soins par stimulation des points réflexes de l\'oreille pour traiter diverses pathologies fonctionnelles.',
  'Biochimiste': 'Analyse des composés chimiques dans les fluides biologiques pour le diagnostic médical.',
  'Biochimiste Clinique': 'Interprétation des analyses biochimiques pour aider au diagnostic et au suivi des pathologies.',
  'Biologiste Médical': 'Réalisation et interprétation des analyses biologiques contribuant au diagnostic des maladies.',
  'Biophysique': 'Application des principes physiques à l\'étude des phénomènes biologiques et médicaux.',
  'Cancérologue': 'Spécialiste du diagnostic et du traitement des cancers par chimiothérapie, radiothérapie ou chirurgie.',
  'Cardiologue': 'Diagnostic et traitement des maladies du cœur et des vaisseaux sanguins.',
  'Cardiologue Pédiatrique': 'Prise en charge des maladies cardiaques congénitales ou acquises chez l\'enfant.',
  'Chiropracteur': 'Diagnostic et traitement des troubles musculo-squelettiques par manipulations vertébrales et articulaires.',
  'Chirurgie Arthroscopique et du Sport': 'Traitement chirurgical des lésions articulaires et sportives par techniques mini-invasives.',
  'Chirurgie Plastique et Réparatrice': 'Reconstruction et réparation des tissus altérés par traumatisme, maladie ou malformation congénitale.',
  'Chirurgien Buccal': 'Chirurgie des tissus durs et mous de la cavité buccale et des maxillaires.',
  'Chirurgien Cancérologue': 'Ablation chirurgicale des tumeurs cancéreuses et prise en charge oncologique globale.',
  'Chirurgien Capillaire': 'Restauration chirurgicale de la chevelure par greffe et implantation de follicules pileux.',
  'Chirurgien Cardio-Vasculaire': 'Chirurgie du cœur, des artères et des veines pour traiter les pathologies cardiovasculaires.',
  'Chirurgien Cardio-Vasculaire Thoracique': 'Chirurgie des organes thoraciques incluant le cœur, les poumons et les gros vaisseaux.',
  'Chirurgien Cervico-Facial': 'Chirurgie des tissus de la tête, du cou et de la face hors domaine neurologique.',
  'Chirurgien de l\'Obésité': 'Réalisation d\'interventions chirurgicales bariatriques pour le traitement de l\'obésité sévère.',
  'Chirurgien Esthétique': 'Chirurgie visant à améliorer l\'apparence physique par des interventions correctives et embellissantes.',
  'Chirurgien Généraliste': 'Prise en charge chirurgicale polyvalente des pathologies abdominales, digestives et pariétales.',
  'Chirurgien Maxillo-Facial et Esthétique': 'Chirurgie reconstructrice et esthétique de la face et des mâchoires.',
  'Chirurgien Maxillo-Facial Stomatologue': 'Chirurgie de la cavité buccale, des dents et des structures maxillo-faciales.',
  'Chirurgien Orthopédiste Pédiatrique': 'Correction chirurgicale des malformations et pathologies orthopédiques de l\'enfant.',
  'Chirurgien Orthopédiste Traumatologue': 'Chirurgie des traumatismes osseux et articulaires et des pathologies orthopédiques.',
  'Chirurgien Pédiatrique': 'Chirurgie des pathologies congénitales et acquises chez le nouveau-né, l\'enfant et l\'adolescent.',
  'Chirurgien Plasticien': 'Chirurgie reconstructrice et esthétique visant à restaurer ou améliorer la forme des tissus.',
  'Chirurgien Plasticien et Esthétique': 'Réparation et amélioration chirurgicale des tissus cutanés et sous-cutanés à but reconstructeur ou esthétique.',
  'Chirurgien Thoracique': 'Chirurgie des organes intrathoraciques incluant poumons, plèvre et médiastin.',
  'Chirurgien Urologue': 'Chirurgie de l\'appareil urinaire masculin et féminin et de l\'appareil génital masculin.',
  'Chirurgien Vasculaire': 'Chirurgie des artères et des veines pour traiter les pathologies vasculaires périphériques.',
  'Chirurgien Viscéral et Digestif': 'Chirurgie des organes digestifs abdominaux et de la paroi abdominale.',
  'Dentiste': 'Prévention, diagnostic et traitement des affections de la cavité buccale et des dents.',
  'Dermatologue': 'Diagnostic et traitement des maladies de la peau, des muqueuses, des ongles et des cheveux.',
  'Diabétologue': 'Prise en charge du diabète sucré et de ses complications métaboliques et vasculaires.',
  'Diététicien': 'Conseils nutritionnels personnalisés pour la prévention et le traitement des pathologies liées à l\'alimentation.',
  'Embryologiste': 'Étude et prise en charge des processus de développement embryonnaire en assistance médicale à la procréation.',
  'Endocrinologue': 'Diagnostic et traitement des maladies hormonales et des glandes endocrines.',
  'Endocrinologue Diabétologue': 'Prise en charge des troubles hormonaux et métaboliques incluant le diabète et les pathologies thyroïdiennes.',
  'Endodontiste': 'Traitement des pathologies de la pulpe dentaire et des tissus périapicaux.',
  'Épidémiologiste': 'Étude de la distribution et des déterminants des maladies au sein des populations humaines.',
  'Ergothérapeute': 'Réadaptation des patients par l\'activité pour retrouver leur autonomie dans la vie quotidienne.',
  'Gastro-Entérologue': 'Diagnostic et traitement des maladies du tube digestif, du foie et du pancréas.',
  'Généraliste': 'Médecin de premier recours assurant le suivi global et la coordination des soins des patients.',
  'Généticien': 'Étude et conseil sur les maladies génétiques et les anomalies chromosomiques héréditaires.',
  'Gériatre': 'Prise en charge médicale globale des personnes âgées et de leurs pathologies multiples.',
  'Gynécologue': 'Soins de l\'appareil génital féminin incluant prévention, diagnostic et traitement.',
  'Gynécologue Obstétricien': 'Suivi de la grossesse, accouchement et prise en charge des pathologies gynécologiques.',
  'Hématologue': 'Diagnostic et traitement des maladies du sang, de la moelle osseuse et des ganglions lymphatiques.',
  'Hématologue Clinique': 'Prise en charge clinique des hémopathies malignes et bénignes et des troubles de la coagulation.',
  'Hématopathologiste': 'Analyse anatomopathologique des tissus hématopoïétiques pour le diagnostic des hémopathies.',
  'Hépatologue': 'Spécialiste des maladies du foie, des voies biliaires et du pancréas.',
  'Hypnothérapeute': 'Utilisation de l\'hypnose médicale pour traiter les troubles psychologiques et somatiques.',
  'Immunologiste': 'Étude et prise en charge des pathologies du système immunitaire et des allergies.',
  'Immunopathologiste': 'Analyse des mécanismes immunitaires impliqués dans les maladies auto-immunes et les déficits immunitaires.',
  'Implantologue': 'Pose d\'implants dentaires pour la reconstruction et le remplacement des dents manquantes.',
  'Interniste': 'Prise en charge globale des maladies complexes et plurisystémiques chez l\'adulte.',
  'Interniste Hypertensiologue': 'Prise en charge diagnostique et thérapeutique de l\'hypertension artérielle et ses complications.',
  'Interniste Maladies Infectieuses': 'Diagnostic et traitement des infections bactériennes, virales, parasitaires et fongiques.',
  'Interniste Réanimation Médicale': 'Prise en charge des patients en état critique nécessitant une surveillance continue et des soins intensifs.',
  'Kinésithérapeute': 'Rééducation fonctionnelle par des techniques manuelles et instrumentées pour restaurer la mobilité.',
  'Maladies Infectieuses': 'Prise en charge des pathologies infectieuses complexes incluant les infections nosocomiales et émergentes.',
  'Médecin Biologiste': 'Direction et interprétation des analyses médicales de biologie pour le diagnostic clinique.',
  'Médecin de Famille': 'Suivi médical continu des patients de tous âges avec une approche globale et personnalisée.',
  'Médecin du Sommeil': 'Diagnostic et traitement des troubles du sommeil tels que l\'apnée et l\'insomnie chronique.',
  'Médecin du Sport': 'Suivi médical des sportifs et prise en charge des pathologies liées à l\'activité physique.',
  'Médecin du Travail': 'Prévention des risques professionnels et suivi de la santé des travailleurs en entreprise.',
  'Médecin Esthétique': 'Soins médicaux non chirurgicaux visant à améliorer l\'apparence et à ralentir le vieillissement cutané.',
  'Médecin Expert Judiciaire': 'Évaluations médicales dans le cadre de procédures judiciaires pour éclairer les décisions des tribunaux.',
  'Médecin Hémodialyseur': 'Prise en charge des patients insuffisants rénaux chroniques nécessitant une épuration extrarénale régulière.',
  'Médecin Homéopathe': 'Traitement des pathologies par des substances hautement diluées selon le principe de similitude.',
  'Médecin Légiste': 'Détermination des causes et circonstances des décès dans un cadre médico-judiciaire.',
  'Médecin Nucléaire': 'Utilisation de traceurs radioactifs à des fins diagnostiques et thérapeutiques en imagerie médicale.',
  'Médecin Physique Réadaptateur': 'Réhabilitation des patients présentant des handicaps physiques et neurologiques.',
  'Médecin Urgentiste': 'Prise en charge immédiate des urgences médicales et vitales aux services d\'accueil.',
  'Médecine Douce et Alternative': 'Approches thérapeutiques non conventionnelles complétant la médecine traditionnelle pour le bien-être.',
  'Médecine Générale': 'Soins de santé primaires avec une approche globale et continue de la personne.',
  'Médecine Morphologique et Anti-Âge': 'Prévention et traitement du vieillissement par des approches morphologiques et nutritionnelles.',
  'Médecine Préventive': 'Actions de prévention des maladies et de promotion de la santé auprès des populations.',
  'Médecine Tropicale': 'Prise en charge des maladies infectieuses et parasitaires spécifiques aux régions tropicales et subtropicales.',
  'Microbiologiste': 'Étude des micro-organismes pathogènes pour le diagnostic et le contrôle des infections.',
  'Micronutritionniste': 'Optimisation de la santé par l\'équilibre des micronutriments et des acides gras essentiels.',
  'Néonatologiste': 'Soins intensifs et suivi médical des nouveau-nés prématurés ou présentant des pathologies néonatales.',
  'Néphrologue': 'Diagnostic et traitement des maladies rénales et des troubles hydroélectrolytiques.',
  'Neurochirurgien': 'Chirurgie du système nerveux central et périphérique incluant le cerveau et la moelle épinière.',
  'Neurologue': 'Diagnostic et traitement des maladies du système nerveux central et périphérique.',
  'Neuropédiatre': 'Prise en charge des pathologies neurologiques développementales et acquises chez l\'enfant.',
  'Neurophysiologiste': 'Exploration fonctionnelle du système nerveux par électroencéphalographie et électromyographie.',
  'Neuropsychiatre': 'Prise en charge des troubles psychiatriques ayant une composante neurologique ou organique sous-jacente.',
  'Neuropsychologue': 'Évaluation et rééducation des fonctions cognitives altérées par des lésions cérébrales.',
  'Nutrithérapeute': 'Utilisation thérapeutique de la nutrition pour prévenir et traiter les déséquilibres métaboliques.',
  'Nutritionniste': 'Conseils nutritionnels et élaboration de régimes adaptés aux besoins de santé des patients.',
  'Oncologue': 'Prise en charge globale des patients atteints de cancer incluant diagnostic et traitements personnalisés.',
  'Oncologue-Chimiothérapeute': 'Administration et suivi des traitements anticancéreux par chimiothérapie et thérapies ciblées.',
  'Oncologue-Radiothérapeute': 'Traitement des cancers par rayonnements ionisants avec une précision ciblée.',
  'Ophtalmologiste': 'Diagnostic et traitement chirurgical et médical des maladies de l\'œil et de la vision.',
  'Opticien': 'Fabrication et adaptation de verres correcteurs et de lentilles pour corriger les troubles visuels.',
  'Orthodontiste': 'Correction des anomalies de position des dents et des mâchoires par appareillages dentaires.',
  'Orthopédiste Traumatologue': 'Traitement médical et chirurgical des pathologies de l\'appareil locomoteur et des traumatismes.',
  'Orthophoniste': 'Rééducation des troubles de la communication orale et écrite et de la déglutition.',
  'Orthoprothésiste': 'Conception et adaptation d\'appareillages orthopédiques pour soutenir ou corriger les membres.',
  'Orthoptiste': 'Rééducation des troubles de la vision binoculaire et du mouvement des yeux.',
  'Ostéopathe': 'Diagnostic et traitement des dysfonctions structurelles par manipulations manuelles du corps.',
  'Oto-Rhino-Laryngologiste (ORL)': 'Soins chirurgicaux et médicaux des pathologies de l\'oreille, du nez et de la gorge.',
  'Parasitologiste': 'Identification et étude des parasites responsables de maladies infectieuses chez l\'homme.',
  'Parodontiste Implantologiste': 'Traitement des maladies du parodonte et pose d\'implants dentaires.',
  'Pédiatre': 'Suivi médical et traitement des pathologies de la naissance jusqu\'à l\'adolescence.',
  'Pédodontiste': 'Soins dentaires adaptés aux enfants et aux adolescents incluant prévention et traitements.',
  'Pédopsychiatre': 'Diagnostic et traitement des troubles psychiatriques et du développement chez l\'enfant et l\'adolescent.',
  'Périnéologue': 'Prise en charge des troubles du plancher pelvien et de la région périnéale.',
  'Pharmacien Biologiste': 'Réalisation et validation des analyses biologiques au sein des laboratoires médicaux.',
  'Pharmacologue': 'Étude des médicaments et de leurs effets sur l\'organisme pour optimiser les traitements.',
  'Phlébologue': 'Diagnostic et traitement des maladies veineuses incluant les varices et les thromboses.',
  'Physiologiste': 'Étude du fonctionnement normal des organes et systèmes du corps humain.',
  'Physiothérapeute': 'Rééducation physique par des exercices et techniques manuelles pour restaurer les fonctions motrices.',
  'Phytothérapeute': 'Utilisation thérapeutique des plantes médicinales pour prévenir et traiter les troubles de santé.',
  'Pneumologue': 'Diagnostic et traitement des maladies des voies respiratoires et des poumons.',
  'Podologue': 'Soins et prévention des affections du pied et des ongles et réalisation de semelles orthopédiques.',
  'Posturologue': 'Analyse et correction des déséquilibres posturaux responsables de douleurs chroniques.',
  'Proctologue': 'Diagnostic et traitement des pathologies de l\'anus, du rectum et du côlon distal.',
  'Prothésiste Capillaire': 'Conception et réalisation de prothèses capillaires sur mesure pour les patients alopéciques.',
  'Prothésiste Dentaire': 'Fabrication sur mesure de prothèses dentaires pour remplacer les dents absentes.',
  'Psychanalyste': 'Exploration de l\'inconscient par la parole pour traiter les souffrances psychiques profondes.',
  'Psychiatre': 'Diagnostic et traitement médical des troubles mentaux par psychothérapie et pharmacothérapie.',
  'Psychologue': 'Accompagnement psychologique et évaluation des troubles du comportement et de la personnalité.',
  'Psychologue Clinicien': 'Évaluation et prise en charge thérapeutique des souffrances psychiques par des entretiens cliniques.',
  'Psychomotricien': 'Rééducation des troubles du mouvement et de la relation corporelle par des médiations corporelles.',
  'Psychothérapeute': 'Prise en charge par la parole des troubles psychologiques et relationnels.',
  'Radiologue': 'Réalisation et interprétation d\'examens d\'imagerie médicale pour le diagnostic des pathologies.',
  'Radiothérapeute': 'Traitement des cancers par irradiation ciblée des tumeurs avec préservation des tissus sains.',
  'Réanimateur Médical': 'Surveillance intensive et suppléance vitale des patients en défaillance d\'organe.',
  'Réflexologue': 'Stimulation de points réflexes des pieds et des mains pour rééquilibrer les fonctions organiques.',
  'Rhumatologue': 'Diagnostic et traitement des maladies ostéoarticulaires et des pathologies inflammatoires rhumatismales.',
  'Rythmologue Interventionnel': 'Prise en charge des troubles du rythme cardiaque par ablation et pose de stimulateurs.',
  'Sage-Femme': 'Suivi de la grossesse, accompagnement de l\'accouchement et soins postnataux.',
  'Santé Publique et Médecine Sociale': 'Prévention des maladies et promotion de la santé au niveau des populations.',
  'Sénologue': 'Dépistage et prise en charge des pathologies du sein incluant le cancer mammaire.',
  'Sexologue': 'Prise en charge des troubles de la sexualité et des difficultés relationnelles associées.',
  'Stomatologue': 'Chirurgie et soins des pathologies de la cavité buccale et des maxillaires.',
  'Thérapeute Manuel': 'Traitement des douleurs musculo-squelettiques par techniques manuelles et manipulations.',
  'Urodynamique': 'Exploration fonctionnelle des voies urinaires pour diagnostiquer les troubles de la continence.',
  'Urologue': 'Prise en charge médicale et chirurgicale des maladies de l\'appareil urinaire et génital masculin.',
  'Vétérinaire': 'Soins médicaux et chirurgicaux des animaux de compagnie et d\'élevage.'
};

async function seedDescriptions() {
  const entries = Object.entries(descriptions);
  console.log(`Mise à jour des descriptions pour ${entries.length} spécialités...`);

  let updated = 0;
  let notFound = 0;

  for (const [name, description] of entries) {
    const result = await pool.query(
      'UPDATE specializations SET description = $1 WHERE name = $2',
      [description, name]
    );
    if (result.rowCount > 0) {
      updated++;
    } else {
      console.warn(`  ⚠️  Spécialité introuvable : ${name}`);
      notFound++;
    }
  }

  console.log(`  ✅ ${updated} spécialités mises à jour`);
  if (notFound > 0) {
    console.log(`  ⚠️  ${notFound} spécialités non trouvées dans la base`);
  }
  console.log(`  Total: ${entries.length} spécialités`);

  await pool.end();
}

seedDescriptions().catch(e => {
  console.error('Erreur:', e.message);
  process.exit(1);
});
