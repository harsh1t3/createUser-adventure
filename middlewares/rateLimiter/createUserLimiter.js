const createRateLimiter = require('./limiterFactory');

const createUserLimiter = createRateLimiter({
  keyPrefix: 'rl_create_user',
  points: 5,
  duration: 300,
  blockDuraion: 600,
});

module.exports = createUserLimiter;
