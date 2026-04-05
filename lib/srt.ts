export function convertLiveTranscriptsToSRT(transcripts: { original: string; translated: string; timestamp: number }[]): string {
  if (!transcripts || transcripts.length === 0) return "";

  let srtStr = "";

  for (let i = 0; i < transcripts.length; i++) {
    const current = transcripts[i];
    const startTimeMs = current.timestamp - transcripts[0].timestamp;
    
    let endTimeMs = startTimeMs + 3000;
    if (i < transcripts.length - 1) {
       endTimeMs = transcripts[i + 1].timestamp - transcripts[0].timestamp;
       if (endTimeMs - startTimeMs > 5000) {
          endTimeMs = startTimeMs + 5000;
       }
    }

    srtStr += `${i + 1}\n`;
    srtStr += `${formatSrtTime(startTimeMs)} --> ${formatSrtTime(endTimeMs)}\n`;
    srtStr += `${current.translated}\n\n`;
  }

  return srtStr;
}

export function convertUtterancesToSRT(utterances: { start: number; end: number; translated: string }[]): string {
  if (!utterances || utterances.length === 0) return "";
  let srtStr = "";
  for (let i = 0; i < utterances.length; i++) {
    const u = utterances[i];
    srtStr += `${i + 1}\n`;
    srtStr += `${formatSrtTime(u.start * 1000)} --> ${formatSrtTime(u.end * 1000)}\n`;
    srtStr += `${u.translated}\n\n`;
  }
  return srtStr;
}

function formatSrtTime(ms: number): string {
  const date = new Date(ms);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds},${milliseconds}`;
}
