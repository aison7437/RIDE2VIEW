const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const { dirname } = require('node:path');
function openStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,verified INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS listings(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),payload TEXT NOT NULL,approved INTEGER NOT NULL DEFAULT 0,available INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES users(id),listing_id TEXT NOT NULL REFERENCES listings(id),tier TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL,scheduled_at TEXT NOT NULL,driver_id TEXT REFERENCES users(id),created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY,booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id),amount INTEGER NOT NULL,status TEXT NOT NULL,reference TEXT UNIQUE,verified_by TEXT REFERENCES users(id),verified_at TEXT);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT REFERENCES users(id),action TEXT NOT NULL,entity_id TEXT NOT NULL,details TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),message TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS dispatch_assignments(
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id),
      driver_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL,
      lease_expires_at TEXT,
      idempotency_key TEXT NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS safety_decisions(
      id TEXT PRIMARY KEY,
      correlation_id TEXT,
      operation TEXT NOT NULL,
      subject_id TEXT,
      decision TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS logistics_shipments(
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      shipment_class TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      pickup TEXT NOT NULL,
      destination TEXT NOT NULL,
      status TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS logistics_events(
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL REFERENCES logistics_shipments(id),
      event_type TEXT NOT NULL,
      evidence_ref TEXT,
      actor_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS commerce_orders(
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      basket TEXT NOT NULL,
      total REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS commerce_order_events(
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES commerce_orders(id),
      event_type TEXT NOT NULL,
      evidence_ref TEXT,
      actor_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reservations(
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      status TEXT NOT NULL,
      hold_expires_at TEXT,
      idempotency_key TEXT NOT NULL UNIQUE,
      dependencies TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS booking_reservations(
      booking_id TEXT PRIMARY KEY REFERENCES bookings(id),
      reservation_id TEXT UNIQUE NOT NULL REFERENCES reservations(id),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reservation_events(
      id TEXT PRIMARY KEY,
      reservation_id TEXT NOT NULL REFERENCES reservations(id),
      event_type TEXT NOT NULL,
      evidence_ref TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reservation_revisions(
      id TEXT PRIMARY KEY,
      reservation_id TEXT NOT NULL REFERENCES reservations(id),
      previous_start_at TEXT NOT NULL,
      previous_end_at TEXT NOT NULL,
      new_start_at TEXT NOT NULL,
      new_end_at TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cancellation_operations(
      id TEXT PRIMARY KEY,
      booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id),
      status TEXT NOT NULL,
      current_step TEXT NOT NULL,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS support_cases(
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      journey_id TEXT,
      incident_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      affected_entity TEXT,
      correlation_id TEXT,
      status TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS support_case_events(
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES support_cases(id),
      event_type TEXT NOT NULL,
      evidence_ref TEXT,
      actor_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS support_recovery_actions(
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES support_cases(id),
      domain TEXT NOT NULL,
      action TEXT NOT NULL,
      authority_entity_id TEXT NOT NULL,
      evidence_ref TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS cancellation_status ON cancellation_operations(status);
    CREATE INDEX IF NOT EXISTS support_customer ON support_cases(customer_id);
    CREATE INDEX IF NOT EXISTS support_journey ON support_cases(journey_id);
    CREATE INDEX IF NOT EXISTS support_correlation ON support_cases(correlation_id);
    CREATE INDEX IF NOT EXISTS support_case_events_case ON support_case_events(case_id);
    CREATE INDEX IF NOT EXISTS booking_reservations_reservation ON booking_reservations(reservation_id);
    CREATE INDEX IF NOT EXISTS reservation_resource_time ON reservations(resource_id,start_at,end_at,status);
    CREATE INDEX IF NOT EXISTS reservation_customer ON reservations(customer_id);
    CREATE INDEX IF NOT EXISTS reservation_events_reservation ON reservation_events(reservation_id);
    CREATE INDEX IF NOT EXISTS commerce_customer ON commerce_orders(customer_id);
    CREATE INDEX IF NOT EXISTS commerce_merchant_status ON commerce_orders(merchant_id,status);
    CREATE INDEX IF NOT EXISTS commerce_events_order ON commerce_order_events(order_id);
    CREATE INDEX IF NOT EXISTS logistics_customer ON logistics_shipments(customer_id);
    CREATE INDEX IF NOT EXISTS logistics_events_shipment ON logistics_events(shipment_id);
    CREATE INDEX IF NOT EXISTS safety_correlation ON safety_decisions(correlation_id);
    CREATE INDEX IF NOT EXISTS booking_customer ON bookings(customer_id);
    CREATE INDEX IF NOT EXISTS dispatch_booking ON dispatch_assignments(booking_id);
    CREATE INDEX IF NOT EXISTS dispatch_driver_status ON dispatch_assignments(driver_id,status);`);
  return db;
}
module.exports = { openStore };
