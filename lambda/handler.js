'use strict';

require('dotenv').config();
const fetch = require('node-fetch');
const querystring = require('querystring');

module.exports.getInvite = async event => {
  if (!event.queryStringParameters || !event.queryStringParameters.captcha) {
    return {
      statusCode: 401,
      body: 'No captcha specified.',
      headers: { 'Content-Type': 'text/plain' },
    };
  }
  const captchaParams = {
    secret: process.env.RECAPTCHA_SECRET,
    response: event.queryStringParameters.captcha,
    remoteip: event.requestContext.identity.sourceIp,
  };
  const captchaReq = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: querystring.encode(captchaParams),
    headers: { 'Content-Type' : 'application/x-www-form-urlencoded' },
  });
  const captchaRes = await captchaReq.json();
  if (!captchaRes.success) {
    let errMsg = 'Captcha not valid. Please retry.';
    if (captchaRes['error-codes']) {
      errMsg += ' Error(s): ' + captchaRes['error-codes'].join(', ');
    }
    return {
      statusCode: 401,
      body: errMsg,
      headers: { 'Content-Type': 'text/plain' },
    };
  }

  const discordParams = {
    max_uses: 1,
    max_age: 600, // 10 minutes
    unique: true,
  };
  const discordReq = await fetch(
    `https://discordapp.com/api/channels/${process.env.DISCORD_CHANNEL_ID}/invites`,
    {
      method: 'POST',
      body: JSON.stringify(discordParams),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bot ' + process.env.DISCORD_TOKEN,
      },
    },
  );
  const discordRes = await discordReq.json();
  if (discordReq.status < 200 || discordReq.status >= 400) {
    return {
      statusCode: 500,
      body: `Discord returned error ${discordRes.code}: ${discordRes.message}`,
      headers: { 'Content-Type': 'text/plain' },
    };
  }
  if (!discordRes.code) {
    return {
      statusCode: 500,
      body: 'No invite code received from Discord.',
      headers: { 'Content-Type': 'text/plain' },
    };
  }

  return {
    statusCode: 302,
    headers: {
      Location: 'https://discord.gg/' + discordRes.code,
    }
  };
};
