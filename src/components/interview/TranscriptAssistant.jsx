// Interview transcript panel (interviewers only).
// The interviewer uploads the meeting transcript from Teams, Zoom or Google Meet, or pastes it.
// AI reads it and suggests a rating per criterion with quotes as evidence; the interviewer
// can then copy the draft into the feedback form and edit it before submitting.
import { useRef, useState } from 'react';
import { LuUpload, LuClipboardPaste, LuFileText, LuX, LuSparkles, LuArrowDown } from 'react-icons/lu';
import { AIPanel, Button, Field, Select, Textarea, RatingInput, useToast } from '../ui';
import { readTranscriptFile, parseTranscript, TRANSCRIPT_FILE_TYPES } from '../../services/transcript';
import { analyseTranscript, guessCandidateSpeaker } from '../../services/ai';

export default function TranscriptAssistant({ project, candidate, interviewerName, onUse }) {
  const toast = useToast();
  const fileInput = useRef(null);

  const [source, setSource] = useState(''); // file name, or "Pasted transcript"
  const [turns, setTurns] = useState([]);
  const [candidateSpeaker, setCandidateSpeaker] = useState('');
  const [pasting, setPasting] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const speakers = [...new Set(turns.map((t) => t.speaker))];
  const lastSeconds = turns[turns.length - 1]?.seconds;
  const minutes = lastSeconds != null ? Math.max(1, Math.round(lastSeconds / 60)) : null;

  const load = (text, name) => {
    const parsed = parseTranscript(text);
    if (new Set(parsed.map((t) => t.speaker)).size < 2) {
      setError('Couldn’t find two speakers. Use the transcript download from Teams, Zoom or Meet, or paste it as “Name: what they said” lines.');
      return;
    }
    setError('');
    setTurns(parsed);
    setSource(name);
    setCandidateSpeaker(guessCandidateSpeaker(parsed, candidate.name, interviewerName));
    setResult(null);
    setPasting(false);
  };

  const onFile = async (file) => {
    if (!file) return;
    try {
      load(await readTranscriptFile(file), file.name);
    } catch (e) {
      setError(e.message);
    }
    fileInput.current.value = '';
  };

  const clear = () => {
    setTurns([]);
    setSource('');
    setResult(null);
    setError('');
  };

  const analyse = async () => {
    setLoading(true);
    try {
      setResult(await analyseTranscript({ turns, candidateSpeaker, criteria: project.criteria, requiredSkills: project.requiredSkills }));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const useInForm = () => {
    onUse(result);
    toast('Added to your feedback below. Review and edit before submitting.');
  };

  return (
    <AIPanel title="Interview transcript">
      {!turns.length && (
        <>
          <p className="text-sm text-slate-600">
            Upload the transcript from Teams, Zoom or Google Meet (.docx, .vtt or .txt). AI suggests ratings with quotes from the conversation.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="ai" icon={LuUpload} onClick={() => fileInput.current.click()}>Upload transcript</Button>
            <Button size="sm" variant="secondary" icon={LuClipboardPaste} onClick={() => setPasting((p) => !p)}>Paste text</Button>
            <input ref={fileInput} type="file" accept={TRANSCRIPT_FILE_TYPES} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {pasting && (
            <div className="mt-3 space-y-2">
              <Textarea
                id="transcript-text"
                rows={6}
                className="bg-white font-mono text-xs"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={'Sarah Thomas: Walk me through your last project.\nVikram Patel: I led the migration to microservices…'}
              />
              <Button size="sm" variant="secondary" disabled={!pastedText.trim()} onClick={() => load(pastedText, 'Pasted transcript')}>Read transcript</Button>
            </div>
          )}
        </>
      )}

      {turns.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-sm">
            <LuFileText className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{source}</span>
            <span className="text-xs text-slate-500">
              {turns.length} turns · {speakers.length} speakers{minutes ? ` · ${minutes} min` : ''}
            </span>
            <button type="button" onClick={clear} aria-label="Remove transcript" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <LuX className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Field label="Who is the candidate in this transcript?" className="min-w-52 flex-1">
              <Select id="candidate-speaker" value={candidateSpeaker} onChange={(e) => { setCandidateSpeaker(e.target.value); setResult(null); }}>
                {speakers.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Button variant="ai" icon={LuSparkles} loading={loading} onClick={analyse}>{result ? 'Analyse again' : 'Analyse with AI'}</Button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {result && (
        <div className="mt-4 space-y-4 border-t border-violet-200 pt-4 text-sm">
          <p className="text-slate-700">{result.summary}</p>

          <ul className="space-y-3">
            {project.criteria.map((c) => (
              <li key={c.name}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <RatingInput value={result.ratings[c.name]} readOnly size="sm" />
                </div>
                {result.evidence[c.name].map((quote) => (
                  <p key={quote} className="mt-1 border-l-2 border-violet-200 pl-2 text-xs italic text-slate-500">“{quote}”</p>
                ))}
              </li>
            ))}
          </ul>

          <div>
            <p className="font-medium text-slate-800">Concerns</p>
            <p className="mt-1 whitespace-pre-line text-slate-600">{result.concerns}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-600">Suggested recommendation: <strong className="text-slate-900">{result.decision}</strong></span>
            <Button size="sm" icon={LuArrowDown} onClick={useInForm}>Use in feedback form</Button>
          </div>
        </div>
      )}
    </AIPanel>
  );
}
