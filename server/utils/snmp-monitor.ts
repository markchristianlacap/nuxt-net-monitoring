import snmp from 'net-snmp'

const config = useRuntimeConfig()
const host = config.SNMP_HOST
const community = config.SNMP_COMMUNITY
const session = snmp.createSession(host, community)

const inOid = '1.3.6.1.2.1.2.2.1.10.5'
const outOid = '1.3.6.1.2.1.2.2.1.16.5'

let prevIn = 0
let prevOut = 0
let firstRun = true

async function getData() {
  return new Promise<{ inBytes: number, outBytes: number }>((resolve, reject) => {
    session.get([inOid, outOid], (error, varbinds) => {
      if (error) return reject(error)
      if (!varbinds) return reject(new Error('No varbinds'))
      resolve({
        inBytes: Number(varbinds[0].value),
        outBytes: Number(varbinds[1].value)
      })
    })
  })
}

export async function getBandwidth() {
  const { inBytes, outBytes } = await getData()
  if (firstRun) {
    prevIn = inBytes
    prevOut = outBytes
    firstRun = false
    return { inMbps: 0, outMbps: 0 }
  }

  const diffIn = inBytes - prevIn
  const diffOut = outBytes - prevOut
  prevIn = inBytes
  prevOut = outBytes
  if (diffIn < 0 || diffOut < 0) return { inMbps: 0, outMbps: 0 }
  const inMbps = diffIn / 1048576
  const outMbps = diffOut / 1048576

  return { inMbps, outMbps }
}
