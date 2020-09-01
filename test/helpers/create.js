var ram = require('random-access-memory')
var ddrive = require('../../')

module.exports = function (key, opts) {
  return ddrive(ram, key, opts)
}
