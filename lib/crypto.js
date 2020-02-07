const crypto = require('crypto')

function hashKey (key) {
  if (!key) throw new Error('A key is required')

  return crypto.createHash('sha256').update(key).digest('base64').substr(0, 32)
}

function encrypt (buffer, key, algorithm = 'aes-256-ctr') {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, hashKey(key), iv)
  return Buffer.concat([iv, cipher.update(buffer), cipher.final()])
}

function decrypt (buffer, key, algorithm = 'aes-256-ctr') {
  const iv = buffer.slice(0, 16)
  const decipher = crypto.createDecipheriv(algorithm, hashKey(key), iv)
  return Buffer.concat([decipher.update(buffer.slice(16)), decipher.final()])
}

module.exports = {
  encrypt,
  decrypt
}
