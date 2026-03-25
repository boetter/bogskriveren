/**
 * Reads SSE events from a fetch Response and calls onEvent for each parsed event.
 * Returns when the stream ends.
 */
export async function readSSE(
  response: Response,
  onEvent: (data: any) => void
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Parse SSE events from buffer
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          onEvent(data)
        } catch {
          // ignore parse errors
        }
      }
    }
  }

  // Process any remaining data in buffer
  if (buffer.startsWith('data: ')) {
    try {
      const data = JSON.parse(buffer.slice(6))
      onEvent(data)
    } catch {
      // ignore
    }
  }
}
