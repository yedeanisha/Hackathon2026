// Reads meeting transcripts and splits them into speaker turns.
//
// Supported sources:
//   - Microsoft Teams: "Download transcript" as .docx or .vtt
//   - Zoom / Google Meet: .vtt or .txt exports
//   - Anything pasted as text, in "Name: what they said" form
//
// No extra libraries: .docx files are zip archives, and the browser's built-in
// DecompressionStream is enough to read the text out of them.

export const TRANSCRIPT_FILE_TYPES = '.docx,.vtt,.txt';

/** Returns the plain text of a transcript file. */
export async function readTranscriptFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) return readDocxText(file);
  if (name.endsWith('.vtt') || name.endsWith('.txt')) return file.text();
  throw new Error('Please upload a .docx, .vtt or .txt transcript.');
}

/**
 * Splits transcript text into turns: [{ speaker, text, seconds }].
 * `seconds` is the start time when the transcript has timestamps, otherwise null.
 */
export function parseTranscript(text) {
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim());
  const turns = [];
  let pendingSpeaker = null;
  let pendingSeconds = null;

  const add = (speaker, words, seconds) => {
    const clean = words.replace(/<[^>]+>/g, '').trim();
    if (!clean) return;
    const last = turns[turns.length - 1];
    if (last && last.speaker === speaker) last.text += ` ${clean}`; // join lines from the same speaker
    else turns.push({ speaker, text: clean, seconds });
  };

  const isCueTiming = (line = '') => /^(\d{1,2}:)?\d{1,2}:\d{2}(\.\d+)?\s*-->/.test(line);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line === 'WEBVTT' || /^NOTE\b/.test(line)) continue;
    if (isCueTiming(lines[i + 1])) continue; // VTT cue id, e.g. "12" or "a1b2c3-0"

    // VTT cue timing, e.g. "00:01:02.500 --> 00:01:05.000"
    if (isCueTiming(line)) { pendingSeconds = toSeconds(line.split('-->')[0]); continue; }

    // Teams VTT voice tag: "<v Rahul Mehta>Hello there</v>"
    const voice = line.match(/^<v\s+([^>]+)>(.*?)(<\/v>)?$/);
    if (voice) { add(voice[1].trim(), voice[2], pendingSeconds); continue; }

    // Teams .docx header line: "Rahul Mehta   0:03" (speaker, then time); the words follow on the next line
    const header = line.match(/^(.{2,60}?)\s{2,}((\d{1,2}:)?\d{1,2}:\d{2})$/);
    if (header) { pendingSpeaker = header[1].trim(); pendingSeconds = toSeconds(header[2]); continue; }

    // "Name: what they said"
    const named = line.match(/^([A-Z][\w .'-]{1,40}):\s+(.+)$/);
    if (named) { add(named[1].trim(), named[2], pendingSeconds); continue; }

    // A plain line belongs to the last speaker we saw
    if (pendingSpeaker) add(pendingSpeaker, line, pendingSeconds);
    else if (turns.length) turns[turns.length - 1].text += ` ${line}`;
  }
  return turns;
}

/** "1:02:03", "02:03" or "00:02:03.500" → seconds */
function toSeconds(stamp) {
  const parts = stamp.trim().split(':').map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

// ---------------------------------------------------------------------------
// .docx reading: find word/document.xml inside the zip and keep its text,
// one paragraph per line.
// ---------------------------------------------------------------------------
async function readDocxText(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const xml = await readZipEntry(bytes, 'word/document.xml');
  if (!xml) throw new Error('This Word file has no readable text.');
  return xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab\/>/g, '   ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

async function readZipEntry(bytes, wantedName) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The "end of central directory" record sits in the last 64 KB of the file.
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error('This file is not a valid Word document.');

  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();

  for (let n = 0; n < count; n++) {
    const method = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const localHeader = view.getUint32(pos + 42, true);
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLength));

    if (name === wantedName) {
      const dataStart = localHeader + 30 + view.getUint16(localHeader + 26, true) + view.getUint16(localHeader + 28, true);
      const data = bytes.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return decoder.decode(data); // stored, not compressed
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Response(stream).text();
    }
    pos += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}
