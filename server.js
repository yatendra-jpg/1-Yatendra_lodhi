/**
 * Improved Gmail-Safe Bulk Mailer
 * Block reduction version (human-like sending + safe headers + content sanitizer)
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// Gmail-safe sending rules
const BASE_BATCH_SIZE = 3;   // lower = safer
const MIN_DELAY = 700;       // ms
const MAX_DELAY = 1600;      // ms
const MAX_PER_HOUR = 31;     // Your limit

// track per-sender
const senderBucket = new Map();

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

function normalizeList(text) {
  return text.split(/[\n,]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

// content sanitizer (important)
function sanitizeBody(txt) {
  return txt
    .replace(/http:\/\/|https:\/
