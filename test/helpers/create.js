var ram = require('random-access-memory')
var ddrive = require('../../')

module.exports = function (key, opts) {
  if (key && !(key instanceof Buffer)) {
    opts = key
    key = null
  }
  return ddrive((opts && opts.dwebstore) || ram, key, opts)
}
