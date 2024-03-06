export const getDaysAgo = (dateString: string): number => {
  const date = new Date(dateString)
  const currentDate = new Date()
  const timeDiff = currentDate.getTime() - date.getTime()
  const daysAgo = Math.floor(timeDiff / (1000 * 3600 * 24))
  return daysAgo
}

export const getUnixTimestampAndNextDay = (dateStringOrTimestamp: string | number): [number, number] => {
  let timestamp: number
  if (typeof dateStringOrTimestamp === 'string') {
    timestamp = Math.floor(new Date(dateStringOrTimestamp).getTime() / 1000)
  } else {
    timestamp = dateStringOrTimestamp
  }
  const nextDayTimestamp = timestamp + 24 * 3600 // Add 24 hours in seconds
  return [timestamp, nextDayTimestamp]
}
