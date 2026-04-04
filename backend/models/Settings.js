const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        // Allow empty values but validate non-empty values
        if (v && v.length > 500) return false;
        return true;
      },
      message: 'Value too long (max 500 characters)'
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

settingsSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);