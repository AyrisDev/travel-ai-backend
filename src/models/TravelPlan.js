import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const routeSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  totalCost: {
    type: Number,
    required: true
  },
  breakdown: {
    flights: { type: Number, required: true },
    hotels: { type: Number, required: true },
    activities: { type: Number, required: true }
  },
  dailyPlan: [{
    day: { type: Number, required: true },
    location: { type: String, required: true },
    activities: [{ type: String }],
    accommodation: { type: String },
    estimatedCost: { type: Number }
  }],
  bookingLinks: {
    flights: { type: String },
    hotels: { type: String }
  }
});

const travelPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: String,
    required: true,
    unique: true
  },
  request: {
    destination: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    budget: { type: Number, required: true },
    currency: { type: String, required: true },
    travelers: { type: Number, default: 1 },
    preferences: {
      travelStyle: { type: String, enum: ['budget', 'mid-range', 'luxury'] },
      interests: [{ type: String }]
    }
  },
  mainRoutes: [routeSchema],
  surpriseAlternatives: [{
    destination: { type: String, required: true },
    reason: { type: String },
    estimatedCost: { type: Number },
    highlights: [{ type: String }]
  }],
  localTips: [{ type: String }],
  timingAdvice: {
    bestTimeToVisit: { type: String },
    weatherInfo: { type: String },
    seasonalTips: [{ type: String }]
  },
  metadata: {
    generatedAt: { type: Date, default: Date.now },
    creditsUsed: { type: Number, default: 0 },
    responseTime: { type: Number },
    geminiModel: { type: String },
    promptVersion: { type: String, default: '1.0' }
  },
  status: {
    type: String,
    enum: ['draft', 'completed', 'failed'],
    default: 'draft'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  rating: {
    score: { type: Number, min: 1, max: 5 },
    feedback: { type: String }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add pagination plugin
travelPlanSchema.plugin(mongoosePaginate);

// Indexes
travelPlanSchema.index({ user: 1, createdAt: -1 });
travelPlanSchema.index({ planId: 1 });
travelPlanSchema.index({ 'request.destination': 1 });
travelPlanSchema.index({ status: 1 });
travelPlanSchema.index({ isPublic: 1, rating: -1 });

// Virtual for duration
travelPlanSchema.virtual('duration').get(function() {
  const diffTime = Math.abs(this.request.endDate - this.request.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for best route
travelPlanSchema.virtual('bestRoute').get(function() {
  if (this.mainRoutes && this.mainRoutes.length > 0) {
    return this.mainRoutes.reduce((best, current) => 
      current.totalCost < best.totalCost ? current : best
    );
  }
  return null;
});

// Method to increment views
travelPlanSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to add rating
travelPlanSchema.methods.addRating = function(score, feedback = '') {
  this.rating = { score, feedback };
  return this.save();
};

// Static method to find public plans
travelPlanSchema.statics.findPublic = function() {
  return this.find({ isPublic: true, status: 'completed' })
    .populate('user', 'name')
    .sort({ rating: -1, createdAt: -1 });
};

// Static method to find user's plans
travelPlanSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 });
};

// Static method to get popular destinations
travelPlanSchema.statics.getPopularDestinations = async function() {
  return this.aggregate([
    { $match: { status: 'completed' } },
    { $group: { 
      _id: '$request.destination', 
      count: { $sum: 1 },
      avgRating: { $avg: '$rating.score' }
    }},
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
};

export default mongoose.model('TravelPlan', travelPlanSchema);