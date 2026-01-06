const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../src/config/db');
const ServiceCategory = require('../src/models/ServiceCategory');

const categories = [
  { name: 'Electrician', description: 'Wiring, breakers, outlets', basePrice: 50, isActive: true, icon: 'icon-electrician' },
  { name: 'Plumber', description: 'Leaks, drains, fixtures', basePrice: 45, isActive: true, icon: 'icon-plumber' },
  { name: 'Cleaner', description: 'Home/office cleaning', basePrice: 30, isActive: true, icon: 'icon-cleaner' },
  { name: 'Carpenter', description: 'Woodwork, cabinets, doors', basePrice: 55, isActive: true, icon: 'icon-carpenter' },
  { name: 'HVAC', description: 'Heating/cooling service', basePrice: 60, isActive: true, icon: 'icon-hvac' },
  { name: 'Appliance Repair', description: 'Major appliance fixes', basePrice: 50, isActive: true, icon: 'icon-appliance-repair' }
];

const run = async () => {
  await db.connect();

  await ServiceCategory.bulkWrite(
    categories.map((cat) => ({
      updateOne: {
        filter: { name: cat.name },
        update: { $set: cat },
        upsert: true
      }
    }))
  );

  const count = await ServiceCategory.countDocuments();
  console.log(`Seeded categories. Total categories: ${count}`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
