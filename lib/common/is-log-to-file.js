const yargsParser = require('yargs-parser')

const args = new Map(Object.entries(yargsParser(process.argv.slice(2))))

const isLogToFile = () => args.get('logToFile') || false

module.exports = isLogToFile
