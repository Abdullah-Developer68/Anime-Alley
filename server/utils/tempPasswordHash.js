const bcrypt = require("bcrypt");
const crypto = require("crypto");

const createTemporaryPasswordHash = async () => {
  const tempPassword = crypto.randomBytes(32).toString("hex");
  return bcrypt.hash(tempPassword, 10);
};

module.exports = createTemporaryPasswordHash;
