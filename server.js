require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// === LOGIN ===
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// === LIMIT SYSTEM ===
const ONE_HOUR = 60 * 60 * 1000;
const MAX_PER_HOUR = 31;

// email => { count, reset }
let LIMIT = {};

function checkLimit(email, amount) {
  if (!LIMIT[email]) {
    LIMIT[email] = {
      count: 0,
      reset: Date.now() + ONE_HOUR
    };
  }

  // reset if expired
  if (Date.now() > LIMIT[email].reset) {
    LIMIT[email].count = 0;
    LIMIT[email].reset = Date.now() + ONE_HOUR;
  }

  // if limit reached
  if
