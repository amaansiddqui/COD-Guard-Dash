import fs from 'node:fs';
import mongoose from 'mongoose';
import { STATE_PATH, loadPolicyFile, savePolicyFile } from '../config.js';
import { OrderModel, SessionModel, PolicyModel } from '../models/index.js';

let mongoReady = false;

function readState() {
  try {
    const value = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    return { orders: [], sessions: [], ...value };
  } catch { return { orders: [], sessions: [] }; }
}
function writeState(state) {
  fs.mkdirSync(new URL('../../data/', import.meta.url), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export async function connectStorage(uri) {
  if (!uri) {
    console.log('MongoDB URI not provided. Using local JSON persistence for the demo.');
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3500 });
    mongoReady = true;
    console.log('Connected to MongoDB.');
  } catch (error) {
    console.warn(`MongoDB unavailable (${error.message}). Falling back to local JSON persistence.`);
    mongoReady = false;
  }
}

export function storageMode() { return mongoReady ? 'MongoDB' : 'Local JSON fallback'; }

export async function saveOrder(order) {
  if (mongoReady) {
    const saved = await OrderModel.create(order);
    return saved.toObject();
  }
  const state = readState();
  state.orders.unshift(order);
  state.orders = state.orders.slice(0, 500);
  writeState(state);
  return order;
}

export async function listOrders(limit = 50) {
  if (mongoReady) return OrderModel.find().sort({ created_at: -1 }).limit(limit).lean();
  return readState().orders.slice(0, limit);
}

export async function saveSession(session) {
  if (mongoReady) {
    await SessionModel.findOneAndUpdate({ session_id: session.session_id }, session, { upsert: true, new: true });
    return session;
  }
  const state = readState();
  const index = state.sessions.findIndex((item) => item.session_id === session.session_id);
  if (index >= 0) state.sessions[index] = session;
  else state.sessions.unshift(session);
  state.sessions = state.sessions.slice(0, 200);
  writeState(state);
  return session;
}

export async function getSession(sessionId) {
  if (mongoReady) return SessionModel.findOne({ session_id: sessionId }).lean();
  return readState().sessions.find((item) => item.session_id === sessionId) || null;
}

export async function listSessions(limit = 30) {
  if (mongoReady) return SessionModel.find().sort({ updated_at: -1 }).limit(limit).lean();
  return readState().sessions.slice(0, limit);
}

export async function getPolicy() {
  if (mongoReady) {
    const found = await PolicyModel.findOne({ key: 'default' }).lean();
    if (found?.values) return found.values;
  }
  return loadPolicyFile();
}

export async function savePolicy(values) {
  savePolicyFile(values);
  if (mongoReady) await PolicyModel.findOneAndUpdate({ key: 'default' }, { values }, { upsert: true });
  return values;
}
