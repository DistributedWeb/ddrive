const test = require('tape')

const replicateAll = require('./helpers/replicate')
const create = require('./helpers/create')

test('single-file download', t => {
  const drive1 = create()
  var drive2 = null

  drive1.ready(err => {
    t.error(err, 'no error')
    drive2 = create(drive1.key)
    drive2.ready(err => {
      t.error(err, 'no error')
      replicateAll([drive1, drive2])
      onready()
    })
  })

  function onready () {
    drive1.writeFile('hello', 'world', err => {
      t.error(err, 'no error')
      setImmediate(() => {
        drive2.stats('hello', (err, totals) => {
          t.error(err, 'no error')
          t.same(totals.blocks, 1)
          t.same(totals.downloadedBlocks, 0)
          const handle = drive2.download('hello')
          ondownloading(handle)
        })
      })
    })
  }

  function ondownloading (handle) {
    handle.on('finish', () => {
      drive2.stats('hello', (err, totals) => {
        t.same(totals.downloadedBlocks, 1)
        t.end()
      })
    })
    handle.on('error', t.fail.bind(t))
    handle.on('cancel', t.fail.bind(t))
  }
})

test('directory download', t => {
  const drive1 = create()
  var drive2 = null

  drive1.ready(err => {
    t.error(err, 'no error')
    drive2 = create(drive1.key)
    drive2.ready(err => {
      t.error(err, 'no error')
      replicateAll([drive1, drive2])
      onready()
    })
  })

  function onready () {
    drive1.writeFile('a/1', '1', err => {
      t.error(err, 'no error')
      drive1.writeFile('a/2', '2',err => {
        t.error(err, 'no error')
        drive1.writeFile('a/3', '3', err => {
          t.error(err, 'no error')
          setImmediate(() => {
            const handle = drive2.download('a', { maxConcurrent: 1 })
            ondownloading(handle)
          })
        })
      })
    })
  }

  function ondownloading (handle) {
    handle.on('finish', () => {
      drive2.stats('a', (err, totals) => {
        t.error(err, 'no error')
        t.same(totals.get('/a/1').downloadedBlocks, 1)
        t.same(totals.get('/a/2').downloadedBlocks, 1)
        t.same(totals.get('/a/3').downloadedBlocks, 1)
        t.end()
      })
    })
    handle.on('error', t.fail.bind(t))
  }
})

test('download cancellation', t => {
  const drive1 = create()
  var drive2 = null

  drive1.ready(err => {
    t.error(err, 'no error')
    drive2 = create(drive1.key)
    drive2.ready(err => {
      t.error(err, 'no error')
      replicateAll([drive1, drive2], { throttle: 50 })
      onready()
    })
  })

  function onready () {
    const writeStream = drive1.createWriteStream('a')
    var chunks = 100
    return write()

    function write () {
      writeStream.write(Buffer.alloc(1024 * 1024).fill('abcdefg'), err => {
        if (err) return t.fail(err)
        if (--chunks) return write()
        return writeStream.end(() => {
          return onwritten()
        })
      })
    }
  }

  function onwritten () {
    setTimeout(() => {
      const handle = drive2.download('a', { detailed: true, statsInterval: 50 })
      ondownloading(handle)
    }, 500)
  }

  function ondownloading (handle) {
    setTimeout(() => {
      handle.destroy()
    }, 1000)
    handle.on('finish', (err, total, byFile) => {
      if (err) t.fail(err)
      drive2.stats('a', (err, totals) => {
        t.error(err, 'no error')
        t.true(totals.downloadedBlocks > 0 && totals.downloadedBlocks < 100)
        t.end()
      })
    })
    handle.on('error', t.fail.bind(t))
  }
})

function printHandle (handle) {
  handle.on('start', (...args) => console.log('start', args))
  handle.on('progress', (...args) => console.log('progress', args))
  handle.on('error', (...args) => console.log('error', args))
  handle.on('finish', (...args) => console.log('finish', args))
}
