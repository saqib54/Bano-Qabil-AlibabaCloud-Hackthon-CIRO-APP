const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const weatherService = require('../services/weather.service');

/** GET /api/v1/weather?city=Lahore — full weather intelligence for a city. */
const weather = asyncHandler(async (req, res) => {
  const city = String(req.query.city || '').trim();
  if (city.length < 2 || city.length > 60) {
    throw new ApiError(400, 'Provide a city name (2-60 characters) via ?city=.');
  }
  const data = await weatherService.getWeather(city);
  res.json({ success: true, message: 'Weather intelligence loaded', data });
});

module.exports = { weather };
