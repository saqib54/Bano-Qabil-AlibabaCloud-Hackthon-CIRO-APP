/**
 * CIRO demo seed — creates realistic demo data so dashboards and
 * maps look alive immediately. Uses development-only credentials.
 *
 * Run: npm run db:seed
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../connection');
const migrate = require('../migrate');

const DEMO_PASSWORD = 'Ciro@1234';
const ADMIN_PASSWORD = 'saqib@23';

const DEPARTMENTS = [
  { name: 'Rescue 1122', code: 'RESCUE_1122', description: 'Emergency medical and rescue response', contact: '1122' },
  { name: 'Fire Department', code: 'FIRE', description: 'Fire suppression and rescue operations', contact: '16' },
  { name: 'Traffic Police', code: 'TRAFFIC_POLICE', description: 'Traffic management and road safety', contact: '1915' },
  { name: 'Police', code: 'POLICE', description: 'Law enforcement and public security', contact: '15' },
  { name: 'WAPDA', code: 'WAPDA', description: 'Power and utility outage response', contact: '118' },
  { name: 'Medical Team', code: 'MEDICAL', description: 'Field medical units and ambulances', contact: '1166' }
];

const ADMIN = { fullName: 'Muhammad Saqib Ali', email: 'msaqibali433@gmail.com', phone: '+92 300 1110001' };

const STAFF = [
  { fullName: 'Ahmed Khan', email: 'responder@ciro.demo', dept: 'RESCUE_1122', designation: 'Rescue Officer' },
  { fullName: 'Bilal Hussain', email: 'bilal.hussain@ciro.demo', dept: 'RESCUE_1122', designation: 'Rescue Officer' },
  { fullName: 'Sana Tariq', email: 'sana.tariq@ciro.demo', dept: 'FIRE', designation: 'Fire Squad Lead' },
  { fullName: 'Usman Riaz', email: 'usman.riaz@ciro.demo', dept: 'FIRE', designation: 'Firefighter' },
  { fullName: 'Imran Shaikh', email: 'imran.shaikh@ciro.demo', dept: 'TRAFFIC_POLICE', designation: 'Traffic Warden' },
  { fullName: 'Nadia Perveen', email: 'nadia.perveen@ciro.demo', dept: 'POLICE', designation: 'Sub Inspector' },
  { fullName: 'Kashif Mehmood', email: 'kashif.mehmood@ciro.demo', dept: 'WAPDA', designation: 'Line Engineer' },
  { fullName: 'Dr. Hira Baig', email: 'hira.baig@ciro.demo', dept: 'MEDICAL', designation: 'Field Doctor' },
  { fullName: 'Farhan Ali', email: 'farhan.ali@ciro.demo', dept: 'MEDICAL', designation: 'Paramedic' },
  { fullName: 'Zainab Gul', email: 'zainab.gul@ciro.demo', dept: 'RESCUE_1122', designation: 'Rescue Officer' }
];

const CITIZENS = [
  { fullName: 'Citizen Demo', email: 'citizen@ciro.demo', phone: '+92 301 2220001' },
  { fullName: 'Ali Raza', email: 'ali.raza@example.com', phone: '+92 302 2220002' },
  { fullName: 'Mariam Noor', email: 'mariam.noor@example.com', phone: '+92 303 2220003' },
  { fullName: 'Hamza Iqbal', email: 'hamza.iqbal@example.com', phone: '+92 304 2220004' },
  { fullName: 'Fatima Zahra', email: 'fatima.zahra@example.com', phone: '+92 305 2220005' }
];

const EMERGENCY_CONTACTS = [
  { name: 'Rescue 1122', number: '1122', category: 'RESCUE', region: 'Pakistan' },
  { name: 'Police', number: '15', category: 'SECURITY', region: 'Pakistan' },
  { name: 'Fire Brigade', number: '16', category: 'FIRE', region: 'Pakistan' },
  { name: 'Edhi Ambulance', number: '115', category: 'MEDICAL', region: 'Pakistan' },
  { name: 'WAPDA Complaints', number: '118', category: 'POWER', region: 'Pakistan' }
];

function seed() {
  migrate();

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  db.transaction(() => {
    // Idempotent: clear demo-managed rows before seeding
    db.exec(`
      DELETE FROM refresh_tokens;
      DELETE FROM notifications;
      DELETE FROM emergency_broadcasts;
      DELETE FROM shelters;
      DELETE FROM incident_situation_logs;
      DELETE FROM incident_status_history;
      DELETE FROM incident_media;
      DELETE FROM incidents;
      DELETE FROM staff_profiles;
      DELETE FROM users;
      DELETE FROM departments;
      DELETE FROM emergency_contacts;
      DELETE FROM audit_logs;
    `);

    const insertUser = db.prepare(`
      INSERT INTO users (id, full_name, email, phone, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertDept = db.prepare(`
      INSERT INTO departments (id, name, code, description, contact)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertStaffProfile = db.prepare(`
      INSERT INTO staff_profiles (user_id, department_id, designation, duty_status, current_lat, current_lng, location_updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const insertContact = db.prepare(`
      INSERT INTO emergency_contacts (id, name, number, category, region)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Departments
    const deptIds = {};
    for (const d of DEPARTMENTS) {
      const id = crypto.randomUUID();
      deptIds[d.code] = id;
      insertDept.run(id, d.name, d.code, d.description, d.contact);
    }

    // Admin (dedicated credentials — not exposed to the public)
    const adminId = crypto.randomUUID();
    const adminHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    insertUser.run(adminId, ADMIN.fullName, ADMIN.email, ADMIN.phone, adminHash, 'ADMIN');

    // Staff — with demo locations near Sialkot
    const STAFF_LOCATIONS = [
      [32.4985, 74.5380], [32.5010, 74.5420], [32.4920, 74.5540], [32.4890, 74.5510],
      [32.5050, 74.5320], [32.5080, 74.5450], [32.4950, 74.5280], [32.5030, 74.5400],
      [32.4970, 74.5360], [32.5060, 74.5390]
    ];
    const staffIds = {};
    STAFF.forEach((s, i) => {
      const id = crypto.randomUUID();
      staffIds[s.email] = id;
      insertUser.run(id, s.fullName, s.email, '+92 310 000' + String(i).padStart(4, '0'), passwordHash, 'STAFF');
      const dutyStatus = i % 2 === 0 ? 'ON_DUTY' : 'OFF_DUTY';
      const loc = STAFF_LOCATIONS[i] || [null, null];
      insertStaffProfile.run(
        id, deptIds[s.dept], s.designation, dutyStatus,
        dutyStatus === 'ON_DUTY' ? loc[0] : null,
        dutyStatus === 'ON_DUTY' ? loc[1] : null
      );
    });

    // Citizens
    const citizenIds = {};
    for (const c of CITIZENS) {
      const id = crypto.randomUUID();
      citizenIds[c.email] = id;
      insertUser.run(id, c.fullName, c.email, c.phone, passwordHash, 'PUBLIC');
    }

    // Emergency contacts
    for (const ec of EMERGENCY_CONTACTS) {
      insertContact.run(crypto.randomUUID(), ec.name, ec.number, ec.category, ec.region);
    }

    // Demo incidents — dashboards and lists look alive immediately
    seedIncidents(citizenIds, deptIds, staffIds);

    // Notifications & broadcasts (Sprint 7)
    seedNotifications(citizenIds, staffIds, adminId);

    // Shelters & safe places (Sprint 8)
    seedShelters();

    // System settings & audit logs (Sprint 10)
    seedSettings();
    seedAuditLogs(adminId, citizenIds, staffIds);
  })();

  console.log('----------------------------------------------');
  console.log('CIRO demo data seeded successfully');
  console.log(`  Admin:   ${ADMIN.email} (official portal only)`);
  console.log(`  Staff:   ${STAFF[0].email}`);
  console.log(`  Citizen: ${CITIZENS[0].email}`);
  console.log(`  Staff/Citizen demo password: ${DEMO_PASSWORD}`);
  console.log('----------------------------------------------');
}

/**
 * Demo incidents spread across ALL workflow statuses (§76) so dashboards,
 * maps and lists look alive immediately. ~20 incidents with matching
 * status-history rows (powers the timeline UI).
 */
