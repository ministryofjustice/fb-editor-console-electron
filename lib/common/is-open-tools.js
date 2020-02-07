const yargsParser = require('yargs-parser')

const args = new Map(Object.entries(yargsParser(process.argv.slice(2))))

const isOpenTools = () => args.get('openTools') || false

module.exports = isOpenTools
