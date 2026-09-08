/**
 * seed.js — Standalone seed script
 * Inserts 50 realistic civic issues with category images into MongoDB.
 * Run once: node seed.js
 * Safe to re-run — clears only previously seeded records.
 * Does NOT affect any existing code or routes.
 */

// Use public DNS to resolve MongoDB Atlas SRV records (same fix as server.js)
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const path     = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Issue = require('./models/Issue');

// Two images per category — alternated across issues of the same category
const CATEGORY_IMAGES = {
  'Pothole':       ['seed-pothole.jpg',      'seed-pothole-2.jpg'],
  'Garbage':       ['seed-garbage.jpg',      'seed-garbage-2.jpg'],
  'Streetlight':   ['seed-streetlight.jpg',  'seed-streetlight-2.jpg'],
  'Drainage':      ['seed-drainage.jpg',     'seed-drainage-2.jpg'],
  'Water Leakage': ['seed-water.jpg',        'seed-water-2.jpg'],
  'Other':         ['seed-other.jpg',        'seed-other-2.jpg'],
};

const ISSUES = [
  // ── Pothole ──────────────────────────────────────────────────────────────
  {
    title: 'Deep pothole on Anna Salai near Spencer Plaza',
    description: 'A large and deep pothole has formed on Anna Salai near Spencer Plaza. It is about 2 feet wide and 8 inches deep. Multiple two-wheelers have had accidents here in the past week. Urgent repair required before the monsoon widens it further.',
    category: 'Pothole',
    location: 'Anna Salai, near Spencer Plaza, Chennai',
    coords: { lat: 13.0645, lng: 80.2784 },
    reportedBy: 'Ramesh Kumar',
    status: 'Reported',
  },
  {
    title: 'Series of potholes on Velachery Main Road',
    description: 'There are at least 6-7 potholes in a stretch of 200 metres on Velachery Main Road. The road surface has completely eroded after heavy rains. Traffic slows to a crawl and vehicles are getting damaged.',
    category: 'Pothole',
    location: 'Velachery Main Road, Chennai',
    coords: { lat: 12.9815, lng: 80.2180 },
    reportedBy: 'Priya Sundaram',
    status: 'In Progress',
  },
  {
    title: 'Pothole causing waterlogging at OMR junction',
    description: 'A pothole at the OMR-Perungudi junction collects rainwater and is invisible to drivers at night. Two bikes have already slipped. The surrounding area also floods during light rain.',
    category: 'Pothole',
    location: 'OMR Perungudi Junction, Chennai',
    coords: { lat: 12.9602, lng: 80.2450 },
    reportedBy: 'Karthik Selvan',
    status: 'Reported',
  },
  {
    title: 'Pothole near school gate on Poonamallee High Road',
    description: 'A pothole has developed right in front of St. Joseph School gate on Poonamallee High Road. School children and parents are at risk every morning. The road repair was done poorly last year and has eroded again.',
    category: 'Pothole',
    location: 'Poonamallee High Road, near St. Joseph School, Chennai',
    coords: { lat: 13.0699, lng: 80.2065 },
    reportedBy: 'Meena Rajan',
    status: 'Resolved',
  },
  {
    title: 'Pothole on Ambattur Industrial Estate road',
    description: 'A massive pothole has formed inside Ambattur Industrial Estate near the SIDCO gate. Heavy trucks that pass frequently are making it worse every day. The entire lane needs resurfacing.',
    category: 'Pothole',
    location: 'SIDCO Gate, Ambattur Industrial Estate, Chennai',
    coords: { lat: 13.1143, lng: 80.1548 },
    reportedBy: 'Suresh Babu',
    status: 'In Progress',
  },
  {
    title: 'Crater-sized pothole near Tambaram bus terminus',
    description: 'Near Tambaram bus terminus there is a very large pothole that has been there for three months. Buses, autos, and bikes all have to swerve suddenly. A minor accident occurred last week due to this.',
    category: 'Pothole',
    location: 'Tambaram Bus Terminus, Chennai',
    coords: { lat: 12.9249, lng: 80.1000 },
    reportedBy: 'Vijay Anand',
    status: 'Reported',
  },
  {
    title: 'Pothole filled with mud on Guindy flyover approach',
    description: 'The approach road to the Guindy flyover has a pothole filled with muddy water. Motorists cannot gauge the depth and often get stuck or fall. Immediate patching is needed.',
    category: 'Pothole',
    location: 'Guindy Flyover Approach Road, Chennai',
    coords: { lat: 13.0067, lng: 80.2206 },
    reportedBy: 'Lakshmi Narayanan',
    status: 'Reported',
  },
  {
    title: 'Pothole damaging vehicles near Porur signal',
    description: 'A sharp-edged pothole near Porur signal has already damaged the tyres of several cars and bikes. The local RWA has complained twice with no action. The road caves in further after every rain.',
    category: 'Pothole',
    location: 'Porur Signal, Chennai',
    coords: { lat: 13.0368, lng: 80.1573 },
    reportedBy: 'Arjun Mohan',
    status: 'In Progress',
  },
  {
    title: 'Pothole on bridge deck causing risk on Cooum bridge',
    description: 'A pothole has formed on the deck of the Cooum River bridge on Poonamallee High Road. Bridge deck damage is especially serious as it can rapidly worsen. Structural inspection and immediate repair are needed.',
    category: 'Pothole',
    location: 'Cooum River Bridge, Poonamallee High Road, Chennai',
    coords: { lat: 13.0699, lng: 80.2134 },
    reportedBy: 'Ezhil Arasan',
    status: 'In Progress',
  },

  // ── Garbage ───────────────────────────────────────────────────────────────
  {
    title: 'Garbage dump overflowing near Koyambedu market',
    description: 'The garbage collection point near Koyambedu market has been overflowing for over a week. Waste is spilling onto the footpath and road. The smell is unbearable and stray dogs are spreading it further.',
    category: 'Garbage',
    location: 'Koyambedu Market Road, Chennai',
    coords: { lat: 13.0694, lng: 80.1948 },
    reportedBy: 'Deepa Krishnan',
    status: 'Reported',
  },
  {
    title: 'Illegal dumping behind Adyar bus stand',
    description: 'People are illegally dumping construction debris and household waste in the open plot behind Adyar bus stand. The pile has grown over 5 feet tall and rats have been spotted. Health hazard for nearby residents.',
    category: 'Garbage',
    location: 'Behind Adyar Bus Stand, Chennai',
    coords: { lat: 13.0012, lng: 80.2565 },
    reportedBy: 'Nisha Padmanabhan',
    status: 'In Progress',
  },
  {
    title: 'Garbage bins not cleared for 10 days in Mylapore',
    description: 'The municipal garbage bins on Luz Church Road, Mylapore have not been emptied in 10 days. Waste is overflowing and residents are forced to dump on the street. The stench is affecting nearby shops and homes.',
    category: 'Garbage',
    location: 'Luz Church Road, Mylapore, Chennai',
    coords: { lat: 13.0336, lng: 80.2668 },
    reportedBy: 'Anand Venkat',
    status: 'Resolved',
  },
  {
    title: 'Plastic waste clogging canal in Perambur',
    description: 'Large quantities of plastic bags and domestic waste are being thrown into the Perambur canal. The blockage is causing water to overflow onto the road during rain. Stagnant water is breeding mosquitoes.',
    category: 'Garbage',
    location: 'Perambur Canal Road, Chennai',
    coords: { lat: 13.1199, lng: 80.2383 },
    reportedBy: 'Sudha Raman',
    status: 'Reported',
  },
  {
    title: 'Garbage burning near residential area in Avadi',
    description: 'Residents near Avadi bus stop are burning garbage openly every evening, causing thick smoke to enter homes. Several people are suffering from respiratory irritation. This practice has been going on for two months.',
    category: 'Garbage',
    location: 'Avadi Bus Stop, Avadi, Chennai',
    coords: { lat: 13.1143, lng: 80.0965 },
    reportedBy: 'Balu Murugan',
    status: 'Reported',
  },
  {
    title: 'Waste pile next to childrens park in Anna Nagar',
    description: 'An unofficial dumping spot has developed beside the childrens park in Anna Nagar. Parents are concerned about health risks to their children. The municipality needs to install proper bins and do regular collection.',
    category: 'Garbage',
    location: 'Childrens Park, Anna Nagar, Chennai',
    coords: { lat: 13.0850, lng: 80.2101 },
    reportedBy: 'Kavitha Subramanian',
    status: 'In Progress',
  },
  {
    title: 'Commercial waste dumped on footpath in T. Nagar',
    description: 'Shops on Usman Road, T. Nagar are dumping commercial waste directly on the footpath after closing hours. Pedestrians have no space to walk and the area looks extremely dirty. Night collection trucks are not coming.',
    category: 'Garbage',
    location: 'Usman Road, T. Nagar, Chennai',
    coords: { lat: 13.0418, lng: 80.2341 },
    reportedBy: 'Raja Gopal',
    status: 'Reported',
  },
  {
    title: 'Garbage van not visiting slum area in Vyasarpadi',
    description: 'The garbage collection van does not visit the slum near Vyasarpadi station. Residents have no choice but to dump waste on the roadside. Disease and pest infestation are increasing. Regular collection service must be extended.',
    category: 'Garbage',
    location: 'Vyasarpadi Station Area, Chennai',
    coords: { lat: 13.1258, lng: 80.2647 },
    reportedBy: 'Dharmaraj Vincent',
    status: 'Reported',
  },

  // ── Streetlight ──────────────────────────────────────────────────────────
  {
    title: '8 streetlights out on ECR causing dangerous darkness',
    description: 'A stretch of approximately 800 metres on East Coast Road near Thiruvanmiyur has 8 non-functional streetlights. The area is pitch dark at night. Two vehicle collisions and a chain snatching incident occurred in the last month.',
    category: 'Streetlight',
    location: 'East Coast Road, near Thiruvanmiyur, Chennai',
    coords: { lat: 12.9843, lng: 80.2652 },
    reportedBy: 'Sathish Kumar',
    status: 'Reported',
  },
  {
    title: 'Streetlight flickering continuously near Besant Nagar beach',
    description: 'A streetlight near the Besant Nagar beach entrance has been flickering for three weeks. The constant on-off is disturbing to pedestrians and may indicate a wiring fault. Risk of short circuit.',
    category: 'Streetlight',
    location: 'Besant Nagar Beach Entrance, Chennai',
    coords: { lat: 13.0005, lng: 80.2707 },
    reportedBy: 'Pooja Iyer',
    status: 'In Progress',
  },
  {
    title: 'No streetlights in entire stretch of Mogappair West',
    description: 'An entire inner street in Mogappair West has had no streetlights for over a month since the transformer repair. Residents are using torches to walk at night. The area has seen increased crime in the dark.',
    category: 'Streetlight',
    location: 'Mogappair West Inner Street, Chennai',
    coords: { lat: 13.0855, lng: 80.1657 },
    reportedBy: 'Harish Chandran',
    status: 'Reported',
  },
  {
    title: 'Broken streetlight pole leaning dangerously in Pallavaram',
    description: 'A streetlight pole in Pallavaram main road is leaning at about 45 degrees after being hit by a lorry. It is a serious safety hazard. The live wire is partially exposed and could fall on pedestrians.',
    category: 'Streetlight',
    location: 'Pallavaram Main Road, Chennai',
    coords: { lat: 12.9675, lng: 80.1498 },
    reportedBy: 'Mani Kannan',
    status: 'Resolved',
  },
  {
    title: 'Streetlights on before sunrise and off after sunset',
    description: 'The streetlights on Greams Road appear to have a reversed timer - they switch on at 5 AM and off at 7 PM. During actual nighttime they are off. The timer or sensor needs to be recalibrated urgently.',
    category: 'Streetlight',
    location: 'Greams Road, Chennai',
    coords: { lat: 13.0570, lng: 80.2512 },
    reportedBy: 'Divya Menon',
    status: 'In Progress',
  },
  {
    title: 'New colony has no streetlights at all',
    description: 'The newly developed residential colony behind Sholinganallur OMR has no streetlights whatsoever. About 200 families live here but the corporation has not installed lights despite multiple requests over 6 months.',
    category: 'Streetlight',
    location: 'New Colony, Sholinganallur, Chennai',
    coords: { lat: 12.9010, lng: 80.2279 },
    reportedBy: 'Venkat Raman',
    status: 'Reported',
  },

  // ── Drainage ─────────────────────────────────────────────────────────────
  {
    title: 'Storm drain blocked causing road flooding in Saidapet',
    description: 'The storm water drain on G.S.T. Road, Saidapet is completely blocked with silt and waste. Even 20 minutes of rain causes the road to flood knee-deep. Vehicles stall and commuters are stranded regularly.',
    category: 'Drainage',
    location: 'G.S.T. Road, Saidapet, Chennai',
    coords: { lat: 13.0181, lng: 80.2211 },
    reportedBy: 'Arun Prakash',
    status: 'Reported',
  },
  {
    title: 'Open drainage ditch poses danger to pedestrians in Chromepet',
    description: 'An open drainage ditch running along the footpath on Chromepet market road has no cover. Two people have already fallen into it. The ditch carries sewage and the odour is very strong.',
    category: 'Drainage',
    location: 'Chromepet Market Road, Chennai',
    coords: { lat: 12.9516, lng: 80.1420 },
    reportedBy: 'Selvam Pillai',
    status: 'In Progress',
  },
  {
    title: 'Drainage water overflowing into homes in Tondiarpet',
    description: 'The drainage system in Tondiarpet is severely overloaded and sewage water is entering ground-floor homes after every rain. Residents have been dealing with this for two years. The main drain pipe needs to be widened.',
    category: 'Drainage',
    location: 'Tondiarpet, Chennai',
    coords: { lat: 13.1152, lng: 80.2905 },
    reportedBy: 'Janaki Raman',
    status: 'Reported',
  },
  {
    title: 'Clogged drain causing mosquito breeding in Nanganallur',
    description: 'A clogged drain on 100 Feet Road, Nanganallur has had stagnant water for over three weeks. Mosquito larvae are clearly visible. Residents are reporting increased dengue cases in the area.',
    category: 'Drainage',
    location: '100 Feet Road, Nanganallur, Chennai',
    coords: { lat: 12.9785, lng: 80.1940 },
    reportedBy: 'Gomathi Devi',
    status: 'Reported',
  },
  {
    title: 'Drainage pipe broken under road surface near Nungambakkam',
    description: 'The underground drainage pipe on Nungambakkam High Road has collapsed, creating a sinkhole near the footpath. The road surface above is sinking and may give way. Immediate excavation and repair required.',
    category: 'Drainage',
    location: 'Nungambakkam High Road, Chennai',
    coords: { lat: 13.0569, lng: 80.2425 },
    reportedBy: 'Balaji Natarajan',
    status: 'In Progress',
  },
  {
    title: 'Blocked gutter on Rajiv Gandhi Salai flooding shops',
    description: 'The roadside gutter on Rajiv Gandhi Salai near Thoraipakkam is blocked with construction debris. During rain, water backs up and floods nearby shops causing property damage.',
    category: 'Drainage',
    location: 'Rajiv Gandhi Salai, Thoraipakkam, Chennai',
    coords: { lat: 12.9390, lng: 80.2293 },
    reportedBy: 'Dhanashree Venkat',
    status: 'Resolved',
  },
  {
    title: 'Manhole cover missing on drainage line in Vadapalani',
    description: 'A manhole cover on the main drainage line at Vadapalani signal is missing. The open hole is right at the edge of the road. A motorbike tyre went into it last night. Very high risk of serious accident.',
    category: 'Drainage',
    location: 'Vadapalani Signal, Chennai',
    coords: { lat: 13.0514, lng: 80.2120 },
    reportedBy: 'Muthu Raja',
    status: 'Reported',
  },
  {
    title: 'Drainage canal encroached and narrowed in Virugambakkam',
    description: 'Construction encroachment has narrowed the drainage canal in Virugambakkam by more than half. Water flow is severely restricted. During heavy rain, the entire locality floods within an hour.',
    category: 'Drainage',
    location: 'Virugambakkam Canal Road, Chennai',
    coords: { lat: 13.0621, lng: 80.1912 },
    reportedBy: 'Shanthi Govindan',
    status: 'In Progress',
  },
  {
    title: 'Waterlogging at underpass during rain in Villivakkam',
    description: 'The railway underpass in Villivakkam floods to waist level during even moderate rain. Commuters are stranded for hours. The pumping station at the underpass is reportedly broken and has not been fixed for 6 months.',
    category: 'Drainage',
    location: 'Railway Underpass, Villivakkam, Chennai',
    coords: { lat: 13.1017, lng: 80.2173 },
    reportedBy: 'Senthil Kumar',
    status: 'In Progress',
  },

  // ── Water Leakage ─────────────────────────────────────────────────────────
  {
    title: 'Water main leaking on Pattabiram road for 2 weeks',
    description: 'A major water supply pipe has been leaking on the main road in Pattabiram for two weeks. Thousands of litres of drinking water are being wasted daily. The road is also getting damaged due to constant moisture.',
    category: 'Water Leakage',
    location: 'Main Road, Pattabiram, Chennai',
    coords: { lat: 13.1174, lng: 80.0548 },
    reportedBy: 'Ravi Chandrasekhar',
    status: 'Reported',
  },
  {
    title: 'Underground pipe burst near Ashok Nagar flyover',
    description: 'An underground water supply pipe has burst near the Ashok Nagar flyover. Water is gushing out and flowing down the road. The area has been wet for 4 days and motor traffic is having difficulty.',
    category: 'Water Leakage',
    location: 'Ashok Nagar Flyover, Chennai',
    coords: { lat: 13.0389, lng: 80.2107 },
    reportedBy: 'Chandra Sekaran',
    status: 'In Progress',
  },
  {
    title: 'Leaking fire hydrant on Marina Beach Road',
    description: 'A fire hydrant near the Marina beach road junction has been leaking continuously. The leak has turned the footpath slippery and water is draining into the sea. The valve seems to be broken.',
    category: 'Water Leakage',
    location: 'Marina Beach Road Junction, Chennai',
    coords: { lat: 13.0590, lng: 80.2823 },
    reportedBy: 'Preethi Sankar',
    status: 'Reported',
  },
  {
    title: 'Overhead tank overflow flooding terrace and road',
    description: 'The municipal overhead tank near Kodambakkam is overflowing due to a faulty float valve. Water is running down the stairs and onto the road continuously. Wastage is enormous and road surface is getting damaged.',
    category: 'Water Leakage',
    location: 'Municipal Overhead Tank, Kodambakkam, Chennai',
    coords: { lat: 13.0484, lng: 80.2234 },
    reportedBy: 'Surya Prakash',
    status: 'Resolved',
  },
  {
    title: 'Leaking pipeline causing waterlogging in Korattur',
    description: 'A water supply pipeline has developed a crack near the Korattur railway station. The leak is creating a constant pool of water on the road. The wet road has caused two bike slips in the past week.',
    category: 'Water Leakage',
    location: 'Korattur Railway Station Road, Chennai',
    coords: { lat: 13.1037, lng: 80.1690 },
    reportedBy: 'Narayanan Swami',
    status: 'Reported',
  },
  {
    title: 'Water supply pipe joint broken in Thirumangalam',
    description: 'A joint in the main water supply line on Thirumangalam Road has broken. Water pressure is reduced in the entire area and half the water is being lost before reaching homes. The leak has also softened the road base.',
    category: 'Water Leakage',
    location: 'Thirumangalam Road, Chennai',
    coords: { lat: 13.0868, lng: 80.2033 },
    reportedBy: 'Vimala Suresh',
    status: 'In Progress',
  },
  {
    title: 'Broken water meter causing billing disputes in Adambakkam',
    description: 'The water meter for a block of 12 flats in Adambakkam has been broken for two months. Residents are receiving inflated bills based on estimates. The corporation needs to replace the meter and recalculate bills.',
    category: 'Water Leakage',
    location: 'Adambakkam, Chennai',
    coords: { lat: 12.9800, lng: 80.2014 },
    reportedBy: 'Vijayalakshmi Nair',
    status: 'Reported',
  },

  // ── Other ─────────────────────────────────────────────────────────────────
  {
    title: 'Fallen tree blocking road in Alwarpet after storm',
    description: 'A large tree fell across the road in Alwarpet during last nights storm. It is completely blocking one lane of traffic. Emergency tree removal is needed. No injuries reported but traffic is severely affected.',
    category: 'Other',
    location: 'Alwarpet Main Road, Chennai',
    coords: { lat: 13.0339, lng: 80.2552 },
    reportedBy: 'Fathima Begum',
    status: 'Resolved',
  },
  {
    title: 'Broken footpath tiles injuring pedestrians in Egmore',
    description: 'Multiple footpath tiles on Gandhi Irwin Road, Egmore have come loose and are jutting up at dangerous angles. Three people have twisted their ankles. The area is frequented by office goers and senior citizens.',
    category: 'Other',
    location: 'Gandhi Irwin Road, Egmore, Chennai',
    coords: { lat: 13.0784, lng: 80.2621 },
    reportedBy: 'Subramania Pillai',
    status: 'Reported',
  },
  {
    title: 'Stray cattle blocking traffic at Medavakkam junction',
    description: 'A herd of about 15 stray cattle has been loitering at the Medavakkam junction for several days. They are blocking traffic, especially during peak hours, and have caused two minor accidents. Animal control intervention needed.',
    category: 'Other',
    location: 'Medavakkam Junction, Chennai',
    coords: { lat: 12.9211, lng: 80.1949 },
    reportedBy: 'Malarvizhi Raj',
    status: 'Reported',
  },
  {
    title: 'Abandoned construction debris on road in Shollinganallur',
    description: 'A contractor has dumped sand, bricks, and iron rods on the road near Shollinganallur signal without permission. It has been there for 10 days. The material is occupying half the road and causing traffic jams.',
    category: 'Other',
    location: 'Shollinganallur Signal, Chennai',
    coords: { lat: 12.9010, lng: 80.2279 },
    reportedBy: 'Parthiban Nair',
    status: 'In Progress',
  },
  {
    title: 'Public toilet non-functional near Royapettah hospital',
    description: 'The public toilet near Royapettah Government Hospital has been locked and non-functional for a month. Patients, attendants, and the public are forced to use the roadside. Urgent restoration needed in a hospital zone.',
    category: 'Other',
    location: 'Royapettah Government Hospital, Chennai',
    coords: { lat: 13.0536, lng: 80.2624 },
    reportedBy: 'Geeta Shankar',
    status: 'Reported',
  },
  {
    title: 'Encroachment blocking bus stop in Chrompet',
    description: 'A vegetable vendor has permanently encroached the bus stop in Chrompet, leaving no space for commuters to stand. People are forced to wait on the road. During rain there is no shelter. Action needed from municipal authorities.',
    category: 'Other',
    location: 'Chrompet Bus Stop, Chennai',
    coords: { lat: 12.9516, lng: 80.1420 },
    reportedBy: 'Loganathan Pillai',
    status: 'Reported',
  },
  {
    title: 'Broken speed breaker causing vehicle damage in Pallikaranai',
    description: 'A speed breaker on the main road in Pallikaranai has partially broken and only one side remains. Vehicles that go over it get jolted and hit the ground. Several car undercarriages have been scratched. Remove or repair needed.',
    category: 'Other',
    location: 'Pallikaranai Main Road, Chennai',
    coords: { lat: 12.9340, lng: 80.2162 },
    reportedBy: 'Sangeetha Murugan',
    status: 'In Progress',
  },
  {
    title: 'Overhead cable hanging low across road near Perungudi',
    description: 'A low-hanging cable (possibly telecom or power) has drooped across the road near Perungudi toll. Tall vehicles like buses and trucks are snagging it. The cable could snap and injure people. Needs immediate fixing.',
    category: 'Other',
    location: 'Perungudi Toll, Chennai',
    coords: { lat: 12.9562, lng: 80.2430 },
    reportedBy: 'Sundaresan Mani',
    status: 'Reported',
  },
  {
    title: 'No road signs or markings on newly laid road in Siruseri',
    description: 'A newly laid road in the Siruseri IT corridor has no road markings, lane dividers, or signage. Drivers are confused about direction and speed limits. Several near-miss accidents have occurred after dark.',
    category: 'Other',
    location: 'Siruseri IT Corridor, Chennai',
    coords: { lat: 12.8399, lng: 80.2173 },
    reportedBy: 'Yamuna Krishnan',
    status: 'Resolved',
  },
  {
    title: 'Park benches broken and unusable in Nandanam',
    description: 'All the benches in the small corporation park near Nandanam metro station are broken. Senior citizens who come for morning walks have nowhere to sit. The park maintenance has been neglected for months.',
    category: 'Other',
    location: 'Corporation Park, Nandanam, Chennai',
    coords: { lat: 13.0269, lng: 80.2374 },
    reportedBy: 'Hemalatha Sharma',
    status: 'Reported',
  },
];

