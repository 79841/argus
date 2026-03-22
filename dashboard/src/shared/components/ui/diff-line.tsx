export const DiffLine = ({ line }: { line: string }) => {
  if (line.startsWith('+') && !line.startsWith('+++')) {
    return <div className="bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300">{line}</div>
  }
  if (line.startsWith('-') && !line.startsWith('---')) {
    return <div className="bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300">{line}</div>
  }
  if (line.startsWith('@@')) {
    return <div className="text-blue-600 dark:text-blue-400">{line}</div>
  }
  return <div>{line}</div>
}
