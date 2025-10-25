export async function getSpeedtestServers() {
  const servers = await $fetch<{ id: string, sponsor: string }[]>('https://www.speedtest.net/api/js/servers')
  return servers
}