// Spread createdAt timestamps across the last 30 days for realism
function randomDate() {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return new Date(now - Math.floor(Math.random() * thirtyDays));
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB connected');

    // Safety check — if seeded issues already exist, skip to avoid overwriting
    const seededNames = [...new Set(ISSUES.map(i => i.reportedBy))];
    const existing = await Issue.countDocuments({ reportedBy: { $in: seededNames } });
    if (existing >= ISSUES.length) {
      console.log(`Skipping — ${existing} seeded issues already exist. Delete them first to re-seed.`);
      await mongoose.disconnect();
      return;
    }

    // Remove only previously seeded issues — real user reports are untouched
    const deleted = await Issue.deleteMany({ reportedBy: { $in: seededNames } });
    console.log('Cleared', deleted.deletedCount, 'previously seeded issues');

    // Track per-category counter to alternate between the two images
    const categoryCounter = {};

    const docs = ISSUES.map(issue => {
      const imgs = CATEGORY_IMAGES[issue.category] || CATEGORY_IMAGES['Other'];
      const idx  = categoryCounter[issue.category] || 0;
      categoryCounter[issue.category] = idx + 1;

      return {
        title:       issue.title,
        description: issue.description,
        category:    issue.category,
        location:    issue.location,
        coords:      issue.coords,
        reportedBy:  issue.reportedBy,
        status:      issue.status,
        image:       imgs[idx % imgs.length],
        createdAt:   randomDate(),
        updatedAt:   new Date(),
      };
    });

    const inserted = await Issue.insertMany(docs);
    console.log('Inserted', inserted.length, 'seed issues successfully');

    const summary = {};
    docs.forEach(d => { summary[d.category] = (summary[d.category] || 0) + 1; });
    console.log('Issues per category:', summary);

    await mongoose.disconnect();
    console.log('Done - MongoDB disconnected');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
