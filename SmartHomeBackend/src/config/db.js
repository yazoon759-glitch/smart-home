const mongoose = require('mongoose');

module.exports.connect = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/smarthome';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Mongo connected');
};
