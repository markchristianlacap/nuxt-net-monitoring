import speedTest from 'speedtest-net'

export default defineNitroPlugin(async () => {
  return
  const availableServers = await getSpeedtestServers()
  availableServers.forEach((server) => {
    speedTest({ serverId: server.id }).then((result) => {
      console.log(result.download)
    }).catch((e) => {
      console.error(`Server ID: ${server.id}`)
      console.error(`Server: ${server.sponsor}`)
      console.error(`Message: ${e.message}`)
    })
  })
})
