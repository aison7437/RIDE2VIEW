function installShoppingSchema(db) {
  db.exec(`
    CREATE TABLE shopping_carts (
      owner_id TEXT PRIMARY KEY REFERENCES users(id), version INTEGER NOT NULL,
      items TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE shopping_reviews (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id),
      cart_version INTEGER NOT NULL, snapshot TEXT NOT NULL,
      expires_at TEXT NOT NULL, checkout_id TEXT UNIQUE REFERENCES commerce_checkouts(id),
      created_at TEXT NOT NULL
    );
    CREATE INDEX shopping_review_owner ON shopping_reviews(owner_id,created_at);
  `);
}
module.exports = {installShoppingSchema};
