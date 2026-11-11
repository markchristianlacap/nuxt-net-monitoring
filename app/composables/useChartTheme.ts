interface ChartTheme {
  text: string
  textMuted: string
  textToned: string
  backgroundElevated: string
  border: string
  borderMuted: string
}

const darkChartTheme: ChartTheme = {
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textToned: '#cbd5e1',
  backgroundElevated: '#1e293b',
  border: '#475569',
  borderMuted: '#334155',
}

const lightChartTheme: ChartTheme = {
  text: '#0f172a',
  textMuted: '#475569',
  textToned: '#334155',
  backgroundElevated: '#f1f5f9',
  border: '#cbd5e1',
  borderMuted: '#e2e8f0',
}

const cssVariables: Record<keyof ChartTheme, string> = {
  text: '--ui-text',
  textMuted: '--ui-text-muted',
  textToned: '--ui-text-toned',
  backgroundElevated: '--ui-bg-elevated',
  border: '--ui-border-accented',
  borderMuted: '--ui-border-muted',
}

export function useChartTheme() {
  const colorMode = useColorMode()
  const initialTheme = colorMode.value === 'light'
    ? lightChartTheme
    : darkChartTheme
  const theme = ref<ChartTheme>(initialTheme)

  function updateTheme() {
    if (!import.meta.client)
      return

    const styles = getComputedStyle(document.documentElement)
    const fallback = colorMode.value === 'light'
      ? lightChartTheme
      : darkChartTheme
    const readColor = (key: keyof ChartTheme) =>
      styles.getPropertyValue(cssVariables[key]).trim() || fallback[key]

    theme.value = {
      text: readColor('text'),
      textMuted: readColor('textMuted'),
      textToned: readColor('textToned'),
      backgroundElevated: readColor('backgroundElevated'),
      border: readColor('border'),
      borderMuted: readColor('borderMuted'),
    }
  }

  onMounted(updateTheme)
  watch(() => colorMode.value, async () => {
    await nextTick()
    updateTheme()
  }, { flush: 'post' })

  return theme
}