function seedIncidents(citizenIds, deptIds, staffIds) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const insertIncident = db.prepare(`
    INSERT INTO incidents (
      id, incident_number, reported_by, title, description, category, status,
      ai_recommended_severity, verified_severity, latitude, longitude,
      location_name, assigned_department_id, current_assignment_id,
      people_affected, contact_phone,
      resolution_notes, resolution_proof_url, resources_used, follow_up_required, resolved_by,
      created_at, updated_at, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, changed_by, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMedia = db.prepare(`
    INSERT INTO incident_media (id, incident_id, file_url, mime_type, size_bytes, kind)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertSituationLog = db.prepare(`
    INSERT INTO incident_situation_logs (id, incident_id, staff_id, note, image_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Spread reporters for realism
  const reporterEmails = [
    'citizen@ciro.demo', 'ali.raza@example.com', 'mariam.noor@example.com',
    'hamza.iqbal@example.com', 'fatima.zahra@example.com'
  ];

  const DEMO_INCIDENTS = [
    // ── REPORTED (3) ──
    {
      reporter: 'citizen@ciro.demo',
      title: 'Heavy flooding near main road',
      description: 'Heavy flooding has occurred near the main road. A vehicle appears trapped in water and the water level is still rising. Several bystanders are attempting to help.',
      category: 'FLOOD', status: 'REPORTED', aiSev: null, verSev: null,
      lat: 32.4942, lng: 74.5311, location: 'Main Road, Sialkot', affected: 12,
      hoursAgo: 1, history: [['REPORTED', 'Emergency report submitted by citizen']],
      hasImage: true
    },
    {
      reporter: 'fatima.zahra@example.com',
      title: 'Gas smell in residential lane',
      description: 'Strong gas smell near house no 14. Residents suspect a pipeline leak and have shut main valves. Children and elderly evacuated from nearby houses.',
      category: 'GAS_LEAK', status: 'REPORTED', aiSev: null, verSev: null,
      lat: 32.5024, lng: 74.5448, location: 'Model Town, Sialkot', affected: 8,
      hoursAgo: 0.5, history: [['REPORTED', 'Emergency report submitted by citizen']]
    },
    {
      reporter: 'ali.raza@example.com',
      title: 'Fallen tree blocking school road',
      description: 'A large tree has fallen across the road near Government Primary School. Children are unable to cross and traffic is backing up.',
      category: 'EXTREME_WEATHER', status: 'REPORTED', aiSev: null, verSev: null,
      lat: 32.5100, lng: 74.5350, location: 'School Road, Sialkot', affected: 50,
      hoursAgo: 0.2, history: [['REPORTED', 'Emergency report submitted by citizen']]
    },

    // ── UNDER_REVIEW (2) ──
    {
      reporter: 'ali.raza@example.com',
      title: 'Shop fire in Saddar Bazaar',
      description: 'Fire has broken out in a clothing shop. Smoke is visible from a distance and shopkeepers are evacuating. The fire appears to be spreading to adjacent shops.',
      category: 'FIRE', status: 'UNDER_REVIEW', aiSev: 'HIGH', verSev: null,
      lat: 32.4901, lng: 74.5556, location: 'Saddar Bazaar, Sialkot', affected: 20,
      hoursAgo: 3, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing the report']
      ],
      hasImage: true
    },
    {
      reporter: 'hamza.iqbal@example.com',
      title: 'Water main burst near hospital',
      description: 'A water main has burst on the road outside DHQ Hospital. Flooding is reaching the hospital emergency entrance. Ambulances are having trouble entering.',
      category: 'FLOOD', status: 'UNDER_REVIEW', aiSev: 'HIGH', verSev: null,
      lat: 32.4980, lng: 74.5400, location: 'Hospital Road, Sialkot', affected: 40,
      hoursAgo: 2, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing the report']
      ]
    },

    // ── ASSIGNED (3) ──
    {
      reporter: 'mariam.noor@example.com',
      title: 'Two-vehicle accident on Daska Road',
      description: 'Two vehicles collided near the turn. At least two people appear injured and traffic is blocked on both lanes.',
      category: 'ACCIDENT', status: 'ASSIGNED', aiSev: 'HIGH', verSev: 'HIGH',
      lat: 32.4764, lng: 74.5593, location: 'Daska Road, Sialkot', affected: 4,
      dept: 'RESCUE_1122', assignTo: 'responder@ciro.demo',
      hoursAgo: 5, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing the report'],
        ['VERIFIED', 'Severity verified as HIGH by command staff'],
        ['ASSIGNED', 'Rescue 1122 team assigned — Ahmed Khan dispatched']
      ],
      hasImage: true
    },
    {
      reporter: 'citizen@ciro.demo',
      title: 'Building wall partially collapsed',
      description: 'An old building wall has partially collapsed near the bazaar. Debris is blocking the footpath and people are trapped on the ground floor.',
      category: 'BUILDING_COLLAPSE', status: 'ASSIGNED', aiSev: 'CRITICAL', verSev: 'CRITICAL',
      lat: 32.4910, lng: 74.5520, location: 'Bazaar Area, Sialkot', affected: 6,
      dept: 'RESCUE_1122', assignTo: 'bilal.hussain@ciro.demo',
      hoursAgo: 4, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing the report'],
        ['VERIFIED', 'Verified as CRITICAL by command center'],
        ['ASSIGNED', 'Rescue 1122 and Fire Department assigned']
      ]
    },
    {
      reporter: 'fatima.zahra@example.com',
      title: 'Armed robbery at jewelry shop',
      description: 'Armed individuals entered a jewelry shop in Kashmiri Mohalla. Shopkeeper triggered silent alarm. Police response needed urgently.',
      category: 'SECURITY', status: 'ASSIGNED', aiSev: 'HIGH', verSev: 'HIGH',
      lat: 32.4935, lng: 74.5480, location: 'Kashmiri Mohalla, Sialkot', affected: 3,
      dept: 'POLICE', assignTo: 'nadia.perveen@ciro.demo',
      hoursAgo: 2.5, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing the report'],
        ['VERIFIED', 'Security threat verified by command center'],
        ['ASSIGNED', 'Police unit assigned — Sub Inspector Nadia Perveen']
      ]
    },

    // ── EN_ROUTE (2) ──
    {
      reporter: 'ali.raza@example.com',
      title: 'Motorcycle accident near cantonment',
      description: 'A motorcycle hit a pedestrian near the cantonment gate. The pedestrian is unconscious and bleeding. Bystanders are providing first aid.',
      category: 'ACCIDENT', status: 'EN_ROUTE', aiSev: 'HIGH', verSev: 'HIGH',
      lat: 32.5050, lng: 74.5200, location: 'Cantonment Gate, Sialkot', affected: 2,
      dept: 'RESCUE_1122', assignTo: 'bilal.hussain@ciro.demo',
      hoursAgo: 3.5, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing the report'],
        ['VERIFIED', 'Verified as HIGH priority'],
        ['ASSIGNED', 'Rescue 1122 team assigned'],
        ['ACCEPTED', 'Responder Bilal Hussain accepted the assignment'],
        ['EN_ROUTE', 'Rescue team is en route to the location']
      ]
    },
    {
      reporter: 'hamza.iqbal@example.com',
      title: 'Kitchen fire in apartment complex',
      description: 'Kitchen fire on 3rd floor of Al-Noor Apartments. Residents on upper floors are evacuating via stairs. Smoke spreading through hallways.',
      category: 'FIRE', status: 'EN_ROUTE', aiSev: 'HIGH', verSev: 'HIGH',
      lat: 32.4880, lng: 74.5610, location: 'Al-Noor Apartments, Sialkot', affected: 15,
      dept: 'FIRE', assignTo: 'sana.tariq@ciro.demo',
      hoursAgo: 1.5, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing'],
        ['VERIFIED', 'Fire emergency verified'],
        ['ASSIGNED', 'Fire Department dispatched — Sana Tariq leading'],
        ['ACCEPTED', 'Fire squad accepted the mission'],
        ['EN_ROUTE', 'Fire truck en route — ETA 8 minutes']
      ]
    },

    // ── ON_SCENE (2) ──
    {
      reporter: 'mariam.noor@example.com',
      title: 'Road cave-in near construction site',
      description: 'A section of road has caved in near the new flyover construction. A motorcycle fell into the sinkhole. Traffic is diverted.',
      category: 'ACCIDENT', status: 'ON_SCENE', aiSev: 'MEDIUM', verSev: 'MEDIUM',
      lat: 32.5000, lng: 74.5300, location: 'Flyover Site, Sialkot', affected: 3,
      dept: 'RESCUE_1122', assignTo: 'responder@ciro.demo',
      situationLogs: [
        ['Unit dispatched from base station', 25],
        ['Responder en route — ETA 12 mins', 30],
        ['Arrived on scene — assessing damage', 45]
      ],
      hoursAgo: 6, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing'],
        ['VERIFIED', 'Verified by command staff'],
        ['ASSIGNED', 'Rescue 1122 assigned'],
        ['ACCEPTED', 'Assignment accepted'],
        ['EN_ROUTE', 'Team dispatched'],
        ['ON_SCENE', 'Team arrived on scene — assessing the situation']
      ]
    },
    {
      reporter: 'citizen@ciro.demo',
      title: 'Power lines down after storm',
      description: 'Multiple power lines are down on Defence Road after the storm. Sparks visible and road is flooded. Extremely dangerous situation for pedestrians.',
      category: 'POWER_OUTAGE', status: 'ON_SCENE', aiSev: 'HIGH', verSev: 'HIGH',
      lat: 32.5120, lng: 74.5180, location: 'Defence Road, Sialkot', affected: 100,
      dept: 'WAPDA', assignTo: 'kashif.mehmood@ciro.demo',
      situationLogs: [
        ['WAPDA crew dispatched with isolation equipment', 20],
        ['Arrived on scene — power lines confirmed live', 40],
        ['Power isolation in progress — road secured', 60]
      ],
      hoursAgo: 7, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing'],
        ['VERIFIED', 'Verified as HIGH — public safety risk'],
        ['ASSIGNED', 'WAPDA team assigned — Kashif Mehmood'],
        ['ACCEPTED', 'Assignment accepted by WAPDA'],
        ['EN_ROUTE', 'WAPDA crew dispatched with equipment'],
        ['ON_SCENE', 'WAPDA team on scene — power isolation in progress']
      ]
    },

    // ── RESOLUTION_SUBMITTED (2) ──
    {
      reporter: 'ali.raza@example.com',
      title: 'Car stuck in underpass flooding',
      description: 'A car is stuck in the Railway Road underpass due to heavy flooding. Two occupants inside, water level rising. Rescue needed urgently.',
      category: 'FLOOD', status: 'RESOLUTION_SUBMITTED', aiSev: 'CRITICAL', verSev: 'CRITICAL',
      lat: 32.4850, lng: 74.5500, location: 'Railway Road Underpass, Sialkot', affected: 2,
      dept: 'RESCUE_1122', assignTo: 'zainab.gul@ciro.demo',
      resolutionNotes: 'Both occupants rescued safely using rescue boat. Water pumped out of underpass. Road cleared for traffic.',
      resourcesUsed: 'Rescue boat, water pump, 4 rescue personnel',
      followUp: true,
      hasResolutionProof: true,
      hoursAgo: 8, hoursToResolve: 3,
      history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing'],
        ['VERIFIED', 'Verified as CRITICAL — lives at risk'],
        ['ASSIGNED', 'Rescue 1122 assigned — Zainab Gul'],
        ['ACCEPTED', 'Assignment accepted'],
        ['EN_ROUTE', 'Rescue boat dispatched'],
        ['ON_SCENE', 'Team arrived — water extraction in progress'],
        ['RESOLUTION_SUBMITTED', 'Both occupants rescued safely. Water being pumped out.']
      ],
      hasImage: true
    },
    {
      reporter: 'fatima.zahra@example.com',
      title: 'Medical emergency at school',
      description: 'A student collapsed during assembly at City Public School. Possible cardiac issue. School nurse providing CPR. Ambulance needed immediately.',
      category: 'MEDICAL', status: 'RESOLUTION_SUBMITTED', aiSev: 'CRITICAL', verSev: 'CRITICAL',
      lat: 32.4970, lng: 74.5460, location: 'City Public School, Sialkot', affected: 1,
      dept: 'MEDICAL', assignTo: 'hira.baig@ciro.demo',
      resolutionNotes: 'Patient stabilized on scene. CPR administered successfully. Transported to DHQ Hospital via ambulance. Condition stable, cardiac monitoring ongoing.',
      resourcesUsed: 'Ambulance, defibrillator, cardiac monitor',
      followUp: false,
      hasResolutionProof: true,
      hoursAgo: 5, hoursToResolve: 2,
      history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing'],
        ['VERIFIED', 'Medical emergency verified'],
        ['ASSIGNED', 'Medical Team assigned — Dr. Hira Baig'],
        ['ACCEPTED', 'Medical team accepted'],
        ['EN_ROUTE', 'Ambulance dispatched'],
        ['ON_SCENE', 'Medical team on scene — providing care'],
        ['RESOLUTION_SUBMITTED', 'Patient stabilized and transported to DHQ Hospital. Condition stable.']
      ]
    },

    // ── RESOLVED (5) ──
    {
      reporter: 'hamza.iqbal@example.com',
      title: 'Street transformer sparking',
      description: 'A street transformer is sparking near the school gate. Residents are keeping children indoors.',
      category: 'POWER_OUTAGE', status: 'RESOLVED', aiSev: 'MEDIUM', verSev: 'MEDIUM',
      lat: 32.5083, lng: 74.5285, location: 'Cantt Area, Sialkot', affected: 30,
      dept: 'WAPDA',
      hoursAgo: 26, hoursToResolve: 4, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing the report'],
        ['VERIFIED', 'Verified by command staff'],
        ['ASSIGNED', 'WAPDA team assigned'],
        ['ACCEPTED', 'Assignment accepted by Kashif Mehmood'],
        ['EN_ROUTE', 'WAPDA crew dispatched'],
        ['ON_SCENE', 'WAPDA team on scene'],
        ['RESOLUTION_SUBMITTED', 'Faulty transformer replaced. Power restored.'],
        ['RESOLVED', 'Resolution approved by command center']
      ]
    },
    {
      reporter: 'citizen@ciro.demo',
      title: 'Water logging in Kashmiri Mohalla',
      description: 'Severe water logging after overnight rain. Streets flooded up to 2 feet. Residents unable to leave homes.',
      category: 'FLOOD', status: 'RESOLVED', aiSev: 'MEDIUM', verSev: 'MEDIUM',
      lat: 32.4930, lng: 74.5490, location: 'Kashmiri Mohalla, Sialkot', affected: 60,
      dept: 'RESCUE_1122',
      hoursAgo: 48, hoursToResolve: 12, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing'],
        ['VERIFIED', 'Verified as MEDIUM'],
        ['ASSIGNED', 'Rescue 1122 team assigned'],
        ['ACCEPTED', 'Assignment accepted'],
        ['EN_ROUTE', 'Team dispatched with boats'],
        ['ON_SCENE', 'Rescue operations underway'],
        ['RESOLUTION_SUBMITTED', 'All families evacuated to safe zone. Water receding.'],
        ['RESOLVED', 'Resolution approved — all residents safe']
      ]
    },
    {
      reporter: 'mariam.noor@example.com',
      title: 'Road accident near railway crossing',
      description: 'A rickshaw was hit by a car at the railway crossing. Two passengers injured. Driver fled the scene.',
      category: 'ACCIDENT', status: 'RESOLVED', aiSev: 'HIGH', verSev: 'HIGH',
      lat: 32.4820, lng: 74.5540, location: 'Railway Crossing, Sialkot', affected: 2,
      dept: 'RESCUE_1122',
      hoursAgo: 72, hoursToResolve: 6, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing'],
        ['VERIFIED', 'Verified as HIGH'],
        ['ASSIGNED', 'Rescue 1122 assigned'],
        ['ACCEPTED', 'Accepted by Ahmed Khan'],
        ['EN_ROUTE', 'Team dispatched'],
        ['ON_SCENE', 'Team on scene — providing first aid'],
        ['RESOLUTION_SUBMITTED', 'Both injured transported to hospital. Police informed for hit-and-run.'],
        ['RESOLVED', 'Resolution approved. Police FIR registered.']
      ]
    },
    {
      reporter: 'ali.raza@example.com',
      title: 'Fire at warehouse near industrial area',
      description: 'Large fire at an abandoned warehouse. No people inside but fire spreading to nearby structures. Thick black smoke visible for miles.',
      category: 'FIRE', status: 'RESOLVED', aiSev: 'HIGH', verSev: 'HIGH',
      lat: 32.4750, lng: 74.5650, location: 'Industrial Area, Sialkot', affected: 0,
      dept: 'FIRE',
      hoursAgo: 96, hoursToResolve: 8, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing'],
        ['VERIFIED', 'Fire emergency verified'],
        ['ASSIGNED', 'Fire Department dispatched'],
        ['ACCEPTED', 'Sana Tariq accepted assignment'],
        ['EN_ROUTE', 'Two fire trucks dispatched'],
        ['ON_SCENE', 'Fire suppression in progress'],
        ['RESOLUTION_SUBMITTED', 'Fire extinguished. No casualties. Area secured.'],
        ['RESOLVED', 'Resolution approved — fire fully contained']
      ]
    },
    {
      reporter: 'fatima.zahra@example.com',
      title: 'Elderly citizen heatstroke',
      description: 'An elderly man collapsed from heatstroke at the bus stop near Murray College. Bystanders moved him to shade. Needs medical attention.',
      category: 'MEDICAL', status: 'RESOLVED', aiSev: 'MEDIUM', verSev: 'MEDIUM',
      lat: 32.5010, lng: 74.5370, location: 'Murray College Bus Stop, Sialkot', affected: 1,
      dept: 'MEDICAL',
      hoursAgo: 50, hoursToResolve: 2, history: [
        ['REPORTED', 'Emergency report submitted by citizen'],
        ['UNDER_REVIEW', 'Command center reviewing'],
        ['VERIFIED', 'Medical emergency verified'],
        ['ASSIGNED', 'Medical team assigned — Farhan Ali'],
        ['ACCEPTED', 'Paramedic accepted assignment'],
        ['EN_ROUTE', 'Ambulance dispatched'],
        ['ON_SCENE', 'Paramedic on scene — providing care'],
        ['RESOLUTION_SUBMITTED', 'Patient treated on site. Vitals stable. Advised hospital follow-up.'],
        ['RESOLVED', 'Resolution approved — patient safe']
      ]
    }
  ];

  DEMO_INCIDENTS.forEach((inc, idx) => {
    const incidentId = crypto.randomUUID();
    const createdAt = new Date(Date.now() - inc.hoursAgo * 3600 * 1000);
    const resolvedAt = inc.hoursToResolve
      ? new Date(createdAt.getTime() + inc.hoursToResolve * 3600 * 1000)
      : null;
    const createdIso = createdAt.toISOString().replace('T', ' ').slice(0, 19);

    // Determine resolved_by — for RESOLVED and RESOLUTION_SUBMITTED, pick the assigned staff
    const resolvedBy = (inc.status === 'RESOLVED' || inc.status === 'RESOLUTION_SUBMITTED') && inc.assignTo
      ? staffIds[inc.assignTo]
      : null;

    insertIncident.run(
      incidentId,
      `INC-${day}-${String(idx + 1).padStart(4, '0')}`,
      citizenIds[inc.reporter],
      inc.title,
      inc.description,
      inc.category,
      inc.status,
      inc.aiSev,
      inc.verSev,
      inc.lat,
      inc.lng,
      inc.location,
      inc.dept ? deptIds[inc.dept] : null,
      inc.assignTo ? staffIds[inc.assignTo] : null,
      inc.affected,
      '+92 300 0000000',
      inc.resolutionNotes || null,
      inc.hasResolutionProof ? `/uploads/incidents/proof-${idx + 1}.jpg` : null,
      inc.resourcesUsed || null,
      inc.followUp ? 1 : 0,
      resolvedBy,
      createdIso,
      createdIso,
      resolvedAt ? resolvedAt.toISOString().replace('T', ' ').slice(0, 19) : null
    );

    inc.history.forEach(([status, notes], hIdx) => {
      const at = new Date(createdAt.getTime() + hIdx * 20 * 60 * 1000);
      insertHistory.run(
        crypto.randomUUID(),
        incidentId,
        hIdx === 0 ? null : inc.history[hIdx - 1][0],
        status,
        hIdx === 0 ? citizenIds[inc.reporter] : null,
        notes,
        at.toISOString().replace('T', ' ').slice(0, 19)
      );
    });

    // Situation logs for ON_SCENE incidents
    if (inc.situationLogs && inc.assignTo) {
      inc.situationLogs.forEach(([note, minutesOffset]) => {
        const at = new Date(createdAt.getTime() + minutesOffset * 60 * 1000);
        insertSituationLog.run(
          crypto.randomUUID(),
          incidentId,
          staffIds[inc.assignTo],
          note,
          null,
          at.toISOString().replace('T', ' ').slice(0, 19)
        );
      });
    }

    // Report image for incidents marked with hasImage
    if (inc.hasImage) {
      insertMedia.run(
        crypto.randomUUID(),
        incidentId,
        `/uploads/incidents/demo-${idx + 1}.jpg`,
        'image/jpeg',
        245000,
        'REPORT'
      );
    }

    // Resolution proof image for RESOLUTION_SUBMITTED incidents
    if (inc.hasResolutionProof) {
      insertMedia.run(
        crypto.randomUUID(),
        incidentId,
        `/uploads/incidents/proof-${idx + 1}.jpg`,
        'image/jpeg',
        312000,
        'RESOLUTION'
      );
    }
  });

  console.log(`  Incidents: ${DEMO_INCIDENTS.length} demo incidents seeded`);
}

/**
 * Seed notifications and emergency broadcasts for demo realism (Sprint 7).
 */
function seedNotifications(citizenIds, staffIds, adminId) {
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, severity, is_read, related_entity, related_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBroadcast = db.prepare(`
    INSERT INTO emergency_broadcasts (id, title, message, severity, target_audience, regions, created_by, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const ago = (hours) => new Date(now - hours * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  // ── Staff notifications ──
  const staffEmails = Object.keys(staffIds);
  const staffNotifs = [
    { email: 'responder@ciro.demo', type: 'INCIDENT', title: 'New assignment', message: 'You have been assigned to: Two-vehicle accident on Daska Road', severity: 'HIGH', read: 0, hours: 5 },
    { email: 'responder@ciro.demo', type: 'STATUS_CHANGE', title: 'Status updated', message: 'Incident INC-0001 has been escalated to HIGH severity', severity: 'MEDIUM', read: 1, hours: 8 },
    { email: 'responder@ciro.demo', type: 'SYSTEM', title: 'Duty shift reminder', message: 'Your shift starts in 30 minutes. Please check in when ready.', severity: 'INFO', read: 1, hours: 12 },
    { email: 'bilal.hussain@ciro.demo', type: 'INCIDENT', title: 'New assignment', message: 'You have been assigned to: Building wall partially collapsed', severity: 'CRITICAL', read: 0, hours: 4 },
    { email: 'sana.tariq@ciro.demo', type: 'INCIDENT', title: 'New assignment', message: 'Kitchen fire at Al-Noor Apartments — you are the squad lead', severity: 'HIGH', read: 0, hours: 1.5 },
    { email: 'kashif.mehmood@ciro.demo', type: 'INCIDENT', title: 'Power line emergency', message: 'Power lines down on Defence Road — immediate response required', severity: 'CRITICAL', read: 0, hours: 7 },
    { email: 'nadia.perveen@ciro.demo', type: 'INCIDENT', title: 'Security alert', message: 'Armed robbery reported at Kashmiri Mohalla jewelry shop', severity: 'CRITICAL', read: 0, hours: 2.5 }
  ];

  staffNotifs.forEach((n) => {
    insertNotif.run(
      crypto.randomUUID(), staffIds[n.email], n.type, n.title, n.message,
      n.severity, n.read, 'incident', null, ago(n.hours)
    );
  });

  // ── Citizen notifications ──
  const citizenNotifs = [
    { email: 'citizen@ciro.demo', type: 'STATUS_CHANGE', title: 'Report update', message: 'Your flood report has been verified and a rescue team is assigned.', severity: 'MEDIUM', read: 0, hours: 3 },
    { email: 'citizen@ciro.demo', type: 'SYSTEM', title: 'Welcome to CIRO', message: 'Your emergency reporting account is active. Report incidents anytime.', severity: 'INFO', read: 1, hours: 48 },
    { email: 'ali.raza@example.com', type: 'STATUS_CHANGE', title: 'Resolution submitted', message: 'The rescue team has submitted a resolution for your car flood report.', severity: 'MEDIUM', read: 0, hours: 2 },
    { email: 'mariam.noor@example.com', type: 'STATUS_CHANGE', title: 'Team on scene', message: 'Rescue team has arrived at the road cave-in site.', severity: 'MEDIUM', read: 0, hours: 4 }
  ];

  citizenNotifs.forEach((n) => {
    insertNotif.run(
      crypto.randomUUID(), citizenIds[n.email], n.type, n.title, n.message,
      n.severity, n.read, 'incident', null, ago(n.hours)
    );
  });

  // ── Emergency broadcasts ──
  const broadcasts = [
    {
      title: 'Heavy Rain Warning — Sialkot District',
      message: 'Pakistan Meteorological Department has issued a heavy rain warning for Sialkot district. Residents in low-lying areas should prepare for possible flooding. Keep emergency kits ready and follow evacuation instructions if issued.',
      severity: 'HIGH', audience: 'ALL', active: 1, hours: 2
    },
    {
      title: 'Road Closure: Daska Road near Railway Crossing',
      message: 'Daska Road is temporarily closed near the railway crossing due to an accident. Traffic is being diverted through alternate routes. Expected to reopen in 3 hours.',
      severity: 'MEDIUM', audience: 'ALL', active: 1, hours: 5
    },
    {
      title: 'Power Restoration Schedule — Cantt Area',
      message: 'WAPDA has scheduled power restoration for Cantonment area between 6 PM and 8 PM today. Brief outages may occur during the switchover.',
      severity: 'LOW', audience: 'PUBLIC', active: 1, hours: 10
    },
    {
      title: 'All Responders: Mandatory Briefing at 1800hrs',
      message: 'All on-duty responders must attend the situation briefing at the command center at 1800 hours today. Multiple active incidents require coordinated response.',
      severity: 'HIGH', audience: 'STAFF', active: 1, hours: 1
    },
    {
      title: 'Heatwave Advisory — Stay Hydrated',
      message: 'Temperature expected to reach 42°C today. Citizens are advised to stay hydrated, avoid outdoor activities between 11 AM and 4 PM, and report any heat-related emergencies immediately.',
      severity: 'MEDIUM', audience: 'ALL', active: 0, hours: 24
    }
  ];

  broadcasts.forEach((b) => {
    insertBroadcast.run(
      crypto.randomUUID(), b.title, b.message, b.severity,
      b.audience, 'Sialkot', adminId, b.active, ago(b.hours)
    );
  });

  // Fan-out broadcast notifications to users
  const broadcastNotifs = broadcasts.filter((b) => b.active);
  broadcastNotifs.forEach((b) => {
    // For each active broadcast, create notifications for matching users
    const audienceWhere = b.audience === 'ALL'
      ? 'SELECT id FROM users WHERE is_active = 1'
      : b.audience === 'PUBLIC'
        ? "SELECT id FROM users WHERE role = 'PUBLIC' AND is_active = 1"
        : "SELECT id FROM users WHERE role = 'STAFF' AND is_active = 1";

    const users = db.prepare(audienceWhere).all();
    users.forEach((u) => {
      insertNotif.run(
        crypto.randomUUID(), u.id, 'BROADCAST', b.title, b.message,
        b.severity, 0, 'broadcast', null, ago(b.hours)
      );
    });
  });

  console.log(`  Notifications: 11 direct + broadcast fan-out`);
  console.log(`  Broadcasts: 5 emergency broadcasts seeded`);
  console.log(`  Shelters: 8 safe places seeded`);
}

/**
 * Seed system settings (Sprint 10).
 */
function seedSettings() {
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
  `);
  const settings = [
    ['city_name', 'Sialkot'],
    ['region', 'Punjab, Pakistan'],
    ['default_radius_km', '25'],
    ['auto_assign_threshold', 'HIGH'],
    ['ai_analysis_enabled', 'true'],
    ['notification_broadcast_enabled', 'true'],
    ['map_default_lat', '32.5'],
    ['map_default_lng', '74.535'],
    ['map_default_zoom', '13'],
    ['max_file_upload_mb', '5'],
    ['incident_retention_days', '365'],
    ['session_timeout_minutes', '30']
  ];
  for (const [key, value] of settings) {
    upsert.run(key, value);
  }
  console.log(`  Settings: ${settings.length} system settings seeded`);
}

/**
 * Seed audit logs with realistic history (Sprint 10).
 */
function seedAuditLogs(adminId, citizenIds, staffIds) {
  const insert = db.prepare(`
    INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, previous_value, new_value, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const citizenArr = Object.values(citizenIds);
  const staffArr = Object.values(staffIds);
  const actions = [
    { actor: adminId, action: 'INCIDENT_VERIFY', entity: 'incident', hoursAgo: -2, meta: '{"severity":"HIGH"}' },
    { actor: adminId, action: 'INCIDENT_ASSIGN', entity: 'incident', hoursAgo: -4, meta: '{"department":"RESCUE_1122"}' },
    { actor: staffArr[0], action: 'STATUS_CHANGE', entity: 'incident', hoursAgo: -6, prev: 'ASSIGNED', next: 'ACCEPTED' },
    { actor: staffArr[0], action: 'STATUS_CHANGE', entity: 'incident', hoursAgo: -8, prev: 'ACCEPTED', next: 'EN_ROUTE' },
    { actor: staffArr[2], action: 'STATUS_CHANGE', entity: 'incident', hoursAgo: -10, prev: 'ASSIGNED', next: 'ACCEPTED' },
    { actor: adminId, action: 'INCIDENT_VERIFY', entity: 'incident', hoursAgo: -14, meta: '{"severity":"CRITICAL"}' },
    { actor: citizenArr[0], action: 'INCIDENT_REPORT', entity: 'incident', hoursAgo: -18 },
    { actor: adminId, action: 'STAFF_UPDATE', entity: 'staff_profile', hoursAgo: -24, meta: '{"field":"duty_status","value":"ON_DUTY"}' },
    { actor: adminId, action: 'BROADCAST_CREATE', entity: 'emergency_broadcast', hoursAgo: -30 },
    { actor: staffArr[4], action: 'RESOLUTION_SUBMIT', entity: 'incident', hoursAgo: -36 },
    { actor: adminId, action: 'RESOLUTION_APPROVE', entity: 'incident', hoursAgo: -40 },
    { actor: adminId, action: 'DEPARTMENT_CREATE', entity: 'department', hoursAgo: -48 },
    { actor: adminId, action: 'SHELTER_CREATE', entity: 'shelter', hoursAgo: -52 },
    { actor: citizenArr[1], action: 'INCIDENT_REPORT', entity: 'incident', hoursAgo: -60 },
    { actor: adminId, action: 'SETTINGS_UPDATE', entity: 'system_settings', hoursAgo: -72, next: 'city_name=Sialkot' },
    { actor: staffArr[0], action: 'STATUS_CHANGE', entity: 'incident', hoursAgo: -80, prev: 'EN_ROUTE', next: 'ON_SCENE' },
    { actor: adminId, action: 'INCIDENT_REANALYZE', entity: 'incident', hoursAgo: -96 },
    { actor: adminId, action: 'BROADCAST_CREATE', entity: 'emergency_broadcast', hoursAgo: -120 },
    { actor: staffArr[6], action: 'STATUS_CHANGE', entity: 'incident', hoursAgo: -144, prev: 'ON_SCENE', next: 'RESOLUTION_SUBMITTED' },
    { actor: adminId, action: 'INCIDENT_VERIFY', entity: 'incident', hoursAgo: -168, meta: '{"severity":"MEDIUM"}' }
  ];

  for (const a of actions) {
    insert.run(
      crypto.randomUUID(),
      a.actor || null,
      a.action,
      a.entity || null,
      a.entityId || null,
      a.prev || null,
      a.next || null,
      a.meta || null,
      `${a.hoursAgo} hours`
    );
  }
  console.log(`  Audit logs: ${actions.length} entries seeded`);
}

/**
 * Seed shelters and safe places in Sialkot (Sprint 8).
 */
function seedShelters() {
  const insertShelter = db.prepare(`
    INSERT INTO shelters (id, name, type, address, latitude, longitude, capacity, contact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const SHELTERS = [
    { name: 'DHQ Hospital Sialkot', type: 'HOSPITAL', address: 'Hospital Road, Sialkot', lat: 32.4980, lng: 74.5400, capacity: 200, contact: '052-4261234' },
    { name: 'Rescue 1122 Station', type: 'FIRE_STATION', address: 'Main Road, Sialkot Cantt', lat: 32.4945, lng: 74.5315, capacity: null, contact: '1122' },
    { name: 'Police Station Saddar', type: 'POLICE_STATION', address: 'Saddar Bazaar, Sialkot', lat: 32.4910, lng: 74.5550, capacity: null, contact: '15' },
    { name: 'Govt Girls School Shelter', type: 'SHELTER', address: 'School Road, Sialkot', lat: 32.5100, lng: 74.5355, capacity: 150, contact: '052-4264000' },
    { name: 'Edhi Centre Sialkot', type: 'SHELTER', address: 'Allama Iqbal Road, Sialkot', lat: 32.5020, lng: 74.5440, capacity: 100, contact: '115' },
    { name: 'Civil Hospital Daska', type: 'HOSPITAL', address: 'Daska Road, Sialkot', lat: 32.4870, lng: 74.5180, capacity: 80, contact: '052-6610123' },
    { name: 'Jinnah Park Evacuation Point', type: 'EVACUATION_POINT', address: 'Jinnah Park, Sialkot', lat: 32.5060, lng: 74.5380, capacity: 500, contact: null },
    { name: 'Medical Camp — Model Town', type: 'MEDICAL_CAMP', address: 'Model Town, Sialkot', lat: 32.5025, lng: 74.5450, capacity: 30, contact: '1166' }
  ];

  for (const s of SHELTERS) {
    insertShelter.run(crypto.randomUUID(), s.name, s.type, s.address, s.lat, s.lng, s.capacity, s.contact);
  }
}

// Only auto-run when executed directly (npm run db:seed). Imported modules
// (e.g. the boot-time bootstrap) decide themselves when to seed.
if (require.main === module) {
  seed();
}

module.exports = { seed };
