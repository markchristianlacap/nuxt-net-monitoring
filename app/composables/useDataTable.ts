/**
 * Common data table functionality for pages with date filtering and CSV download
 */
export function useDataTable(apiEndpoint: string, csvFilename: string) {
  const route = useRoute()
  const router = useRouter()

  // Initialize dates
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const endOfToday = today.toISOString()

  // Create reactive query object that can be extended
  const query = reactive<Record<string, any>>({
    page: Number(route.query.page) || 1,
    limit: Number(route.query.limit) || 25,
    start: route.query.start as string || '',
    end: route.query.end as string || endOfToday,
  })

  // CSV download state
  const isDownloading = ref(false)
  let downloadTimeout: NodeJS.Timeout | null = null

  // Watch for query changes and update URL
  watch(query, (newQuery) => {
    const queryParams = { ...newQuery }
    // Remove empty values
    Object.keys(queryParams).forEach((key) => {
      if (!queryParams[key as keyof typeof queryParams]) {
        delete queryParams[key as keyof typeof queryParams]
      }
    })
    router.push({ query: queryParams })
  })

  /**
   * Download CSV with current filters applied
   * Debounced to prevent multiple simultaneous downloads
   */
  function downloadCSV() {
    // Prevent multiple downloads
    if (isDownloading.value)
      return

    // Clear any existing timeout
    if (downloadTimeout) {
      clearTimeout(downloadTimeout)
    }

    // Set loading state
    isDownloading.value = true

    // Debounce the actual download
    downloadTimeout = setTimeout(() => {
      try {
        let url = `/api/${apiEndpoint}/download`
        const params = []
        if (query.start)
          params.push(`start=${query.start}`)
        if (query.end)
          params.push(`end=${query.end}`)
        if (params.length)
          url += `?${params.join('&')}`

        const a = document.createElement('a')
        a.href = url
        a.download = csvFilename
        a.click()

        // Clean up the element
        a.remove()
      }
      catch (error) {
        console.error('CSV download failed:', error)
      }
      finally {
        // Reset loading state after a delay to prevent rapid re-clicks
        setTimeout(() => {
          isDownloading.value = false
        }, 2000)
      }
    }, 300) // 300ms debounce delay
  }

  return {
    query,
    downloadCSV,
    isDownloading: readonly(isDownloading),
    endOfToday,
  }
}
