/**
 * server.js — HTML Email + Anti-Block System + 31/hr per sender
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

// Login
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// Sending Safe Settings
const BATCH_SIZE = 4;
const MIN_DELAY = 700;
const MAX_DELAY = 1500;
const LIMIT = 31;
const WINDOW = 3600000;

const senderMap = new Map();

const delay = ms => new Promise(res => setTimeout(res, ms));
const random = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// HTML sanitizer (removes dangerous tags only)
function cleanHTML(html) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/onerror=/gi, "")
    .replace(/onload=/gi, "");
}

function normalizeList(text) {
  return text.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
}

function checkLimit(email, need) {
  const now = Date.now();
  const rec = senderMap.get(email);

  if (!rec) {
    senderMap.set(email, { start: now, sent: 0 });
    return { allowed: true, left: LIMIT };
  }

  if (now - rec.start > WINDOW) {
    senderMap.set(email, { start: now, sent: 0 });
    return { allowed: true, left: LIMIT };
