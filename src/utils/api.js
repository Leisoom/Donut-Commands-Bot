require('dotenv/config');
const axios = require('axios');

const api = axios.create({
    baseURL: 'https://api.donutsmp.net/v1',
    headers: {
        Authorization: `Bearer ${process.env.DONUT_SMP_API_KEY}`,
    },
});

module.exports = api;